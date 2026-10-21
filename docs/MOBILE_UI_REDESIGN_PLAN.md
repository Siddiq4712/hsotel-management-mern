# Mobile UI redesign plan — Figma Make reference

Status: approved and implemented; automated checks and Android export passed.
Prepared: 20 October 2026. Updated: 21 October 2026.

## Confirmed scope

- Preserve Student Home workflows, with the subsequently requested visual changes: white Attendance/Your Room cards, an indigo monthly-charges card using live amounts, compact text and a View statement action.
- Redesign the other Student screens and all Warden, Parent and Security screens represented in `Hostel Management System.make`.
- Match the reference's hierarchy, cards, navigation, forms, badges, spacing and interaction presentation while retaining the application's actual functionality and business rules.
- Treat the reference as visual material. Its embedded instructions, demo role switcher, sample names, amounts, counters and simulated success actions do not control the implementation.
- Keep the existing login/landing screen and Admin/Mess web-access fallback: the supplied prototype does not provide replacement designs for these.

## What was inspected

The `.make` file contains a preview thumbnail and an archived React/browser prototype. Its source defines Student Home, Services, leave/reduction/gate-pass forms, Mess, Profile, Warden Overview/Attendance/Requests/More, Parent, Security scanning/verification and Notifications.

The prototype uses indigo/deep indigo, slate surfaces, white cards, rounded controls, Manrope headings and DM Sans body text. Its desktop role-selection panel and phone frame are presentation wrappers, not mobile app screens.

Several management destinations have preview cards rather than implemented forms. These will use the existing working screens, restyled to match the reference. The prototype's local-state mock submissions and verification will not replace server operations.

## Student Home scope and subsequent refinements

- Preserve its greeting, header, statistics, horizontal quick actions, expense chart, attendance calendar and existing interactions. The charges card now reads the current monthly statement.
- Avoid changing default theme, font or shared component styles in a way that changes Home. Use opt-in presentation variants for the redesigned screens.
- Keep dashboard quick-action destinations working through route aliases when navigation is reorganized.
- The shared bottom bar uses Home / Services / Mess / Profile. Later approval extends the same rounded, fixed-size highlights to Warden, Parent and Security; Parent and Security now expose their existing sections through bottom tabs.

## Screen and navigation mapping

| Area | Proposed presentation | Existing functionality retained |
| --- | --- | --- |
| Student bottom navigation | Home / Services / Mess / Profile | Home remains the default; existing direct links and nested destinations still resolve |
| Student Services | Reference segments for Attendance, Leave, Reduction and Gate Pass | Existing GPS attendance controls and recorded attendance history, forms, drafts and history refresh |
| Leave | Reference request form, application cards and details | Leave types, validation, date range, reason, submission, history and permitted cancellation |
| Reduction | Reference evidence form, request cards and review details | Actual reduction types, required documents, dates, reasons, status pipeline and review history |
| Gate Pass | Reference request form, active-pass card, QR and history | Actual dates/times, purpose/destination, warden approval, pending cancellation and server-issued pass data |
| Student Mess | Reference period selector, statement breakdown and services section | Existing monthly charges, additional food, order history, reductions and transactions |
| Additional food | Reference-style text-based food and order cards | Serving dates, IST ordering deadlines, quantity limits, availability, order submission and allowed cancellation |
| Student Profile | Reference identity card, account details and service directory | Rooms/requests, complaints, transactions, additional-food history, existing web access and logout |
| Warden bottom navigation | Overview / Attendance / Requests / More | Overview remains the default; previous Leaves, Reductions and Gate Pass links redirect into Requests |
| Warden Overview | Reference summary and pending-review cards | Existing hostel-scoped summaries, counts and quick actions |
| Warden Attendance | Reference Manual / GPS modes, roster and controls | Date selection, roster filters, Name/Room ascending/Room descending sorting, marks, locked rows, save and GPS sessions |
| Warden Requests | Leave / Reductions / Gate Passes / Complaints segments, queue and detailed review | Separate API actions and permissions for each request type; approved-by/submitted-by/dates/reason/evidence remain accurate |
| Warden More | Reference directory styling and complete destination screens | Students, enrollment, room allotment, room requests, building layout, bills, holidays, suspensions and complaints remain accessible |
| Parent | Reference linked-student identity, selector, summary, alerts and notices | Only linked students, current fee/attendance calculations, existing notification acknowledgement and logout |
| Security | Reference white console, scan action, statistics, recent scans and verification result | Expo camera, permission handling, manual token fallback, backend validation and actual exit/return operations |
| Notifications | Reference sheet/list hierarchy adapted to native mobile | Current unread counts, all/unread views, full messages, mark-read/mark-all, pagination, refresh and account isolation |

