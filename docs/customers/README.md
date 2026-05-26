# Customer conversations — first 50

> Goal: **50 conversations with MCP server authors before scaling features.**
> Per the focus doc (`memory/project_focus_mcpay_global.md`), customer
> conversations beat feature additions. Until this hits 50, no new SDK
> features unless they unblock a paying author.

## Tracker

| # | Date | Author | MCP project | Channel | Status | Notes |
|---|------|--------|-------------|---------|--------|-------|
| 1 |      |        |             |         |        |       |

Status values:
- `cold` — identified, not contacted
- `dm-sent` — outreach sent, no reply
- `replied` — they answered, conversation in progress
- `call` — 20+ min call done
- `design-partner` — agreed to integrate MCPay pre-launch
- `paying` — first Stripe charge cleared
- `dead` — explicit no / unreachable after 3 follow-ups

## Per-conversation file

For every author who replies, copy `_template.md` to `NNN-handle.md` (e.g.
`007-acmecorp.md`) and fill it in. Append a line to the tracker above.

## Weekly review (every Monday)

- Conversations this week / cumulative
- New design partners / new paying
- Top 3 objections heard (verbatim)
- One feature request that would unblock a paying author (if any)
- Update `STATUS.md` "次の3手" if the data demands it

## Conversion targets

| Stage | Target | Rationale |
|---|---|---|
| Cold → dm-sent | 100% of Tier-A list (see `docs/launch/outreach.md`) | Volume |
| dm-sent → replied | ≥ 30% | If <30%, rewrite cold DM template |
| replied → call | ≥ 50% | If <50%, the pitch is buried in the DM |
| call → design-partner | ≥ 20% | First-10 white-glove integration |
| design-partner → paying | ≥ 60% | If <60%, the product doesn't ship value |

## What to ask on every call

1. Show me the MCP server you'd want to charge for. (Screen-share.)
2. What's the most common question your free users ask you?
3. If you charged today, what would you charge — per call, monthly, or both?
4. What stopped you from putting Stripe on it yourself?
5. If MCPay disappeared tomorrow, what would you use?
6. Would you pay me $X/mo to use it? *(probe — start at 10% take-rate equivalent)*

Record audio (with permission) and timestamp objections. Patterns across 10
calls beat any individual call's opinion.
