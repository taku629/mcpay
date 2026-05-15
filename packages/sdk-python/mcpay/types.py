from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional, Union


@dataclass(frozen=True)
class FreePricing:
    type: Literal["free"] = "free"


@dataclass(frozen=True)
class PerCallPricing:
    amount_usd: float
    type: Literal["per_call"] = "per_call"


@dataclass(frozen=True)
class PerTokenPricing:
    amount_usd_per_1k: float
    type: Literal["per_token"] = "per_token"


@dataclass(frozen=True)
class MonthlyUnlimitedPricing:
    amount_usd_per_month: float
    type: Literal["monthly_unlimited"] = "monthly_unlimited"


ToolPricing = Union[
    FreePricing,
    PerCallPricing,
    PerTokenPricing,
    MonthlyUnlimitedPricing,
]


@dataclass
class MCPayConfig:
    project_id: str
    api_secret: str
    pricing: dict[str, ToolPricing] = field(default_factory=dict)
    endpoint: str = "https://api.mcpay.dev"
    fail_open: bool = False


@dataclass
class ToolInvocation:
    tool_name: str
    api_key: Optional[str] = None
    tokens: Optional[int] = None


@dataclass
class VerifyKeyResult:
    ok: bool
    customer_id: Optional[str] = None
    remaining_budget_usd: Optional[float] = None
    reason: Optional[str] = None


@dataclass
class UsageEvent:
    project_id: str
    api_key: str
    tool_name: str
    amount_usd: float
    timestamp: str
    request_id: str
    tokens: Optional[int] = None
