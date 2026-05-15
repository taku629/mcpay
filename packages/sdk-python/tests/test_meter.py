from mcpay.meter import generate_request_id, price_call
from mcpay.types import (
    FreePricing,
    MonthlyUnlimitedPricing,
    PerCallPricing,
    PerTokenPricing,
)


def test_free_returns_zero():
    assert price_call(FreePricing()) == 0


def test_per_call_returns_flat_amount():
    assert price_call(PerCallPricing(amount_usd=0.05)) == 0.05


def test_per_token_scales_with_tokens():
    assert price_call(PerTokenPricing(amount_usd_per_1k=2), tokens=500) == 1
    assert price_call(PerTokenPricing(amount_usd_per_1k=2), tokens=0) == 0
    assert price_call(PerTokenPricing(amount_usd_per_1k=2)) == 0


def test_monthly_unlimited_returns_zero_per_call():
    assert price_call(MonthlyUnlimitedPricing(amount_usd_per_month=10)) == 0


def test_missing_pricing_returns_zero():
    assert price_call(None) == 0


def test_request_id_unique_and_prefixed():
    a = generate_request_id()
    b = generate_request_id()
    assert a.startswith("req_")
    assert a != b
