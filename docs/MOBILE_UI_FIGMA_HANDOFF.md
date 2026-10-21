# Hostel Management mobile app — current UI and Figma redesign handoff

Baseline source audit prepared on 20 October 2026; annotated on 21 October 2026.

**Baseline document:** The screen descriptions below preserve the initial audit used for the Figma handoff. Later implementation changes supersede that baseline. See `MOBILE_UI_REDESIGN_PLAN.md`, especially its 21 October update, for the implemented full-screen requests/details, role navigation, dashboard cards, current palette and verification boundaries. Baseline screen/navigation descriptions are not a current runtime inventory.

## 1. Instructions for the Figma agent

Understand the existing app described below before improving it. Produce a coherent, accessible, practical mobile design for National Engineering College's Hostel Management app, covering Student, Warden, Parent and Security roles. Preserve the existing workflow meanings, permissions, information and important states. Improve visual consistency, navigation, hierarchy, forms, readability and feedback.

Treat sections labelled **Current** as a description of source-defined UI. Treat sections labelled **Recommended** as proposals. The existing app has not been visually verified on a running device for this handoff. Exact line wrapping, native pickers, keyboard behaviour, shadow rendering and runtime data require device validation. Measurements are React Native logical units; use them as approximate Figma dimensions, not physical screen pixels.

Do not treat every file as a reachable screen. Section 11 identifies screens and components that exist in source but are not connected to the current navigation. Do not portray sample charts, placeholder payments, or an unfinished profile editor as completed product capabilities.

Deliver a design file, reusable component library, annotated role-based flows, all relevant states and a clear distinction between existing functionality and any proposed expansion. This brief is a design handoff, not authorization to change application business rules.

## 2. Product, identity and implementation context

- Product: **Hostel Management** for **National Engineering College**.
- Use: hostel attendance, leave applications, documented mess reductions, gate passes, room requests/allotment, complaints, mess charges, additional food orders, student administration, parent monitoring and security gate operations.
- Platform: a React Native/Expo mobile application. It is distinct from the project's responsive web frontend.
- Current package versions: Expo 54, React Native 0.81.5, React 19.1.0, React Navigation 7 and NativeWind 2. These describe the checked-in application, not a recommendation to upgrade.
- Configured presentation: portrait orientation, light appearance, dark status-bar content. Android edge-to-edge is enabled. iOS tablet support is declared, but there is no separate tablet design in the inspected screens.
- Current language: English. The college crest contains Tamil text as artwork. No language switcher is visible in the inspected navigation.
- Typography update (21 October): redesigned screens use bundled DM Sans body text and Manrope headings through ReferenceProvider. The Student Home typography context remains platform-native; its bottom navigation now shares the common presentation. Font files and their OFL licenses are included in the repository.
- Icons: predominantly Lucide outline icons, normally 16–24 units; Google sign-in uses an AntDesign Google glyph.
- Imagery: college crest, user portraits, generated gate-pass QR image, launcher/splash assets. Food cards have text and icons, not food photography.
- Currency: Indian rupees, usually two decimal places in billing and order views. Some dashboard summaries use whole amounts.
- Dates: mixed existing formats, including DD MMM YYYY, MMM DD YYYY, DD/MM/YYYY and native/localized formats. Food serving dates and cutoffs explicitly use IST.

### Identity assets

- `mobile-app/assets/nec-logo.png`: the existing college crest, 473 × 538. Blue cogwheel outline, red institution name, green central map/technical symbols, purple Tamil motto, white background. Preserve the crest and its proportions.
- Login currently places that portrait-shaped crest inside a square 56 × 56 image without an explicit contain mode. The shared headers do explicitly contain the crest.
- Student header crest: 28 × 36. Shared staff header crest: 32 × 40.
- `mobile-app/assets/icon.png` is still a generic pale-gray icon construction grid/circle placeholder, verified by opening the image. Configuration points launcher icon to this file.
- Splash, adaptive icon and favicon use separate configured assets. They should be audited alongside branding; this handoff does not assume those files display the college crest.
- Other available assets include `nec_image.jpg` and `nec_logo.jpeg`; they are not used by the inspected current login or shared headers.

## 3. Current visual system

### 3.1 Exact shared colours

| Token | Hex | Current use |
| --- | --- | --- |
| Primary | #4F46E5 | Indigo buttons, links, selected tabs, chart marks |
| Primary dark | #312E81 | Strong headings and gradient endpoint |
| Background | #F8FAFC | Very pale slate screen canvas |
| Card | #FFFFFF | Cards, headers, dialogs, navigation |
| Text | #0F172A | Dark slate main content |
| Muted text | #475569 | Secondary labels, dates, descriptions |
| Border | #E2E8F0 | Standard one-unit outlines and dividers |
| Border strong | #CBD5E1 | Stronger outlines and disabled calendar text |
| Surface | #F1F5F9 | Neutral inset panels, unmarked dates, controls |
| Primary soft / tint | #EEF2FF / #E0E7FF | Selected surfaces, soft outlines |
| Success | #15803D | Present, approved, paid, positive feedback |
| Success soft / tint | #F0FDF4 / #DCFCE7 | Green status backgrounds |
| Warning | #A16207 | Pending, caution, full rooms |
| Warning soft / tint | #FFFBEB / #FEF3C7 | Amber status backgrounds |
| Danger | #B91C1C | Errors, rejection, absence, destructive actions |
| Danger soft / tint | #FEF2F2 / #FEE2E2 | Red status backgrounds |
| Accent | #0F766E | Teal supporting actions, on-duty display in student history |
| Accent soft / tint | #F0FDFA / #CCFBF1 | Teal tags and explanatory panels |

Important implementation detail: old utility names have been remapped to this palette. `blue`, `indigo`, `purple` and `violet` generally resolve to the same primary family; `gray` and `slate` resolve to the shared neutral family. Green/lime/emerald resolve to success, amber/yellow/orange to warning, red/rose to danger, and cyan/teal/pink to accent. Read the actual token values above, not the implied default Tailwind colours in old class names. Several numerical shades collapse to the same colour.

### 3.2 Typography, rhythm and geometry

- Standard content inset: 16. Common vertical gaps: 8, 12 and 16. Scroll content typically ends with 32 bottom padding.
- Cards: white, one-unit pale outline, default radius 16, default padding 18. Screen-specific cards commonly use 12, 16, 20 or 24 padding.
- Large feature cards: indigo-to-deep-indigo gradients, radius 20–22, padding 20–22.
- Identity card: radius 24. Several older modals use radius 24 or very large 40-unit top corners.
- Main screen headings: usually 24/700, sometimes 26/700. Student home greeting: 23/700.
- Section headings: 16–18/600–700. Body: mostly 13–16. Metadata: 11–12. Some older room-blueprint text is only 7–10.
- Large values: home statistics 23/700, home feature card 25/700, monthly charge total 32/700.
- Labels sometimes use uppercase and tracking of 0.5–1.0. Room explorer uses much heavier 800–900 weights and widespread uppercase.
- Buttons and inputs typically have radius 12. Pills use radius 999 or 10–24 depending on component.
- Current depth is restrained: outlines dominate; selected older cards also apply light shadows. The loading overlay uses a stronger elevation/shadow.
- Layout is predominantly vertical scrolling with two-column summary cards. Warden security stats use a three-column row. Quick actions and some navigation scroll horizontally.

## 4. Shared components and interactions

### Buttons

