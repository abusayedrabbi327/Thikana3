# Thikana Admin Panel Design System and Functionality

## 1. Scope and Goals

This document defines the visual system, admin information architecture, and feature behavior for all admin interfaces in Thikana.

Primary goals:
- Make admin tasks fast, clear, and auditable.
- Keep UI behavior and layout consistent across all admin panels.
- Support both light and dark themes with explicit token values.
- Ensure accessibility (WCAG AA contrast and keyboard support).

Out of scope:
- Frontend customer-facing pages.
- Backend API implementation details.

## 2. Admin Information Architecture

Top-level admin modules:
1. Dashboard
2. Users
3. Identity Verification (NID/KYC)
4. Products
5. Orders
6. Reviews and Reports
7. Messages and Inquiries
8. Notifications
9. System Settings
10. Audit Logs

Navigation pattern:
- Left rail sidebar (persistent on desktop, drawer on mobile/tablet).
- Global top bar for search, alerts, quick actions, and profile menu.
- Context tabs inside each module for sub-sections.

## 3. Core Layout Standards

### 3.1 Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### 3.2 Page Structure
- Max content width: 1440px.
- Horizontal page padding:
  - `sm`: 16px
  - `md`: 20px
  - `lg+`: 24px
- Vertical section spacing: 24px.
- Card gap (grid/list): 16px.

### 3.3 Grid System
- Desktop: 12-column grid.
- Tablet: 8-column grid.
- Mobile: 4-column grid.

### 3.4 Surface Hierarchy
- Level 0: app background
- Level 1: panel background
- Level 2: card/table/filter surfaces
- Level 3: modal/drawer/popover

## 4. Theme System (Light and Dark)

Use tokens only. Do not hard-code random color values inside components.

### 4.1 Light Theme Tokens

```css
:root {
  --bg-app: #F6F7FB;
  --bg-panel: #FFFFFF;
  --bg-elevated: #FFFFFF;
  --bg-muted: #F2F4F8;

  --text-primary: #0F172A;
  --text-secondary: #334155;
  --text-muted: #64748B;
  --text-inverse: #FFFFFF;

  --border-default: #D9E0EA;
  --border-strong: #B8C3D6;

  --primary-500: #0B72E7;
  --primary-600: #095EC0;
  --primary-100: #DCEBFD;

  --success-500: #1F9D55;
  --success-100: #DCF7E6;

  --warning-500: #D97706;
  --warning-100: #FFF2DD;

  --danger-500: #D92D20;
  --danger-100: #FDE8E8;

  --info-500: #0EA5E9;
  --info-100: #E0F4FD;

  --focus-ring: #66A3FF;
  --shadow-1: 0 1px 2px rgba(15, 23, 42, 0.08);
  --shadow-2: 0 8px 24px rgba(15, 23, 42, 0.12);
}
```

### 4.2 Dark Theme Tokens

```css
[data-theme="dark"] {
  --bg-app: #0B1220;
  --bg-panel: #121A2B;
  --bg-elevated: #172033;
  --bg-muted: #1D2940;

  --text-primary: #E6EDF8;
  --text-secondary: #C3D0E4;
  --text-muted: #93A6C5;
  --text-inverse: #0B1220;

  --border-default: #2B3A56;
  --border-strong: #3A4B6B;

  --primary-500: #4F9DFF;
  --primary-600: #2F86F5;
  --primary-100: #0E2A4F;

  --success-500: #34D399;
  --success-100: #113528;

  --warning-500: #F59E0B;
  --warning-100: #3B2A0B;

  --danger-500: #F87171;
  --danger-100: #3A1616;

  --info-500: #38BDF8;
  --info-100: #102A3A;

  --focus-ring: #7DB4FF;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.45);
  --shadow-2: 0 10px 32px rgba(0, 0, 0, 0.55);
}
```

