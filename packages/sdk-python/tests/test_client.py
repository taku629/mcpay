"""Cross-SDK reliability contract tests; all traffic uses MockTransport."""
import httpx

from mcpay.client import MCPayClient
from mcpay.types import MCPayConfig


async def test_malformed_verify_response_fails_closed():
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"ok": "yes"}))
    async with httpx.AsyncClient(transport=transport) as http:
        client = MCPayClient(MCPayConfig(project_id="p", api_secret="s", max_retries=0), httpx_client=http)
        result = await client.verify_api_key("k")
        assert result.ok is False
        assert "malformed" in (result.reason or "")


async def test_transient_verify_failure_is_retried():
    calls = 0
    def handler(request):
        nonlocal calls
        calls += 1
        return httpx.Response(503) if calls == 1 else httpx.Response(200, json={"ok": True})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        client = MCPayClient(MCPayConfig(project_id="p", api_secret="s", max_retries=1), httpx_client=http)
        assert (await client.verify_api_key("k")).ok is True
        assert calls == 2
