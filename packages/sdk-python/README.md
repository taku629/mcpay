# mcpay (Python)

Python SDK for monetizing Model Context Protocol (MCP) servers via
[MCPay](https://github.com/taku629/mcpay). Wire-compatible with `@mcpay/sdk`
(TypeScript).

## Install

```bash
pip install mcpay
```

## Usage

```python
import asyncio
from mcpay import (
    MCPayConfig,
    ToolInvocation,
    create_mcpay_middleware,
)
from mcpay.types import FreePricing, PerCallPricing, PerTokenPricing

mcpay = create_mcpay_middleware(
    MCPayConfig(
        project_id="prj_demo",
        api_secret="sk_test_demo_only_do_not_use_in_prod",
        endpoint="http://localhost:3000",
        pricing={
            "search_web": PerCallPricing(amount_usd=0.01),
            "summarize":  PerTokenPricing(amount_usd_per_1k=0.002),
            "ping":       FreePricing(),
        },
    )
)

async def handle_tool_call(tool_name: str, api_key: str | None, args: dict):
    async def run():
        # your real implementation here
        return {"ok": True}

    return await mcpay(
        ToolInvocation(tool_name=tool_name, api_key=api_key),
        run,
    )

asyncio.run(handle_tool_call("ping", None, {}))
```

## Pricing model shapes

```python
from mcpay.types import (
    FreePricing,
    PerCallPricing,
    PerTokenPricing,
    MonthlyUnlimitedPricing,
)
```

Pass any of these as values in `MCPayConfig.pricing`.

## Dev

```bash
pip install -e ".[dev]"
pytest
```

## License

MIT
