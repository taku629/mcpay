from __future__ import annotations

import time
from typing import Optional

import httpx

from .types import MCPayConfig, UsageEvent, VerifyKeyResult


class MCPayClient:
    """HTTP client for the MCPay control plane.

    Owns a long-lived httpx.AsyncClient. Call ``aclose()`` (or use as async
    context manager) when you're done.
    """

    def __init__(self, config: MCPayConfig, *, httpx_client: Optional[httpx.AsyncClient] = None):
        self._config = config
        self._http = httpx_client or httpx.AsyncClient(timeout=httpx.Timeout(5.0))
        self._owns_client = httpx_client is None
        self._verify_cache: dict[str, tuple[VerifyKeyResult, float]] = {}

    async def __aenter__(self) -> "MCPayClient":
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if self._owns_client:
            await self._http.aclose()

    def _headers(self) -> dict[str, str]:
        return {
            "content-type": "application/json",
            "authorization": f"Bearer {self._config.api_secret}",
            "x-mcpay-project": self._config.project_id,
        }

    async def verify_api_key(self, api_key: str) -> VerifyKeyResult:
        cached = self._verify_cache.get(api_key)
        if cached and cached[1] > time.monotonic():
            return cached[0]

        try:
            res = await self._http.post(
                f"{self._config.endpoint}/v1/verify",
                headers=self._headers(),
                json={"projectId": self._config.project_id, "apiKey": api_key},
            )
        except httpx.HTTPError as e:
            return self._handle_failure(f"network: {e}")

        if res.status_code != 200:
            return self._handle_failure(f"verify HTTP {res.status_code}")

        data = res.json()
        result = VerifyKeyResult(
            ok=bool(data.get("ok")),
            customer_id=data.get("customerId"),
            remaining_budget_usd=data.get("remainingBudgetUsd"),
            reason=data.get("reason"),
        )
        self._verify_cache[api_key] = (result, time.monotonic() + 60)
        return result

    async def record_usage(self, event: UsageEvent) -> None:
        try:
            await self._http.post(
                f"{self._config.endpoint}/v1/usage",
                headers=self._headers(),
                json={
                    "projectId": event.project_id,
                    "apiKey": event.api_key,
                    "toolName": event.tool_name,
                    "amountUsd": event.amount_usd,
                    "tokens": event.tokens,
                    "timestamp": event.timestamp,
                    "requestId": event.request_id,
                },
            )
        except httpx.HTTPError:
            # metering is fire-and-forget; failures must not block tool execution
            pass

    def _handle_failure(self, reason: str) -> VerifyKeyResult:
        if self._config.fail_open:
            return VerifyKeyResult(ok=True, reason=f"fail-open: {reason}")
        return VerifyKeyResult(ok=False, reason=reason)
