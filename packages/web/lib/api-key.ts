import { randomBytes } from "node:crypto";

// Customer-facing API keys. These are what end users paste into their MCP
// client config (Claude Desktop, Cursor, etc.). Prefix makes them
// human-recognisable; the random suffix is 192 bits of entropy.

export function generateCustomerApiKey(): string {
  return `mcpay_live_${randomBytes(24).toString("base64url")}`;
}
