# Design — HookScope Agent Gateway UX

> Companion to `PRD.md`. Describes the product's UX architecture, information architecture, and design language.
> Grounds itself in the **unified shell** work already shipped: `apps/web/components/layout/app-shell.tsx`, `dashboard-sidebar.tsx`, `ShellHeader`, `CommandPalette`, `MobileNav`.

---

## 1. Design principles

1. **Five minutes to first delivery.** Every screen assumes a developer who has never seen HookScope. Onboarding must end with a live webhook, not a blank dashboard.
2. **Events are the product.** The event timeline is the home screen. Not charts, not settings — events.
3. **Failure is a first-class state.** A failed/dead-lettered event should be visually impossible to ignore and one click from a fix (replay).
4. **Agent-shaped, not website-shaped.** Deliverables are called "destinations," "targets," "queues" — speak the language of an agent runtime, not a CMS.

## 2. Visual language (established baseline)

Reuse the existing design system from the shell refactor:

- **Tokens:** shadcn/ui on Tailwind. Cards/panels `rounded-xl` (standardized from `rounded-2xl`).
- **Type:** `SectionLabel` for eyebrow labels, `PageHeader` for page titles + actions, `EmptyState` for empty screens (all in `apps/web/components/layout/`).
- **Layout:** single unified `AppShell` — fixed left sidebar (workspace + dashboard context), breadcrumb `ShellHeader` with ⌘K command palette, mobile drawer nav.
- **Motion:** restrained — 150–200ms ease-out for panels; no decorative animation on data screens.

## 3. Information architecture

```
HookScope (AppShell)
├── Home (project overview)        /dashboard/[projectId]
│   ├── Live event timeline        (auto-refresh, latest first)
│   ├── Delivery health summary    (success %, dead letters, silence)
│   └── Endpoint status chips
├── Events                         /dashboard/[projectId]/events
│   ├── Search + filters           (status, source, eventType, endpoint, range)
│   ├── Event detail drawer        (payload preview, signature, source IP)
│   └── Event detail page          /events/[id]
│       ├── Timeline (EventLog)    ── deliveries, retries, verification
│       ├── Delivery attempts      ── status, code, latency, body preview
│       └── Actions                ── Retry, Replay, Delete
├── Deliveries                     /dashboard/[projectId]/deliveries
├── Alerts                         /dashboard/[projectId]/alerts
├── Settings                       /dashboard/[projectId]/settings
│   ├── Endpoints (intake URLs)    ── create/manage per provider
│   ├── Destinations               ── (P2) agent targets: HTTP/SQS/Kafka
│   ├── Signing secrets            ── per provider
│   └── Danger zone                ── delete project
├── Projects                       /projects   (workspace switcher)
├── Billing                        /settings/billing
└── Command palette (⌘K)           global: jump to project/endpoint/page
```

The `dashboard-sidebar.tsx` already implements the **contextual zone swap**: at workspace level it shows projects; inside a project it swaps to ProjectSwitcher + EndpointSwitcher + EndpointNav (endpoint-scoped views). Keep this pattern.

## 4. Key screens (P1)

### 4.1 Onboarding (new user)
Flow: email/password or OAuth (Google/GitHub) → create project → pick provider preset → **get your intake URL** → optional signing secret → "Send me a test event" (F16) → watch it arrive live.

- The **"Copy your webhook URL"** card is the hero of step 3. Big monospace URL, one-click copy, a "test" button.
- Success state: a live event card appears in the timeline with a green `DELIVERED` badge within seconds.

### 4.2 Event timeline (Home)
- Rows: `eventType` (bold, mono), provider chip (`STRIPE`/`GITHUB`/`GENERIC`…), endpoint name, status badge, time-ago.
- Badges follow `EventStatus`: RECEIVED (gray), PROCESSING (blue), DELIVERED (green), FAILED (red), DEAD_LETTER (amber + "replay" affordance).
- Auto-refresh via the existing Redis cache (`event:{id}` key, 24h TTL) + polling; P95 < 2s.

### 4.3 Event detail
- **Payload panel:** read-only JSON viewer with copy + raw-view; payload loaded from S3 on demand (`getObject`).
- **Timeline (EventLog):** append-only, color-coded by `LogStatus`; each entry can link to its `Delivery`.
- **Delivery attempts:** table of `Delivery` rows — attempt #, HTTP code, latency, error code, response preview (300 chars).
- **Actions:** `Retry` (single), `Replay` (original payload, marks `x-webhook-replay: true`), `Delete` (soft).

### 4.4 Dead-letter queue
- Filter `status=DEAD_LETTER`; batch-select rows; `Replay selected` (calls `POST /webhooks/batch/replay`, max 100/request).
- Empty state copy: "Nothing stuck. HookScope retried and delivered — this queue stays empty."

## 5. Key screens (P2 — destinations)

### 5.1 Destinations (new nav item, agent-facing)
- A **Destination** = where events go (HTTP URL, SQS queue ARN, Kafka topic, function).
- Endpoint card lists its destinations; delivery rows are per-destination.
- Create flow: choose type → paste ARN/URL → set retry policy (attempts, backoff, timeout) → test connection.
- Show **per-destination health** (success %, current queue depth from Redis, last event at).

### 5.2 Endpoint portal (P3)
- Public share link: `hookscope.app/p/{portalToken}` — read-only event list for the endpoint.
- No auth; **read-only**; supports the "send this to your agent team" use case.

## 6. Copy & tone

- Developer-direct, no fluff. Headlines are sentences: "Your endpoint is live," "Nothing stuck."
- Failure copy explains **what happened + what you can do** ("Destination returned 429 — HookScope will retry in 30s. Retry now to force it.")
- Status labels match the `LogType`/`EventStatus` enums exactly — never invent strings.

## 7. Accessibility & mobile

- Mobile: drawer nav (exists), events still browsable, actions move into an overflow menu.
- Color is never the only status signal — badges pair with text (e.g., "FAILED · HTTP 502").
- Contrast: status colors WCAG AA on the app background.
- ⌘K palette is keyboard-first: `/` focuses search, arrow keys navigate, Enter opens.

## 8. Design debt ledger

| Item | Why | Effort |
| --- | --- | --- |
| Generic intake URL design (any provider) | F9 — new route + copy for "Any provider" | S |
| Destination cards component | P2 core UI | M |
| Public endpoint portal page | P3 | M |
| Chat/webhook alert channels | F18 | M |