### 4.3 Semantic Usage Rules
- Primary CTA uses `--primary-500` background and `--text-inverse` text.
- Destructive actions use `--danger-500` only for final confirmation actions.
- Info/warning/success states must always have icon + text + tokenized background.
- Borders use `--border-default` for normal and `--border-strong` for active/focus grouping.

## 5. Typography and Spacing

### 5.1 Typeface
- Heading and UI font: `"Plus Jakarta Sans", "Segoe UI", sans-serif`
- Data-heavy tables and IDs: `"JetBrains Mono", "Consolas", monospace`

### 5.2 Type Scale
- Page title: 28px / 700
- Section title: 22px / 700
- Card title: 18px / 600
- Body: 14px / 400
- Small/Meta: 12px / 400

### 5.3 Spacing Scale
Use an 8-point base scale:
- 4, 8, 12, 16, 24, 32, 40, 48

Do not use arbitrary values unless a component requires pixel-perfect icon alignment.

## 6. Shared Components and Behavior

### 6.1 Buttons
Variants:
- Primary
- Secondary
- Ghost
- Danger
- Inline action

States:
- default, hover, active, focus-visible, disabled, loading

Rules:
- All focusable controls must have visible ring using `--focus-ring`.
- Loading state keeps width fixed and shows spinner.

### 6.2 Inputs and Filters
- Minimum control height: 40px.
- Label always visible (no placeholder-only fields).
- Validation appears below field with icon.
- Filter bar pinned at top of table views when scrolling long lists.

### 6.3 Badges and Status Chips
Status mapping:
- pending -> warning
- processing -> info
- approved/completed -> success
- rejected/failed/cancelled -> danger
- draft -> muted

Badge format:
- Height: 24px
- Radius: 999px
- Left icon optional, but consistent per status type.

### 6.4 Tables
- Sticky table header.
- First column can be sticky for identity-heavy lists.
- Row action menu uses kebab button.
- Bulk select appears only after first row selection.
- Empty state includes: title, reason, CTA.

### 6.5 Drawers and Modals
- Drawer for quick edit/review actions.
- Modal for high-risk confirmations.
- Escape key closes non-destructive dialogs.
- Destructive dialogs require explicit confirmation action.

## 7. Admin Panels and Functional Specifications

## 7.1 Dashboard
Purpose:
- High-level operational snapshot and anomaly detection.

Widgets:
- KPI cards: total users, active listings, open disputes, pending KYC, orders today.
- Trend charts: orders/day, GMV, verification funnel.
- Alert rail: failed jobs, payment anomalies, abuse spikes.

Actions:
- Quick links to filtered views (for example, "Pending KYC > 24h").

## 7.2 Users Panel
Purpose:
- Search, inspect, and moderate accounts.

Features:
- User table with role, verification status, account flags, last login.
- User detail drawer: profile, activity summary, linked products/orders.
- Admin actions: suspend, reactivate, role update, reset sessions.

Guardrails:
- Any role change/suspension requires reason input.
- All critical actions logged in audit logs.

## 7.3 Identity Verification (NID/KYC)
Purpose:
- Review and resolve identity checks.

Features:
- Queue views: pending, review, approved, rejected.
- Side-by-side document and selfie preview.
- OCR summary block: extracted NID, confidence, flags.
- Decision actions: approve, reject, request re-upload.

Rules:
- Rejection requires reason category and optional note.
- Show risk badges: low OCR confidence, low face match, duplicate attempts.
- Decision timeline is immutable and visible.

## 7.4 Products Panel
Purpose:
- Moderate listings and maintain catalog quality.

Features:
- Product list with category, seller, price, stock, status.
- Moderation workflow: approve, reject, hide, feature.
- Flag triage queue for reported products.

Rules:
- Hide/reject requires reason.
- Show moderation history for each product.

## 7.5 Orders Panel
Purpose:
- Manage fulfillment and intervention workflows.

Features:
- Order lifecycle table with status progression.
- Filters by payment status, shipping status, delay risk.
- Timeline view for each order.
- Admin override actions with reason capture.