- Shared base: at least 48 high and 48 wide; centred content, radius 12, wrapping allowed, pressed opacity 0.75.
- Primary: indigo fill, white label, padding 18 horizontal / 14 vertical.
- Secondary: pale indigo fill, indigo label, one-unit tinted outline.
- Ghost: transparent by default, indigo label, compact internal padding.
- Danger: dark red fill and white label.
- Disabled or loading shared button: opacity 0.55. Loading can add a spinner beside the label.
- Label default: 16/600. Many older screens provide their own styled text and utility colours.
- Icon-only shared buttons retain a 48-unit minimum. Some older raw touch targets are smaller; do not assume every existing interaction meets that size.

### Inputs and selectors

- Shared input: 48 minimum height, 16-point dark text, muted placeholder, indigo text selection, transparent Android underline, radius 12.
- Input wrappers supply the visible fill, border, icons and horizontal padding. Multiline default: minimum 112, aligned to top; many forms use 128-height reason fields.
- Native picker controls appear throughout, often inside a white or pale-gray rounded border. They do not all share a custom dropdown-sheet UI.
- Fields are inconsistently labelled: newer student forms have persistent labels and helper text; older management forms rely on placeholders.
- Search fields typically have a leading search icon and search immediately on typing where local filtering is used.

### Student header

- White background, bottom divider, top safe-area protection, row minimum height 60, horizontal padding 12, gap 10.
- Default left: contained college crest. Back variant replaces crest with a 21-unit back arrow in a 48-unit control.
- Title: 16/700, 21 line-height, deep indigo; back variant centres title and uses main text colour. Default title can occupy two lines; back variant one.
- Right: notification bell and a profile icon, both in 48-unit controls.
- Profile action opens the current Student Account page.
- Embedded workflow children suppress this header so the parent workflow has one shared header.

### Shared Warden header

- Larger, two-row white panel with bottom divider and top safe-area handling.
- Top row: contained college crest, “Hostel Management”, notification bell, logout icon on pale red.
- Lower row: 40-unit circular portrait or initials; name and optional hostel; uppercase role in pale-indigo rounded pill, capped at 35% of row width.
- Logout opens native confirmation: “Logout”, “Are you sure?”, Cancel / Yes.

### Quick actions

- Heading “Quick actions” with “Swipe” and right chevron.
- Horizontal rail, no visible scrollbar. Each tile: width 104, minimum height 100, radius 16, padding 12, border, 12-unit gaps.
- Icon container: 42 square, radius 12, softly tinted; icon 22. Label 12/600, centred, may wrap.
- Actions are alphabetically sorted by label, rather than ordered by importance or recent use.
- Disabled shared tiles: opacity 0.45.

### Request details card

- Used in Warden leave, gate-pass and complaint lists and in reduction histories.
- White 16-radius card; padding 16, 12 bottom margin, 14 internal gaps.
- First row literally displays “Heading · #reference” on the left and a status badge on the right. Below: request title, 18/700, deep indigo.
- Fields: submitted by, processed/approved/rejected/assigned person, submitted date, decision date if recorded.
- Date range appears in a pale inset panel; optional inclusive duration.
- Additional labelled fields and full-width reason/description follow.
- Labels: 12/600 muted; values 14 with 21 line-height. Two-column details wrap with 115 minimum width; long fields use full width.
- Footer actions have a top divider and 10-unit gaps.
- Status treatment uses textual matching: rejected/expired/late return are danger; approved/completed/resolved/closed success; cancelled neutral; otherwise warning. This differs from some student status badges.
- Missing dates render “Not recorded”; missing pending reviewer renders “Awaiting review”.

### Date-range calendar

- Reusable field label with inclusive day count; 48-high range trigger containing start → end and a calendar icon.
- Opens a centred fade modal with dark slate 50%-alpha backdrop, width up to 360 and height up to 85%.
- Title “Select duration”, short instructions, current draft range, month navigation, Sunday-first weekday row and seven-column calendar.
- Tap start then end; tapping start again permits a one-day range. Endpoints are indigo/white, intervening dates pale indigo, blocked dates muted.
- Calendar day targets have minimum height 48. Past dates are blocked only when a screen supplies a minimum date.
- Shows inclusive selected-day count. Cancel discards draft; Apply dates is disabled until a complete valid range exists.
- Separate native date/time pickers remain on other screens; the app does not yet use this same calendar everywhere.

### Loading, alerts and keyboard

- Shared loading overlay: modal over whole screen, fade, dark slate 50% backdrop, white card up to 320 wide, padding 24, spinner, 18/700 message and optional 14-point helper. Login uses “Authenticating...”.
- Other screens use inline spinners, full-screen loading messages, or button text such as Saving / Marking / Submitting.
- Native alerts handle many validation failures, confirmations and success notices; inline feedback is less consistent.
- Shared Screen provides left/right safe-area handling and keyboard avoidance: iOS padding, Android height. Other wrappers implement their own handling.
- Student and Warden custom bottom bars hide when the keyboard appears. Scroll containers commonly keep taps working while keyboard is open.

### Notification inbox

- Shared notification bell exists in Student and Warden headers, when there is a valid signed-in user ID.
- Bell: 21-unit indigo icon inside 48 square; unread badge dark red at top-right, minimum 19, white border, 10/700 count, capped at “99+”.
- Opens a full-screen sliding modal with safe-area handling. Header: “Notifications”, unread count and close button; detail view adds back.
- All / Unread controls, Mark all read, refresh icon. Mark all read disables when there is nothing unread or work is running.
- Cards: title, two-line message preview, formatted timestamp, chevron. Unread cards use pale indigo and a dot; read cards show a green check.
- Tapping opens full selectable message and marks unread item read. Return through Back to notifications.
- Pull to refresh, Load more, 20 records per requested page, errors with Retry, loading state and distinct “No notifications yet” / “You’re all caught up” states.
- Inbox polls about every 30 seconds only when focused and app active. Parent instead has a separate, simpler Alerts Feed described later.

## 5. Current role navigation

### Student

Four equal bottom tabs: **Home**, **Attend**, **Mess**, **Profile**.

- Icons: Home, CalendarCheck, Utensils, UserRound, size 22.
- White bar with top border, top padding 6, horizontal padding 8, bottom safe-area padding at least 8.
- Items: minimum height 58, rounded 22, horizontal margin 3. Selected item has pale-indigo fill and tinted border. Label 11/700, uppercase, tracking 0.5.
- Home opens Student Dashboard.
- Attend opens a Workflows hub with Attendance / Leave / Reduction / Gate Pass internal segments.
- Mess opens Monthly Statement, with nested Additional Food, My Food Orders and Transactions.
- Profile opens Student Account, with nested Rooms and Complaints; transactions/orders link across to Mess.
- Legacy direct routes also exist for leave, gate pass, reduction, complaints, food, rooms and transactions. Direct routes pushed above StudentTabs can appear without the persistent bottom tab bar; nested routes inside a tab retain it.

### Warden

Six bottom destinations: **Dashboard**, **Attendance**, **Leaves**, **Reductions**, **Gate Pass Approval**, **More**.

- This is a horizontally scrolling rail, not six evenly compressed items.
- Text hint above rail: “Swipe to see all sections”. Each item minimum width 92, height 58, icon 21, label 12/600, radius 22, selected pale-indigo fill and outline.
- Active item is scrolled into view. Safe-area bottom padding is at least 8.
- Attendance has manual records and GPS session screens.
- More has All sections and ten management destinations. More children also show a horizontally scrolling pill strip below the large shared header.
- More section list is alphabetical: Bills, Complaints, Create room, Enroll student, Holidays, Room layout, Room requests, Rooms, Students, Suspensions.

