import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MCPay — monetize your MCP server in 3 lines";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a0f3d 100%)",
          color: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          fontFamily: "system-ui",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#7c5cff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            $
          </div>
          <div style={{ fontSize: 36, fontWeight: 600 }}>MCPay</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Monetize your MCP
            <br />
            server in <span style={{ color: "#7c5cff" }}>3 lines</span>.
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa", maxWidth: 900 }}>
            Stripe-backed billing, metering, and dashboards for Model Context Protocol authors.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#71717a",
            fontSize: 22,
          }}
        >
          <div>github.com/taku629/mcpay</div>
          <div>0% fee under $1k/mo · 10% standard</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