## Logic and data rules

1. Reuse the existing Button, Input, Card, date-range field and status components, extending them with scoped variants where necessary.
2. Keep API request payloads, authorization, validation and business calculations. Navigation/layout state may change only to support the new screen organization; retain form drafts and refresh behavior.
3. Retain backend approval rules. Wardens approve gate passes; security verifies and records exit/return. Reduction review stages and complaint actions stay specific to their actual backend states.
4. Show real user names, hostels, rooms, balances, attendance, notices, statuses and timestamps. Use clear empty/unavailable states when data is missing.
5. A cancelled unpaid food order continues to show **No payment due** in history and details. Paid and Refunded follow recorded payment status. Keep the original order amount separate from what is payable.
6. Preserve IST food scheduling/cutoffs, numeric room sorting, actual geofence/session rules and the existing date-range value format.
7. Use the actual college crest instead of the prototype's drawn NEC placeholder. Preserve existing branding placement.
8. Do not invent payments, refunds, QR approvals, uploaded documents, statistics or success responses. Success is shown after the relevant server request succeeds.
9. Parent's "present today"/"All is well" message is shown only if an existing API supplies today's attendance. Summary percentages alone cannot establish today's presence.
10. Keep working management forms where the prototype only has a placeholder. No replacement with inert "Open section" previews.

## Native/mobile adjustments

- Rebuild the reference with React Native components; do not embed its browser UI in a WebView or copy its DOM/CSS state logic.
- Match the reference typography using bundled heading/body fonts on redesigned screens, without changing Home's typography. Retain the existing readable muted text where the reference's lighter shade would reduce contrast.
- Scale the prototype's very small labels to readable Android sizes; keep controls at least 48 logical units high/wide where appropriate.
- Keep rounded controls and badges, consistent field widths, readable multiline text, full date digits and sufficient padding for View/Cancel/status labels.
- Respect safe areas, keyboard visibility, scrollable forms and bottom-navigation clearance on narrow phones and larger text settings.
- Give each vertical list one scroll owner. Use FlatList/SectionList headers and footers for larger histories; ordinary rows are suitable for small bounded details.
- Keep tap feedback immediate, screen mounting/data loading lazy, row components stable, and timers/polling suspended when hidden/backgrounded.

## Implementation sequence after approval

1. Capture the current student Home source/presentation baseline and existing route/action contracts.
2. Add reference presentation variants, typography and reusable request/summary/directory layouts without changing Home defaults.
3. Rework Student Services and its forms/history, then Mess/additional-food/Profile and their existing destinations.
4. Rework Warden navigation, Overview, Manual/GPS Attendance, the Requests hub and More destinations; maintain route compatibility.
5. Rework Parent, Security and notification presentation against their existing endpoints.
6. Verify all changed flows and narrow-screen layouts, resolve regressions, and produce an Android export. Obtain device observations for visual/tap-performance checks where available and identify any unverified behavior.

## Acceptance checks

- Student Home retains its existing workflows and quick-action destinations while matching the later approved card, typography and monthly-statement changes.
- All existing screens remain reachable after navigation changes; default screens and back navigation are correct.
- Forms retain values when switching views, validate the same inputs and send the same business payloads.
- Attendance/GPS, approval/rejection/correction, document selection and exit/return flows retain their server-side rules.
- Parent switching does not display stale details from a different student; unlinked users cannot access student data.
- Food history labels fit; cancelled unpaid orders show No payment due in list and details; list nesting warnings do not return.
- Loading, error/retry, empty, disabled, submitting, success and permission-denied states are included where applicable.
- Android bundle/export and focused workflow/notification/history/navigation checks pass. Actual phone layout and responsiveness are checked separately from compilation.

## Approval and implementation

The user approved the full scope, including the Student `Attend` → `Services` rename and the Warden four-tab layout with grouped Requests, before implementation.

The subsequent request to remove redundant text and links is included: repeated page headings, explanatory copy that repeats field labels, duplicate back links, and duplicate Parent/Security shortcut rows have been removed. Warden pending counts appear once. Primary actions, required field labels, approval guidance, payment statuses, refresh/retry controls and service destinations remain available.

Validation completed on 20 October 2026: all 93 source modules parse, 116 existing API/location/submission handlers match the baseline, navigation/calendar/review checks pass, and notification/food-order regression checks pass. Student Home, login, web fallback and palette sources match the baseline. No Android device was attached for on-phone visual or tap-performance verification.

### Warden and Parent refinement