### Parent and Security

- Native stack navigation, white title bar, dark text, bold title, no header shadow. No bottom tab bar.
- Parent stack: Parent Portal dashboard only.
- Security stack: Security Console → Scan Gate Pass → Verification Details.

### Other account roles

Successful sign-in with an unsupported mobile role goes to the Web Account fallback. Do not invent mobile Admin, Store or Mess Manager dashboards from the web app.

## 6. Authentication and account fallback

### Login — current structure, top to bottom

1. Pale background, vertically centred scrollable content, horizontal padding 20. Keyboard avoidance and tap outside to dismiss.
2. 64-square white rounded-16 logo tile with light shadow; crest image 56 square and radius 12.
3. “National Engineering College” under the logo, deep indigo, 18/bold, centred, max width 280, line-height 26.
4. White rounded-16 bordered form card, maximum width around 448, horizontal padding 24 and vertical padding 32.
5. Conditional error banner above fields: pale red, red border, alert icon and red message.
6. Persistent “Username or roll number” label; pale-gray outlined wrapper with user icon and placeholder “Enter username or roll number”. Wrapper minimum 56 high.
7. “Password” label; pale-gray outlined wrapper, lock icon, secure-entry input, placeholder “Enter your password”. Wrapper uses height 48 while shared input itself has a 48 minimum; verify fit on-device.
8. Indigo full-width “Sign In →” button; bold white label.
9. Horizontal divider with centred “OR”.
10. White outlined “Continue with Google” button, red Google glyph and dark label. It opens browser authentication and returns to the app.
11. Muted footer “© 2026 National Engineering College”, centred with generous top margin.

States: empty, typed input, keyboard, missing-field error, server/network/auth error, authenticating overlay, browser authentication success/cancel/failure. Error clears when editing a field. The current screen has no visible registration, forgot-password link, show-password toggle or remember-me switch. Those would be new design proposals.

### Unsupported-role fallback

Centred white card on pale background, outer/card padding 24 and radius 16. Title “You are signed in” at 24/700, account and normalized role, explanatory body saying this account has no mobile dashboard, quick-action tiles Open web dashboard / Switch account, and hint that the web app must be running and browser sign-in is separate. Opening web access launches an external browser; it is not a native embedded admin area.

## 7. Student screens — complete active screen inventory

### S01. Home / Student Dashboard

Header, then a vertical scroll view with 16-unit gaps:

1. “Hi, {name}”, 23/700; hostel and room subtitle or “Your student workspace”; refresh icon at right. Pull-to-refresh is available.
2. Two equal outlined cards: ATTENDANCE with percentage and month / P / OD context; YOUR ROOM with room number or “Not allotted”, plus hostel/helper text.
3. Indigo gradient fee card: either “ANNUAL HOSTEL FEE · NEEDS ATTENTION” and configured amount, or “MESS & HOSTEL CHARGES” and “Your monthly statement”. Helper mentions food charges, additional food and approved reductions. White View fee details button.
4. Horizontal Quick actions rail: Additional Food, Complaint, Gate Pass, Leave, Reduction, alphabetically sorted. Different icon surfaces use primary, teal or amber.
5. Mess expenses section with previous/next-year controls and numeric year. White chart card, indigo bars, rupee axis, 210 high, zero baseline, 11-point labels. The display selects up to four recent months from yearly data; current year ends at the current month. Loading spinner / no-data copy exist.
6. Attendance calendar section with View history link. White card, month name and arrows, Sunday-first single-letter weekday headings, seven-column date cells. Cells approximately 13% wide, square, radius 8. Present green, absent red, OD teal, unmarked neutral. Outside-month dates dimmed. Text legend P / A / OD below.

Attendance percentage uses P and OD over recorded P/A/OD rows; it is not a mess-discount percentage. Year control is shared with the calendar query. Month arrows wrap 1↔12 without changing year in the existing code; flag this behaviour for improvement rather than silently documenting it as normal chronological navigation. Calendar cells use colour for individual status and do not expose a detailed day interaction in the inspected JSX.

### S02. Attend / Workflows container

- Student header titled “Workflows”, with back control, even though this is reached through Attend bottom tab.
- Rounded neutral segment rail, margin 16, padding 4, radius 14. Four equal segments: Attendance, Leave, Reduction, Gate Pass. Segment minimum 48 high; labels 11/700. Selected item white with outline and primary label.
- Leave and Gate Pass add a second mode row: section title plus Request / History or Request / My pass buttons, minimum 44 high.
- Initial Leave mode is Request; initial Gate Pass mode is My pass. Home quick actions can open the corresponding request form directly.
- Visited panels remain mounted to preserve unfinished drafts; hidden panels are not intended to keep fetching/live timers. Embedded child headers are suppressed.

### S03. Attendance panel — evening GPS check-in and history

- “Evening Attendance”, 16/700, then a bordered white status card.
- No-session state: “No active session”, wait-for-warden instruction, neutral Refresh button.
- Active state: Session Active, countdown in minutes/seconds, radius, optional distance from warden, optional local Present/Absent evaluation, primary Mark Attendance button.
- Progress and completed labels: Marking..., Marked Present, Marked Absent; completed/working button dims and disables.
- Location permission, device identification and GPS acquisition happen during marking. Permission failures, out-of-range evaluation, backend failures and successful result use native alerts.
- Local evaluation and server-recorded status are separate pieces of feedback; redesign should avoid making a local estimate appear authoritative before submission succeeds.
- Below: monthly attendance history with month/year, P/OD percentage, previous/next arrows; future-month control disabled. Default ten records, Load more history adds ten.
- Each row: rounded tinted day tile, weekday, full date, approved-reduction note if linked, textual status pill. History supports P, A, OD, H Holiday and Not marked.
- Loading, error with Retry, and no-records illustration/icon state are defined.

### S04. Leave request

- Intro explains warden review. White rounded card, 16-unit gaps.
- Required Leave Type native picker: Casual Leave, Sick Leave, Emergency Leave, Vacation Leave, Other.
- Required Leave dates using the shared calendar, minimum today and inclusive day count.
- Required multiline Reason for Leave, with detailed-reason placeholder.
- Full-width Submit Application, then Reset secondary button.
- Validates all fields and date order. Spinner while submitting; native success/error. On success clears form and returns to history in the embedded workflow.

### S05. Leave history, details and filters

- Existing content heading still says “Leave Management” and includes explanatory subtitle, even inside the Workflows container.
- Apply for New Leave button, then a bordered history card with pale section header and search/filter icon.
- Rows: leave type, submitted date, Pending / Approved / Rejected badge, date range, inclusive duration, two-line reason, View Details link with eye icon.
- Detail modal: centred white rounded card, maximum width around 448 and height 85%; top title/close, scrolling content and footer Close. Displays leave type, dates, status, processor if available, reason, optional Admin Comment, submission timestamp.
- Filter bottom sheet: Status, Leave Type from existing records, search in reasons; Reset Filters / Apply Filters. Filter edits are staged until Apply.
- Empty state differentiates no applications from no filter matches and offers Clear all filters when applicable.

### S06. Mess reduction request and history

- Important indigo explanatory panel: only approved operational days reduce food charges; attendance alone does not grant a reduction; water and other charges stay unchanged.
- New reduction request card or Revise request #ID.
- Category picker and required evidence:
  - Medical leave → doctor’s prescription → approved dates marked Absent.
  - OD — NSS / NCC / college participation → OD letter → OD.
  - Internship → offer letter → OD.
  - Study holiday → tutor-signed reduction letter → Absent.
