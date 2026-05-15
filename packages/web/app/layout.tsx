import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCPay — Monetize your MCP server in 3 lines",
  description:
    "Drop-in Stripe-backed billing, metering, and analytics for Model Context Protocol servers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