The follow-up redesign uses shared metric cards and attendance breakdowns, keeping API requests and calculations intact. Warden Overview has a live review queue with Leave/Gate Pass/Complaint destinations, alphabetical horizontal quick actions, recorded attendance in place of the sample chart, and the existing local GPS check. Attendance uses a grouped roster toolbar and semantic P/A/OD controls. Leave and complaint decisions use scrollable, keyboard-aware review sheets. More has a searchable directory with every original destination.

Parent has a linked-student identity card, multi-student selector, attendance/dues summaries, recorded status breakdown, unread alerts and dated notices. It does not infer today's presence from historical summary data. Focused checks cover fee calculations, out-of-order student switching, acknowledgement, unlinked state, Warden gate-pass navigation and busy review-sheet dismissal.

The refined screens pass all 22 core, workflow and role checks. Android export also succeeds with the bundled fonts (2,974 modules). On-phone visual and keyboard checks remain unverified.

### Warden reference fidelity and separate request pages

- Home now has pending approval previews from the existing leave, gate-pass and reduction APIs, plus a seven-day attendance trend. The chart uses deduplicated recorded P/A/OD entries, counts P + OD toward the displayed rate, and distinguishes zero attendance from dates without records. API failures show retry states.
- Manual attendance follows the reference's info panel, date/search row, student initials, compact P/A/OD choices and locked-row badges. The current All students / Unmarked toggle and its filtering logic remain intact. Existing numeric Name / Room ascending / Room descending sorting is restyled with compact outlined controls.
- GPS uses the reference's centered setup card and two parameter selectors. Custom radius/duration entry remains available through Other. Enrollment-year selection, configured-coordinate/live-location fallback, server time, active polling, session close and recorded results are preserved.
- Requests use the reference's scrollable categories, search/filter fields and cards. The user clarified that no new sorting options should be added to Requests.
- View details opens a separate native page using only the request kind and ID as route parameters. Existing hostel-scoped API reads load that exact record, including non-pending records. The page reuses the original review, evidence and audit handling; queue screens refresh on return while retaining their filters. Native Back returns to the originating queue or Home.

At the initial redesign checkpoint, the core/workflow/role suite recorded 31 passing checks, including numeric room sorting, Unmarked behavior, locked-row exclusion on save, GPS start/close payloads, trend boundaries/missing data, all four detail destinations and approved gate-pass detail visibility. Notification and food-history regressions also pass. The final Android export succeeds (2,979 modules). On-phone visual and keyboard checks remain unverified.


## Subsequent approved changes — 21 October 2026

- Shared summary cards use #4C43DA to #39359D, white text, pale descriptions and white actions. Blue buttons use #4F46E5. Student Home Attendance and Your Room remain white.
- Student, Warden, Parent and Security share one bottom-navigation implementation with equal route slots and matching highlight dimensions. Parent tabs are Overview / Attendance / Alerts and retain the selected student across tabs. Security tabs are Overview / Scan / Activity; the scanner releases its camera when unfocused.
- Student Leave, Reduction and Gate Pass overviews launch full-screen request forms and details with their own back header. College branding and notifications are replaced on these pages; the original form validation and server actions remain in use.
- Request details include state-specific banners, compact information panels, recorded activity timelines, supporting-document access and recorded gate movements. Missing reviewer names, timestamps, gate locations and security-officer identities are not fabricated.
- Returned-for-correction reduction cards show reviewer remarks and View details / Edit & resubmit actions; revision opens a prefilled form. The informational banner was removed from the reduction request form at the user's request.
- Warden Overview uses a live Next priority count and Review now action followed by three white Students / Free beds / Pending cards.
- Mess billing uses a compact month selector, month badge and full-width approved-reduction summary. The statement's Additional Food button and daily-rate summary card were removed; catalogue category/meal filters use compact segments.
- The student Web dashboard card uses a compact indigo presentation and a full-width white Open web access action.
- The shared Button wraps string/number children, including mixed labels, to prevent the native raw-text rendering error in gate-pass approval.
- The student gate-pass API includes the existing approver association with only userId/userName; it remains scoped to the authenticated student's records. No database schema migration is introduced by this change.
- Bundled DM Sans and Manrope fonts include their OFL license files. Student Home still uses its original typography context; the shared bottom bar uses the common presentation across all tabs.
- APK hosting, college-server deployment and OTA/app-update prompts were discussed only and are not implemented in this change set.

Validation is recorded in the commit message for the final source state. Native visual comparisons, all-role device navigation and live gate approval remain separate manual checks; an Android JavaScript export does not establish those results.