- Duration calendar; optional Activity / organization, maximum 150 characters; required reason, maximum 2000; supporting file chooser.
- File types PDF/PNG/JPEG, up to 5 MB. Shows selected/existing file name. Reason validation minimum five characters; valid inclusive span 1–366 days. The reduction calendar does not supply a minimum today like the leave form.
- Submit for approval; during revision Start a new request clears edit mode.
- History header / Refresh; native status filter: All requests, Pending review, Approved, Returned, Rejected, Cancelled.
- Shared detailed request cards display requester, reviewer, dates, duration, hostel, activity, remarks and reason. Open supporting document launches platform document/share actions; not an in-app PDF viewer.
- Eligible pending/returned/rejected requests offer Edit / resubmit. Pending/returned requests can be cancelled.
- Cancellation opens centred modal requiring reason, Confirm cancellation / Back.
- Earlier decision history can expand/collapse; each entry has action, actor, timestamp and remarks.
- Legacy records have resubmission guidance; preserve their special treatment in mockups.

### S07. Gate pass request

- White bordered card inside workflow, title “Request a gate pass”, helper explaining QR availability after approval.
- Purpose of Visit input, Destination Place input, Visit dates calendar with minimum today, separate Exit time and Return time native time pickers.
- Time controls are disabled before dates are chosen. Date selection preserves clock values; return must be after exit.
- Primary action currently says “Submit Outpass Request” with send icon. UI alternates between “gate pass” and “outpass”; wording standardization is recommended.
- Required fields and time order are validated; submits with progress, success/error alerts and returns to pass history.

### S08. My pass / gate-pass status and history

- Active Gate Pass white card; status pill, purpose, destination, exit and expected return.
- Approved or Outside plus token: centred 192-square QR image inside a pale-indigo frame, with instruction to show security on exit and return. QR is currently loaded as a remote image.
- Pending: amber clock illustration, “Pending Warden Approval” and queue explanation; Cancel Request action with confirmation.
- No active pass: large QR icon, explanation, Request Outpass CTA.
- Below: Outpass Logs History inside a continuous white list panel. Rows show purpose, destination, date span, status.
- States represented: pending, approved, outside, completed, cancelled, rejected, expired, late_return. Student Approved/Outside treatments use the primary family, Completed success, Pending warning, late/expired/rejected danger, Cancelled neutral.
- Current/History fetch errors are logged without a full inline retry experience. Separate direct route versions have no local StudentHeader in this screen; embedded workflow supplies it.

### S09. Mess / monthly charges

- Header “Mess & fees”. Monthly statement row with History link. Billing-month native picker: months in the current selected year up to present; no separate year control is rendered.
- Indigo gradient total card, padding 22/radius 22: TOTAL MONTHLY CHARGES, 32-point rupee total, month/year and helper text.
- Two equal cards: Daily food rate and Approved reduction days (or Legacy).
- Full-width Additional Food action with utensils icon and chevron.
- Charge breakdown card: food share after reductions, additional food, applicable flat fees with description and icon, total. Fee types may include bed charge, newspaper, water bill and special food charge.
- Teal rules panel: base days, approved reduction days, warning that only approved operational days reduce food charges; recorded P/OD man-days separately shown.
- Additional food orders list-link card.
- Daily charges: tappable outlined cards with date, attendance status, amount, expand/collapse chevron. Expanded section lists daily food share, additional food, monthly daily rate and total for the day. One row expanded at a time.
- Historical stored amounts take precedence when supplied. Current screen describes charges; it is not a completed online-payment checkout.

### S10. Additional Food catalogue and confirmation

- Header with back. Search food field, instruction about weekly schedule, My Additional Food Orders history link.
- Category picker: All categories, Veg, Non-Veg. Meal picker: All meals, Breakfast, Lunch, Dinner.
- Vertical text-only food cards: 17/700 name, 18/700 indigo price, teal category chip, meal label, weekly schedule with calendar icon, order cutoff with clock icon/IST, optional preparation minutes, per-student/per-date limit, Add or Closed action.
- Card: padding 16, radius 16, gaps 12, one-unit border, divided bottom row. Closed action muted; no multi-item shopping-cart screen is present.
- Pull-to-refresh, initial spinner, no-matching-food message.
- Add opens a sliding bottom confirmation over black 50%, maximum height 85%, scrolling white card, padding 24 and bottom 32.
- Confirmation: heading/close; food, category, meal and recurring weekday; full deadline with IST and closure notice; serving-date picker; quantity minus/input/plus; maximum quantity helper; calculated rupee total; explanation that amount goes to additional bill; Cancel / Confirm.
- Serving date defaults to next matching weekday, including today. It must be today/future and match scheduled weekday. Cutoff can close ordering for today; choosing a later valid matching date is a separate choice, not automatically guaranteed by the default Add state.
- Quantity must be whole and within per-item maximum; maximum is cumulative per food/student/serving date. Confirmation disables when cutoff has passed and while submitting. Success alert offers View orders.
- Availability remains authoritative; new orders may be rejected if an item becomes unavailable.

### S11. Additional food order history and detail

- Header, additional back link, large title/subtitle.
- Two date controls side-by-side, then Search / Reset. Dates filter history only when both are present.
- Cards: Order #ID, fulfilment status badge, order timestamp, serving date in IST, amount, separate payment status, View action; Cancel only while Pending with native confirmation.
- Fulfilment states: Pending, Confirmed, Preparing, Ready, Delivered, Cancelled.
- Payment states: Pending, Paid, Refunded, No payment due, Unknown. Cancelled + unpaid maps to No payment due; cancellation must not be displayed as a refund or successful payment.
- Detail opens a tall sliding modal, roughly 90% height, with close. Scrollable sections: Order Summary, Order Items, Order Timeline.
- Items show food name, quantity, unit price, subtotal and special instructions if stored. Summary includes notes if supplied.
- Timeline is simplified: placed timestamp, confirmed/updated timestamp when non-pending, cancellation timestamp if cancelled; not a complete live tracking sequence.
- Loading and no-orders states. Date Reset currently resets state then immediately fetches; filter reset behaviour needs functional review before claiming it always clears the request correctly.

### S12. Transactions

- Student header with back; Transaction History title/subtitle.
- Status picker: All Transactions, Completed, Pending, Failed, Cancelled.
- Four summary cards in a two-by-two grid: Total Txns, Total Amount, Completed, Pending.
- List section header shows active filter. Rows show transaction-type chip, status badge, description, signed amount, date, payment method and reference.
- Refund amounts are green with plus sign; other amounts red with minus sign. Preserve sign/type information independent of colour.
- Empty state varies with selected filter. This is a record-history screen, not a new payment-entry interface.

### S13. Profile / Student Account

- Student header “My profile”, then white identity card, padding 24/radius 24, centred.
- 76-square circular image or user-icon placeholder; name 21/700, hostel and room subtitle, small uppercase STUDENT pill.
- Indigo gradient Web dashboard card: monitor icon, 18/700 title, explanation, white Open web access button with external-link icon. Opens external browser.
- STUDENT SERVICES uppercase section label; grouped white menu with 80-min-height rows, pale-indigo icon tile, title, description and chevron:
  1. Room details & requests — layout, occupants and availability.
  2. Complaints — submit and follow progress.
  3. Transaction history — recorded payments/adjustments.
  4. Additional food orders — requests and serving dates.
- ACCOUNT DETAILS card: roll number, email, hostel, room; absent data says Not available.
- Red outlined Sign out button with confirmation; small Hostel Management footer.
- Loading spinner, error and Retry coexist with identity/account content. This active screen has no edit-profile form.

