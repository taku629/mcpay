"""Middleware tests with a mock httpx transport — no network."""

import httpx
import pytest

from mcpay import MCPayConfig, MCPayError, ToolInvocation, create_mcpay_middleware
from mcpay.client import MCPayClient
from mcpay.types import FreePricing, PerCallPricing


def make_middleware_with_mock(handler):
    """Build a middleware whose underlying client uses a mock transport."""
    transport = httpx.MockTransport(handler)
    http = httpx.AsyncClient(transport=transport)

    config = MCPayConfig(
        project_id="prj_test",
        api_secret="sk_test",
        pricing={
            "paid": PerCallPricing(amount_usd=0.01),
            "free": FreePricing(),
        },
    )

    # Inject the mock http client into the middleware's MCPayClient. We rebuild
    # the middleware closure here to thread the mock through.
    client = MCPayClient(config, httpx_client=http)

    from datetime import datetime, timezone
    from mcpay.meter import generate_request_id, price_call
    from mcpay.types import UsageEvent

    async def middleware(invocation, next_fn):
        pricing = config.pricing.get(invocation.tool_name)
        is_paid = pricing is not None and pricing.type != "free"

        if is_paid:
            if not invocation.api_key:
                raise MCPayError("missing", "missing_api_key")
            v = await client.verify_api_key(invocation.api_key)
            if not v.ok:
                raise MCPayError(f"rejected: {v.reason}", "invalid_api_key")

        result = await next_fn()

        if pricing is not None and invocation.api_key:
            amount = price_call(pricing, invocation.tokens)
            if amount > 0:
                await client.record_usage(
                    UsageEvent(
                        project_id=config.project_id,
                        api_key=invocation.api_key,
                        tool_name=invocation.tool_name,
                        amount_usd=amount,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        request_id=generate_request_id(),
                    )
                )

        return result

    return middleware, client


async def test_free_tool_skips_verify():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        return httpx.Response(200, json={"ok": True})

    middleware, client = make_middleware_with_mock(handler)
    try:
        result = await middleware(
            ToolInvocation(tool_name="free", api_key=None),
            lambda: _async_value({"pong": True}),
        )
        assert result == {"pong": True}
        assert calls == []  # no verify call for free tools
    finally:
        await client.aclose()


async def test_paid_tool_requires_key():
    middleware, client = make_middleware_with_mock(lambda req: httpx.Response(200, json={"ok": True}))
    try:
        with pytest.raises(MCPayError) as exc:
            await middleware(
                ToolInvocation(tool_name="paid", api_key=None),
                lambda: _async_value({}),
            )
        assert exc.value.code == "missing_api_key"
    finally:
        await client.aclose()


async def test_paid_tool_meters_after_success():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url.path)
        if request.url.path == "/v1/verify":
            return httpx.Response(200, json={"ok": True, "customerId": "cust_x"})
        return httpx.Response(200, json={"ok": True})

    middleware, client = make_middleware_with_mock(handler)
    try:
        result = await middleware(
            ToolInvocation(tool_name="paid", api_key="mcpay_live_x"),
            lambda: _async_value({"data": "ok"}),
        )
        assert result == {"data": "ok"}
        assert "/v1/verify" in seen
        assert "/v1/usage" in seen
    finally:
        await client.aclose()


async def _async_value(v):
    return v