Rules:
- Prevent invalid status jumps (for example, delivered -> processing).
- Any manual override writes audit entry.

## 7.6 Reviews and Reports
Purpose:
- Handle abuse/content quality.

Features:
- Report queue sorted by severity and age.
- Linked context: reviewer, product, seller, previous reports.
- Actions: remove review, warn account, dismiss report.

Rules:
- Dismissal requires a resolution note.

## 7.7 Messages and Inquiries
Purpose:
- Safety and support review of user conversations.

Features:
- Conversation list by priority/flag.
- Message thread viewer with attachment previews.
- Actions: mark safe, escalate, temporary mute.

Rules:
- Privacy controls enforce least-privilege view for admins.

## 7.8 Notifications Panel
Purpose:
- Manage system and user-facing notification events.

Features:
- Template management (title/body/link).
- Channel toggles (in-app, email, push).
- Delivery analytics and failure logs.

Rules:
- Template edits versioned.
- Rollback available for last published version.

## 7.9 System Settings
Purpose:
- Configure business and operational settings.

Features:
- KYC threshold configuration.
- Moderation thresholds.
- Feature flags.
- Rate-limit presets.

Rules:
- Changes require confirmation and optional reason.
- All setting changes are audit-logged with before/after values.

## 7.10 Audit Logs
Purpose:
- Trace all critical admin actions.

Features:
- Log table with actor, action, target, timestamp, IP, metadata.
- Advanced filtering and CSV export.
- Immutable records (append-only behavior).

## 8. Consistency and Interaction Rules

### 8.1 Action Placement
- Primary action goes right-most in action rows.
- Dangerous actions separated from non-danger actions.
- Inline row actions limited to 2 frequent actions + overflow menu.

### 8.2 Feedback Rules
- Success toast: short and auto-dismiss.
- Error toast: sticky when action failed and needs response.
- Long-running jobs show progress indicator and eventual completion status.

### 8.3 Form and Validation Rules
- Client-side validation for required format checks.
- Server response errors map back to fields when possible.
- Preserve user input on failed submit.

### 8.4 Empty, Loading, and Error States
- Loading: skeletons for cards/tables, not spinner-only pages.
- Empty: explain why and provide next action.
- Error: include retry action and trace ID when available.

## 9. Accessibility and Usability Standards

Mandatory requirements:
- Color contrast at least WCAG AA.
- Full keyboard navigation for all controls.
- Focus order follows visual order.
- ARIA labels for icon-only buttons.
- Touch target minimum 40x40px.
- Do not rely on color alone for status; use text/icon too.

## 10. Motion and Micro-Interactions

Principles:
- Motion should communicate state change, not decorate.
- Keep transitions short and purposeful.

Recommended durations:
- 120ms for hover/focus
- 180ms for panel/table transitions
- 220ms for modal/drawer entrance

Easing:
- `cubic-bezier(0.2, 0, 0.2, 1)` for most transitions.

## 11. Security and Permissions in UI

- Show/hide actions based on role and permission claims.
- Disable action controls with explanatory tooltip if user lacks permission.
- Confirm step-up actions (suspend user, reject KYC, refund override).
- Never expose raw sensitive identity data in default table views.

## 12. QA Checklist for Design Consistency

Before shipping an admin screen:
1. Theme tokens applied for both light and dark.
2. All statuses use semantic chips and not custom colors.
3. Table headers sticky and filters usable at all breakpoints.
4. Keyboard navigation and focus ring verified.
5. Empty/loading/error states present.
6. Critical actions require confirmation and generate audit entries.
7. Mobile/tablet layouts remain functional without horizontal overflow.

## 13. Implementation Notes

Suggested file organization:
- `src/styles/admin-theme.css` for token definitions.
- `src/components/admin/` for shared admin UI primitives.
- `src/pages/Admin.jsx` as shell + route outlet for module pages.

Naming consistency:
- Use `Admin<Module>Name` pattern for modules.
- Use `status` enums shared between frontend and backend.

This document is the source of truth for future admin UI changes.