### S14. Room details and requests / Blueprint Explorer

- Student header “Room details”, then a deliberately different architectural visual style.
- Large uppercase/italic heavy title “BLUEPRINT EXPLORER”; tiny uppercase subtitle “TAP ROOM TO INITIALIZE BOOKING”; indigo icon block and strong bottom rule.
- Legend: Available deep indigo, Requested green, Full amber.
- Horizontally scrollable building grid inside a four-unit deep-indigo frame; 40 horizontal grid inset. Room cells 85 × 105, square corners, tiny 7–8-point room/type/occupancy labels, muted room-type icons and dark footer strips.
- Room types: Student/bed, Warden/shield, Faculty/laptop, Utility/shower. Other cells: empty, void/cross, walking corridor/dotted border. Unconfigured/live-missing rooms dim to opacity 0.1 and cannot be tapped.
- Dynamic layout supports square, U, L and single shapes; entrance banner can appear top/bottom. No visible floor selector is rendered in the inspected screen.
- Requested cells green with REQD footer; full cells amber; live occupancy/capacity shown.
- Room tap opens centred square-corner modal with heavy four-unit indigo border and dark-indigo tinted backdrop: INDEX label, 32/900 room number, close, scrollable occupants, room class, beds available.
- Occupants: avatar/photo or user icon, uppercase name, roll number.
- Footer states: ACTIVE REQUEST, ROOM FULL, or INITIALIZE BOOKING / REQUEST CHANGE depending on whether student already has allotment. Busy state spinner.
- Initial full-screen loading says “Syncing Blueprint...”. This is the strongest visual inconsistency and has the smallest text in the app.

### S15. Complaints: submission, history and filters

- Student header with back, Complaint Management title, subtitle.
- Four stats in two-by-two grid: Total, Submitted, In Progress, Resolved.
- Submit New Complaint white card:
  - Required subject with leading message icon.
  - Required category: Room Issues, Mess Issues, Facility Issues, Maintenance, Discipline Issues, Other. Selected category has helper explanation.
  - Priority two-by-two choice tiles: Low / Medium / High / Urgent with descriptions and selected radio dot/indigo fill-outline.
  - Required multiline description and helper.
  - Submit Complaint and Reset stacked full-width.
  - Amber Guidelines panel: respectful/factual, specific details, appropriate priority, false complaints may result in action.
- History grouped card: subject, category chip, priority chip, Submitted/In Progress/Resolved/Closed badge, description, submitted/resolved dates, optional green Resolution panel.
- Filter bottom sheet: Status, Category, Priority, subject/description search; Reset Filters and Apply Filters. Applied and draft filters are separate.
- Empty state varies between no history and no matches; Clear all filters if needed.
- Submission progress and native success/error feedback. The long form is placed above history, so existing tickets are below substantial content.

## 8. Warden screens — complete active screen inventory

### W01. Dashboard / Hostel Overview

- Large shared two-row header; “Hostel Overview”, subtitle “Your hostel, at a glance.”
- Alphabetical quick-action rail: Attendance, Bills, Complaints, Gate passes, GPS Attendance, Leaves, Reductions, Rooms, Students.
- Presence Check card with location icon, instruction and Mark My Attendance. Acquiring-location spinner; verified state turns green, shows check and Location Verified.
- This presence check tests distance against a fixed 50 m threshold in screen code and changes local UI; no persistence API is called there. Do not describe it as a completed recorded staff-attendance system.
- Student and available-bed counts in two-column cards; pending leaves and pending complaints are full-width tappable cards, each with coloured icon tile.
- Attendance Trend line chart, 200 high, indigo curve and dots. Existing values are hard-coded Aug 95, Sep 92, Oct 98, and UI explicitly says “Illustrative chart · sample values, not live attendance”. Preserve that label or propose replacing with actual data as a separate feature.
- Pull-to-refresh reloads dashboard statistics. Some fetch failures are console-only; no complete error panel exists.

### W02. Manual attendance

