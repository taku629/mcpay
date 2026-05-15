from __future__ import annotations

import secrets
import time
from typing import Optional

from .types import (
    FreePricing,
    MonthlyUnlimitedPricing,
    PerCallPricing,
    PerTokenPricing,
    ToolPricing,
)


def price_call(pricing: Optional[ToolPricing], tokens: Optional[int] = None) -> float:
    if pricing is None:
        return 0.0
    if isinstance(pricing, FreePricing):
        return 0.0
    if isinstance(pricing, PerCallPricing):
        return pricing.amount_usd
    if isinstance(pricing, PerTokenPricing):
        if not tokens or tokens <= 0:
            return 0.0
        return (tokens / 1000) * pricing.amount_usd_per_1k
    if isinstance(pricing, MonthlyUnlimitedPricing):
        return 0.0
    raise TypeError(f"unknown pricing type: {pricing!r}")


def generate_request_id() -> str:
    return f"req_{int(time.time() * 1000):x}{secrets.token_hex(4)}"
