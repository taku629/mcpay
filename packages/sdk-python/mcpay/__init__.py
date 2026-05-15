"""MCPay Python SDK.

Wire-compatible with @mcpay/sdk (TypeScript). Same /v1/verify + /v1/usage
endpoints, same pricing-rule shapes.
"""

from .client import MCPayClient
from .meter import price_call
from .middleware import MCPayError, create_mcpay_middleware
from .types import (
    MCPayConfig,
    ToolInvocation,
    ToolPricing,
    UsageEvent,
    VerifyKeyResult,
)

__all__ = [
    "MCPayClient",
    "MCPayConfig",
    "MCPayError",
    "ToolInvocation",
    "ToolPricing",
    "UsageEvent",
    "VerifyKeyResult",
    "create_mcpay_middleware",
    "price_call",
]

__version__ = "0.1.0"