- Shared header, Attendance title, GPS attendance shortcut.
- Indigo explanation: presence does not grant food reduction; use documented reduction approvals; approval-linked attendance is managed through its request.
- Selectable date, search name/roll/room; sort buttons Name / Room ↑ / Room ↓.
- Present all and Absent all actions; guidance explaining draft selection then save.
- Student cards: name, roll number, room or Not allotted, current/draft status; Present / Absent / OD radio-like controls, indigo selected with check.
- Approval-linked rows show locked reduction reference/category/processor instead of editable status controls.
- Bulk actions affect the complete editable roster, including students hidden by current search. Individual draft changes override bulk draft values.
- Save attendance (# changes) and Refresh at bottom; saving state and disabled states. Refresh/date reload clears drafts.
- Loading, load-failure copy and no-matching-students copy.

### W03. Evening GPS Attendance

- Shared header, back-to-Attendance text button, title.
- Before session: explanatory geofence source, Enrolled Students card with refresh; enrollment-year numeric filter, Apply/Clear, total, first six names and +N more.
- Radius input and Duration input. Current app configuration makes initial radius **200 m**; fallback in code is 150 m if no configured radius. Initial duration **20 minutes**.
- Start session obtains/uses configured hostel coordinates or warden live-location fallback as code permits, then displays session.
- Active/closed session card: date, enrollment year, radius, countdown while active. Results card: Present / Absent counts; roster batch card remains.
- Present and Absent result sections, student name, roll, P/A badge and distance when supplied.
- Active session footer Close session; start/close progress states. Closed session results stay visible after closure.
- Active results refresh approximately every 10 seconds; countdown every second while focused.
- This session radius is separate from the dashboard's 50 m local presence check.

### W04. Leave requests

- Shared header; Leave Requests title, Review gate passes shortcut, refreshable detailed-card list.
- Cards: leave type/reference/status, student, reviewer, submission/decision dates, date span, inclusive days, reason, remarks.
- Pending records offer Review request.
- Centred fade modal, dark backdrop, rounded white panel: Process Leave, student/date summary, optional multiline remarks, Reject outlined red and Approve green side-by-side, Close below.
- Processing disables decisions; success/error native alerts. Empty requests and loading states.

### W05. Mess reductions review

- Shared reduction component uses reviewer layout: header, Mess Reductions heading, explanatory rules, status filter, Refresh and detailed request list.
- Cards show category, student/roll, hostel, duration, activity, reason, document, decision metadata and earlier activity.
- Pending/returned: Approve date range, Reject, Return for correction. Approval disabled for legacy or missing-document records.
- Approved nonlegacy records can Cancel approval.
- Decision modal: action/reference/date span; approval attendance consequence; remarks optional for approval, required minimum five characters for reject/return/cancel; Confirm decision / Back.
- Cancellation copy refers to restoring approval-generated attendance and protecting recorded bills. Preserve these consequences in the design.
- Reviewer layout is currently plainer than the student reduction form: some uncontained text/native picker and multiple stacked buttons.

### W06. Gate Pass Approval

- Title, helper distinguishing warden approval from security exit/return recording.
- Search student, roll, destination; native status picker default Pending, with All, Approved, Rejected, Outside, Completed, Late return, Cancelled, Expired; Refresh.
- Detailed cards: student/roll, approver, submission/decision dates, requested exit/return with times, purpose, destination, remarks, actual exit/return when present.
- Pending actions Approve / Reject; centred scrolling decision dialog, optional remarks, Confirm approval/rejection, Cancel.
- Refreshable list, no matches, busy/error feedback. Approval message explains that the student may now show the QR to security.

### W07. More / All sections

- Shared header, More 26/700 title, helper, ten alphabetical white bordered rows.
- Each row: section label 16/600, description 13/19, chevron. It is a stacked directory, not an icon grid.
- Child screens add MoreSectionNav: horizontally scrolling text pills, All sections first, then alphabetical destinations; white background/bottom border, active pale-indigo pill with outline. Buttons minimum 48 high through shared base.
- These children retain Warden bottom navigation, so top identity header, secondary section rail and bottom rail coexist.

### W08. Students

- Manage Students heading, leading-icon search by name/roll, enrollment-year field max four digits, Apply/Clear row.
- Student cards: circular user icon, name, roll, enrollment year, room number/type or orange/warning Not Assigned, chevron.
- Tap opens full-screen sliding Student Details modal with explicit Close; displays name, roll, enrollment year and room assignment.
- This visible modal is read-only, despite “Manage Students” wording. Loading and no-students states.

### W09. Rooms / Room Allotment

- Room Allotment title plus Step 1/3 pill.
- Step 1: available-room cards with room, type, floor, number of spaces, green icon and chevron. Only rooms with spare capacity appear.
- Step 2: selected-room/capacity banner, selected count, search unassigned students, selectable name/roll cards, Back / Next Step. Cannot select beyond remaining capacity; Next disabled with none selected.
- Step 3: Summary card, bed icon, room/floor/type, selected names, Edit / Confirm & Save.
- Loading replaces step content; confirmation saves allotments, alerts and resets flow. Keep selection and summary context visible in redesigned steps.

### W10. Bills

- Generate Bills CTA, summary blocks Total amount/bill count and Pending amount/bill count, bill-card list.
- Cards: student, Pending/Paid/Overdue badge, rupee amount, due date, Mark Paid when unpaid.
- Full-screen Generate Mess Bills modal: title, Amount per day numeric field, Generate.
- Internal month state defaults to current month, but no visible month-selection control is rendered in this screen.
- Current modal has no explicit visible close/cancel control. Summary uses web-style grid class names; native arrangement needs device verification.
- Do not substitute a finished online payment gateway for this staff record/status workflow.

### W11. Complaints

- Shared header and secondary section rail; Complaints title and refreshable detailed cards.
- Cards show subject/reference/status, submitter, assigned person, submission date, description, category, priority, resolved date, resolution. High/urgent priority is emphasized red.
- Unresolved/unclosed cards offer Update status.
- Bottom sheet with unusually large 40-unit top corners, padding 32: Manage Complaint, In progress / Resolved / Closed chips, Resolution Note, Save Changes, Discard.
- Existing resolved/closed cards do not expose Update status. Loading, empty and native alerts.

### W12. Holidays

- Add Holiday CTA; cards with name, formatted date, type, red trash icon.
- Delete uses native confirmation.
- Full-screen Holiday Details modal: Name, manually typed YYYY-MM-DD date, type National / Religious / Institutional, multiline Description, Save.
- Update logic exists, but current list has no visible edit trigger. No explicit close/cancel in the visible modal markup.

### W13. Suspensions

- Red Create Suspension CTA; list cards student, reason, date range or Indefinite.
- Full-screen New Suspension modal: student picker, Reason, manually typed Start Date and End Date, red Create button.
- Remarks exists in state but has no rendered input. No explicit visible cancel/close. Preserve indefinite-end-date context if redesigning.

### W14. Create room / layout editor

- Navigation label says Create room, but page heading says Hostel Layout.
- Current visible controls are a numeric floors input and icon-only Save button.
- Each floor has a horizontal simplified grid of roughly 64-square outlined cells, active pale indigo and empty gray.
- Building type, side room counts and shape settings exist in state/loading logic but are not exposed as editable controls in current JSX.
- Do not show this as a complete named-room/type/capacity creation form without identifying that as added scope. Several layout behaviours are unfinished and need functional review.

### W15. Room layout viewer

- Edit Layout action links to Create room/layout editor.
- Floor labels and horizontally presented 64-square colour cells with small margins. No room identifiers, occupant detail or legend are rendered in this viewer.
- Visually simpler than Student Blueprint Explorer; they are not currently one shared room-map design.

### W16. Enroll student

- Header and section navigation sit inside the scrollable page, unlike most fixed-header screens.
- Step 1: Username, secure Password, Roll Number, Next.
- Step 2: College picker NEC/LAPC; batch admission year numeric max four; gender Choose/Male/Female; matched batch + hostel or No matching batch and gender configured; Requires Bed switch; Back / Enroll.
- Enroll requires an active configured match for year and gender. Backend selects matching session/batch.
- Email is in state but no email field is currently rendered. No prominent visual step counter. On success resets form and returns to step 1.

### W17. Room requests

- Cards: student, pending/approved/rejected badge reused from leave styles, requested room, Process.
- Full-screen Process Request modal: Approve / Reject native picker, multiline Remarks, Confirm.
- No explicit title above main list, no explicit close/cancel in modal. Process appears on every displayed card without a pending-only condition.
- Source imports Picker from react-native rather than the picker package used elsewhere; verify runtime compatibility before treating this modal as tested-working.

## 9. Parent experience

### P01. Parent Portal

- Native title bar “Parent Portal”, then one long pale-background scrolling dashboard with 16 inset.
- White console banner: user icon on pale-indigo tile, “Parent Portal”, small “Monitoring Console”, red logout icon. Logout is immediate here, unlike Warden/Student confirmation.
- Quick actions Attendance, Fees, Notices, Notifications, Refresh, alphabetically sorted. These scroll to sections in the same page, not separate screens. Attendance/Fees both target summary row; actions disable when selected student's data is unavailable/loading.
- Child selector is shown only when more than one mapped student exists; label name + roll.
- Student card: 64-square rounded photo, name, roll, hostel. Fallback image is the configured adaptive-icon asset, not a guaranteed portrait.
- Two summary cards: Attendance percentage and present/total days; Outstanding Dues in red with Unpaid Fees & Mess Bills caption. Attendance calculation here uses API present/total values, not necessarily the exact student P/OD calculation.
- Alerts Feed: up to five notifications, title/message, unread primary text, Acknowledge action for unread; read item loses button.
- Hostel Notices: up to three title/content/date records.
- Loading spinner, “No student mapping found”, or failed-detail guidance to use Refresh. Feed/notices do not have elaborate separate empty panels.
- No native parent payment page, leave-approval page, detailed attendance-history screen, shared inbox bell or bottom navigation exists in this navigator.

## 10. Security experience

### G01. Security Console

- Native title bar “Security Console”; pale scrolling background.
- Console banner: shield tile, “Duty Officer”, “Security Gate Console”, immediate logout icon.
- Quick actions Manual token / Recent scans / Refresh / Scan QR. Recent scans scrolls in page; manual/scan open scanner in different modes.
- Large primary “Scan Student QR” button with 28-unit scan icon and 20-point bold label.
- Three compact summary cards in one row: Outside, Exits Today, Returns. Each about 31% width, icon 20, label 12, count 20.
- Recent Gate Scans grouped card, up to ten records: student, roll, state and localized time; outside uses primary family, other displayed scan states success family. Spinner and No scans recorded today.
- Counts are fetched from today activity and outside lists, not hard-coded sample values.

### G02. Scan Gate Pass — camera mode

- Native title bar above black camera screen.
- Live camera fills available content. Centred 256-square white two-unit outline with rounded-24 corners; instruction in white on translucent black pill below.
- Bottom white rounded card “Manual Token Fallback”, token input and Verify button; remains visible over camera.
- Requests camera permission. Pending permission: spinner and copy. Denied: explanatory copy, Grant Permission button and a manual verification form.
- Camera scans QR types. It releases when screen loses focus; scanning blocks duplicate processing and routes to verification result.
- This scan request performs gate-pass processing/recording; do not design an additional mandatory confirmation as if it already exists.

### G03. Scan Gate Pass — manual mode

- Can open directly from Manual token without camera permission.
- White card: Manual verification, explanation, verification token field, Verify token, Switch to camera.
- Token field does not autocapitalize. Empty-token native error, submitting spinner, server failure handling.

### G04. Verification Details

- Pale page, 24 inset, top outcome and bottom Back to Console button.
- Success: 80-unit green check, server message or Verification Successful, 24-point heavy centred label.
- Failure: 80-unit red cross and server/error text or Verification Failed.
- Late return adds prominent red “Late Comer” banner with warning icon.
- If data includes student: white detail card with 64-square photo/user fallback, name, roll, hostel/unit, purpose, destination, expected return. Return records add Time Variation with early/late duration or Right on time.
- No data on failure can mean the student card is absent. Do not fill it with invented student details.
- The result page is not scrollable in current source; long content and small screens require redesign validation.

## 11. Existing but currently unconnected screens/components

Search of the mobile source found no navigator imports or consumers connecting the following to current active flows. They must not be mistaken for current main destinations.

| Existing source | UI content | Current limitation |
| --- | --- | --- |
| StudentProfileScreen | Older portrait/name/email/role card; personal-info edit icon; hostel room/address/contact information | Not current Profile tab. Edit state/handler exist, but rendered fields remain static and no save/edit form is exposed |
| ViewBillsScreen | Month selector; total/paid/pending/overdue cards; today's attendance; bill list; payment instructions | Not active Mess destination. Pay Now and Receipt only trigger integration-required placeholder alerts |
| FacilityUsageScreen | Two-column facility catalogue; type/status/capacity/hourly cost; usage history; duration/remarks modal with estimated cost and Record Usage | No current navigation entry. If retained, identify as a proposed reconnected feature |
| Warden AttendanceSummaryScreen | Plain Today Attendance / Present / Absent text | Unconnected placeholder with literal YOUR_IP/YOUR_TOKEN endpoint; not a validated live summary |
| RoomGridCell | Alternate rounded room card, capacity, full and request status | Unused by current Blueprint Explorer, which renders its own cells |
| RoommatesList | Rounded roommate rows, photo/initial, name/email, empty copy | No current consumer found |
| StudentCard | Selectable student row, roll, user/bed icon | No current consumer found |
| StudentPicker | Minimal native student dropdown | No current consumer found |
| DatePickerModal | Small native date-picker bottom modal with Cancel/Done | No current consumer found; active screens use DateRangeField or other native picker components |

AttendanceManagementScreen is only a re-export of AttendanceRecordsScreen; it is not an additional independent screen design.

## 12. State dictionary for Figma variants

| Domain | States that need distinct readable treatments |
| --- | --- |
| Attendance | Unmarked, Present P, Absent A, On duty OD, Holiday H, approved-reduction locked, draft selected, saving, saved |
| GPS session | No active session, loading, start setup, acquiring location, active countdown, marking, marked present/absent, permission denied, location error, closed results |
| Leave | Empty application, validation error, submitting, Pending, Approved, Rejected, history empty, filtered empty, detail modal |
| Reduction | New, revision, file absent/selected/oversize/invalid, Pending review, Approved, Rejected, Needs correction/Returned, Cancelled, Legacy, decision dialog, earlier audit expanded |
| Gate pass | No active pass, Request, Pending approval, Approved with QR, Outside with QR, Completed, Rejected, Cancelled, Expired, Late return |
| Food item | Available, cutoff closed, unavailable at submit, no matching category, loading, date invalid/weekday mismatch, quantity invalid/limit, confirming |
| Food fulfilment | Pending, Confirmed, Preparing, Ready, Delivered, Cancelled |
| Food payment | Pending, Paid, Refunded, No payment due, Unknown; separate from fulfilment |
| Bills | Pending, Paid, Overdue, no data; charge statement is distinct from payment state |
| Transactions | Completed, Pending, Failed, Cancelled; payment/refund type and signed amount |
| Complaint | Submitted, In progress, Resolved, Closed; separate Low/Medium/High/Urgent priority and category |
| Rooms | Available, Full, Requested, unconfigured/inactive, occupied, occupant loading, request/change pending, allotment steps and capacity limit |
| Account | Loading app, signed out, authentication error, unsupported role, image fallback, missing room/details, logout confirmation |
| Notification | Zero/unread badge, 99+, All/Unread filter, unread/read card, detail, loading, error/retry, empty/caught up, loading more, mark-all-read busy |
| Security scan | Permission request, permission denied, camera ready, manual entry, empty token, verification pending, success exit, success return, late return, failure with/without person |
| Parent | No mapped student, one student, multi-student selection, loading selected child, unavailable child data, unpaid dues, unread/acknowledged alert, empty notice/feed |

Do not imply every screen currently provides all ideal offline, error or validation variants. Preserve the states that exist and explicitly propose missing feedback states.

## 13. Source-grounded problems and recommended improvements

The following are design findings and proposals, not changes already made.

### Priority 1: navigation and trustworthy hierarchy

1. **Clarify Attend versus Workflows.** The bottom tab is Attend, but destination contains leave, reductions and passes and is titled Workflows. Use consistent naming or a clearer service hub. Annotate any information-architecture change and retain the four existing workflows.
2. **Reduce Warden navigation search.** Six destinations scroll horizontally, including a long Gate Pass Approval label; hidden options require swiping. Explore a stable compact set plus a comprehensive More area, or a clearly labelled role menu. Show how every existing task remains reachable.
3. **Reduce stacked navigation chrome.** Warden More children combine tall identity header, horizontal secondary menu and bottom rail. Design a compact contextual header/back route while preserving account access.
4. **Show the next useful action.** Alphabetical quick actions do not reflect urgency. Consider primary tasks and pending approvals first while keeping complete discoverability.
5. **Keep operational states separate.** Attendance, approved food reduction, fulfilment, payment, pass approval and gate movement are different. Use explicit labels and distinct components rather than making a single coloured status carry multiple meanings.

### Priority 2: consistency, readability and forms

6. Unify both Student and Warden headers with contextual title, notification/account access and consistent back behaviour. Avoid duplicate large page headings under an already descriptive header unless hierarchy requires them.
7. Replace “Heading” in request cards with a useful reference/request label. Standardize “Gate pass” versus “Outpass” and humanize underscore status values.
8. Bring Blueprint Explorer into the shared design family. Replace 7–10-point uppercase labels with readable room numbers, occupancy and status. Preserve building topology but offer usable scrolling/zoom or a list alternative; these controls are proposals, not present features.
9. Standardize radius, spacing, section heading, icon size and card density. Keep one intentional feature-card treatment rather than unrelated geometry per screen.
10. Give all fields persistent labels, required/optional markers, input hints, error text and relevant numeric/email keyboards. Use date controls instead of typed date strings in old management forms.
11. Give every modal explicit close/cancel, safe-area padding, keyboard-safe scrolling and consistent primary/secondary footer actions. Old bill/holiday/suspension/room-review modals need this most.
12. Improve long complaint form/history separation so returning users can find tickets quickly. Keep submission, history and priority context intact.
13. Use progressive disclosure for approval metadata without hiding student, dates, reason, supporting evidence or consequences.
14. Normalize date/currency presentation, including visible IST when deadlines or exit/return timings matter. Fix cross-year calendar navigation and expose an understandable billing-period control.
15. Keep financial total, breakdown, base days and approved reduction visible; avoid replacing detailed statements with an unexplained total or unsupported Pay Now CTA.

### Priority 3: feedback, access and branding

16. Add consistent loading, recoverable inline error, empty, refresh and submission-confirmed treatments. Several existing screens only log fetch errors or use transient native alerts.
17. Make draft attendance obvious and show unsaved-count/save context. Warn about draft loss on date reload/refresh as a proposed improvement; the existing code currently clears drafts.
18. Use text/icon/pattern alongside status colour. Current calendar cells especially rely on colour. Ensure distinguishable Present/OD and Pending/Full states.
19. Support larger system text and long names, roll numbers, room labels, error messages and rupee amounts. Test three-column security cards and small-screen approval buttons.
20. Maintain minimum 48-unit actionable targets as a project design target; audit existing smaller raw icon/text interactions. Do not claim current universal accessibility compliance.
21. Replace generic launcher branding with a proper supplied/approved app icon; retain the college crest correctly without stretching. Show splash/launcher treatment as a proposal until assets are verified/replaced.
22. Make QR presentation high contrast and easy to show at a gate; give camera/manual verification and result screen reliable layouts in short viewports. Do not invent offline pass validation.
23. Preserve a visibly secondary external Web dashboard route; avoid implying browser account access is automatic sign-in.
24. Keep Parent dashboard calm and readable, with child selection and clear dues/attendance context. Keep Security focused on fast, unmistakable scan outcomes.
25. Avoid treating sample attendance trend as real analytics or online payment/profile editing as implemented. Label proposed feature additions separately.

## 14. Recommended Figma file structure and deliverables

These frame sizes and deliverables are recommendations, not existing configured device dimensions.

### Pages

1. **00 Readme & scope** — current-source basis, roles, assumptions, existing-versus-proposed markers, user journeys.
2. **01 Foundations** — colour variables, semantic status pairs, spacing, type, grid, radii, shadows, safe areas, icon rules.
3. **02 Components** — headers, bottom navigation, secondary navigation, cards, summary tiles, quick actions, form controls, date range, badges, lists, dialogs, bottom sheets, notifications and feedback.
4. **03 Authentication & fallback** — login and unsupported-role states.
5. **04 Student** — all S01–S15 screens and related states.
6. **05 Warden** — all W01–W17 screens and related states.
7. **06 Parent** — P01 variants and alerts/child selection.
8. **07 Security** — G01–G04 camera/manual/results.
9. **08 Prototypes & edge cases** — linked end-to-end journeys, small-screen and large-text checks.
10. **09 Proposed / legacy decisions** — dormant facilities/profile/bills screens, any restored features and added capabilities clearly separated.

### Frame and component requirements

- Start with a primary portrait frame such as 390 × 844; also validate approximately 360-wide Android and 430-wide layouts. Use actual safe-area guides rather than baking one device's status bar into app components.
- Create tablet rules only as an explicitly scoped extension; existing configuration declares tablet support but does not define a bespoke tablet layout.
- Use Auto Layout, consistent content hugging/filling, reusable variables and component variants. Long text should wrap predictably; primary action labels must stay readable.
- Variant properties should include role, selected state, status, emphasis, disabled/busy, icon/no icon, empty/error, back/no back, form/history mode and evidence availability where relevant.
- Model sticky header/footer intent separately from scrolling content. Show keyboard-open form variants and modal scrolling; avoid placing required confirmation below inaccessible overflow.
- Include realistic clearly fictional sample data: long student name, roll number, hostel/room, rupee total, returned/rejected reason, unavailable room and expired pass. Do not use real student personal data from a live database.
- Annotate which components are shared across roles versus intentionally specialized for gate security or parent monitoring.

### Prototype journeys

- Login → Student Home → Leave request → submitted → leave history → details.
- Student → documented reduction → choose category/dates/evidence → submit → returned with remarks → edit/resubmit → approved history.
- Student → gate-pass request → pending → approved QR; Warden approval and Security exit/return result frames connected as separate role contexts.
- Student → Additional Food → filter/search → Add → correct serving date/quantity → Confirm → history → cancellation with correct payment status.
- Student → monthly charges → daily breakdown → transaction history.
- Student → room availability → occupants → room request or change request.
- Student → complaint → history → resolution; Warden update flow as separate role context.
- Warden → manual attendance → whole-roster bulk draft → search/override → Save, including locked reduction row.
- Warden → GPS setup → active countdown/results → close session → closed results.
- Warden → room allotment all three steps and enrollment both steps.
- Parent → switch child → summary → acknowledge alert → notices.
- Security → camera permission denied → manual token → success/failure/late return → console.
- Notification bell → unread list → detail → back → mark all read / empty caught-up state.

### Acceptance checklist

- Every current reachable role screen and important modal is represented.
- All four Student workflow segments and Warden More destinations remain discoverable.
- Existing business restrictions and financial meanings are preserved.
- Current, sample, dormant, incomplete and proposed capabilities are clearly identified.
- No sample chart is presented as live; no payment/refund state is inferred from fulfilment alone.
- Every decision/submission has clear progress, disabled, success and failure treatment in the proposed design.
- Long text, small screen, keyboard and safe areas have review frames.
- All destructive dialogs have explicit escape and consequence language.
- Updated identity retains the supplied college crest correctly.
- Final handoff includes navigation map, tokens, component specifications, interaction notes and a short explanation of proposed changes.

## 15. Source map for implementation handoff

All paths are relative to repository root `D:/PROJECT/Hostel_Management/hsotel-management-mern`.

| Area | Main source |
| --- | --- |
| Runtime/configuration | `mobile-app/App.js`, `mobile-app/app.json`, `mobile-app/package.json` |
| Role routing | `mobile-app/src/navigation/AppNavigator.js` |
| Student routes | `mobile-app/src/navigation/StudentTabNavigator.js` |
| Warden routes | `mobile-app/src/navigation/WardenTabNavigator.js`, `mobile-app/src/screens/warden/MoreScreen.js` |
| Parent / Security routes | `mobile-app/src/navigation/ParentNavigator.js`, `mobile-app/src/navigation/SecurityNavigator.js` |
| Tokens / utility remapping | `mobile-app/src/theme/colors.js`, `mobile-app/tailwind.config.js` |
| Authentication / fallback | `mobile-app/src/screens/LoginScreen.js`, `mobile-app/src/screens/WebAccountScreen.js` |
| Shared UI | `mobile-app/src/components/common/` |
| Student shell | `mobile-app/src/components/student/StudentHeader.js`, `StudentTabBar.js`, `StudentPresentation.js` |
| Student screens | `mobile-app/src/screens/student/` |
| Warden screens | `mobile-app/src/screens/warden/` |
| Shared reductions | `mobile-app/src/screens/MessReductionsScreen.js`, `mobile-app/src/components/common/ReductionRequestCard.js` |
| Parent screen | `mobile-app/src/screens/parent/ParentDashboardScreen.js` |
| Security screens | `mobile-app/src/screens/security/` |
| Food rules and payment labels | `mobile-app/src/utils/additionalFood.js` |
| Branding | `mobile-app/assets/nec-logo.png`; configured launcher/splash assets in `mobile-app/app.json` |

This audit describes the current source and inspected image assets. It does not claim a runtime visual audit, live-backend test, device accessibility certification, or that the proposed improvements have been implemented.
