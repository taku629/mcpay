from __future__ import annotations

from datetime import datetime, timezone
from typing import Awaitable, Callable, TypeVar

from .client import MCPayClient
from .meter import generate_request_id, price_call
from .types import MCPayConfig, ToolInvocation, UsageEvent

T = TypeVar("T")


class MCPayError(Exception):
    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code


def create_mcpay_middleware(
    config: MCPayConfig,
) -> Callable[[ToolInvocation, Callable[[], Awaitable[T]]], Awaitable[T]]:
    """Build a middleware that wraps an async tool handler with auth + metering.

    Usage:

        mcpay = create_mcpay_middleware(MCPayConfig(...))

        async def handle(tool_name, api_key, args):
            return await mcpay(
                ToolInvocation(tool_name=tool_name, api_key=api_key),
                lambda: your_real_handler(args),
            )
    """
    client = MCPayClient(config)

    async def middleware(invocation: ToolInvocation, next_fn: Callable[[], Awaitable[T]]) -> T:
        pricing = config.pricing.get(invocation.tool_name)
        is_paid = pricing is not None and pricing.type != "free"

        if is_paid:
            if not invocation.api_key:
                raise MCPayError(
                    f'Tool "{invocation.tool_name}" requires an MCPay API key.',
                    "missing_api_key",
                )

            verification = await client.verify_api_key(invocation.api_key)
            if not verification.ok:
                raise MCPayError(
                    f"MCPay key rejected: {verification.reason or 'unknown'}",
                    "invalid_api_key",
                )

            amount = price_call(pricing, invocation.tokens)
            if (
                verification.remaining_budget_usd is not None
                and amount > verification.remaining_budget_usd
            ):
                raise MCPayError(
                    f"Customer budget exceeded "
                    f"(need ${amount:.4f}, have ${verification.remaining_budget_usd:.4f})",
                    "budget_exceeded",
                )

        result = await next_fn()

        if pricing is not None:
            amount = price_call(pricing, invocation.tokens)
            if amount > 0 and invocation.api_key:
                await client.record_usage(
                    UsageEvent(
                        project_id=config.project_id,
                        api_key=invocation.api_key,
                        tool_name=invocation.tool_name,
                        amount_usd=amount,
                        tokens=invocation.tokens,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        request_id=generate_request_id(),
                    )
                )

        return result

    return middleware
