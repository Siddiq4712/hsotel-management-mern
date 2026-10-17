# Attendance and approved mess reductions

Students request an inclusive start/end date range with a category, reason, and supporting PDF, PNG, or JPEG (maximum 5 MB).

| Category | Evidence | Attendance written on approval |
|---|---|---|
| Medical leave | Doctor’s prescription | A (Absent) |
| OD: NSS/NCC camp, college participation, etc. | OD letter | OD |
| Internship | Offer letter | OD |
| Study holiday | Tutor-signed reduction letter | A (Absent) |

The assigned hostel warden or an admin can make the final decision. Admins can review all hostels. There is no required admin-then-warden sequence. Pending requests are labeled “Pending review”; the stored `pending_admin` value remains compatible with existing records.

## Request lifecycle

- Submit → pending review → approve, reject, or return for correction.
- Returned, rejected, and pending requests may be edited/resubmitted by their student. Supporting evidence remains mandatory.
- Either reviewer can cancel a modern approval with a reason while its billing periods remain open. The original attendance snapshots are restored and the date entitlements are deactivated.
- Students can cancel their pending/returned requests. Students cannot cancel approved entitlements.
- Decisions, actor, role, timestamps, remarks, and prior request values are retained. Supporting documents are stored privately under `backend/private/reductions/`; access requires the owner, their hostel warden, or an admin. Include this private directory in server backups and persistent deployment storage. It is excluded from Git and is not served as a public static directory.
- Approval, attendance changes, date entitlements, decision history, and saved-rate invalidation share one transaction. Requests for one student are serialized. Overlapping active requests are rejected rather than counted twice.

## Attendance

Daily attendance and GPS records track presence. Marking A or OD manually does not grant a food reduction. Approval writes the category’s A/OD status to every date in the requested inclusive range, including dates outside the billing calendar. The food calculation counts only eligible operational dates.

Daily attendance uses boxed Present, Absent, and OD choices. Individual web changes are saved with Save attendance. Present all and Absent all save immediately for the entire selected hostel roster and date, including students hidden by search or pagination. Approval-linked entries are skipped and remain locked. The mobile screen provides the same bulk buttons and boxed single-student choices.

Approval-linked daily records show the request and approver and cannot be manually overwritten. Raw GPS records remain intact. Monthly imports remain separately identified aggregate attendance records; they never create reduction entitlement or fictional daily attendance. The legacy spreadsheet `Mess Days` column is retained for import compatibility and is explicitly labeled as attendance-only in the interface. The unrestricted month-end reduction endpoint returns HTTP 410.

## Food billing

**Billable food days = eligible operational days − unique approved operational reduction dates.**

The calendar uses the hostel’s `Holiday` entries. Eligibility is bounded by recorded academic-session dates and active hostel enrollment. Enrollment creation timestamps, which may be import timestamps, are not fabricated as historical joining dates.

Food rates, monthly reports, exports, fee breakdowns, student charge views, and bill generation share the same calculation. A and OD attendance entries, ordinary leave approvals, outpasses, monthly attendance totals, and legacy manual rebates are not reduction entitlements.

Only food charges receive reduction. Explicit water fees are unchanged. Water operating expenses are excluded from the food daily rate and allocated using base operational days when no explicit water fee exists. Bed fees, newspaper, special meals, and other explicit charges retain their recorded amounts. Reports show base, approved-reduction, and billable days.

The first modern bill generation freezes the hostel/month calculation and complete report. Later college-filtered generation uses that snapshot and skips existing bills. It does not overwrite paid or pending bills. Modern student bills also save their individual breakdown. Changes to enrollment or expenses cannot rewrite a finalized calculation.

## Existing records and activation

- New rules apply to open billing periods. Imported August 2026 source statements retain their original rates, totals, and rounding.
- Existing bills without a modern snapshot retain their recorded final amounts. Missing historical category, evidence, daily dates, or detailed charge breakdowns are not invented. Such rows are marked as legacy/unavailable.
- Legacy reduction requests must be resubmitted with category and evidence before they can grant a new entitlement. They are not silently treated as newly documented approvals.
- Approval or cancellation affecting a month with recorded bills is blocked and requires a separate financial adjustment. No existing bills are automatically regenerated.
- Legacy day-based rebate decisions are read-only. Student rebate links use the documented reduction workflow.

## Database upgrade and verification

From `backend`:

```powershell
node scripts/migrate-reductions.mjs
node --test scripts/reduction-rules.test.mjs scripts/historical-billing.test.mjs
node scripts/reduction-workflow.integration.mjs
```

Startup also runs the additive schema upgrade before ordinary table synchronization. It adds request metadata, attendance linkage, individual bill breakdowns, reduction-date/decision tables, and the monthly billing-snapshot table. It does not run a blanket `sync({ alter: true })` or rewrite legacy records.

The integration check creates synthetic fixtures inside one transaction, uses savepoints for requests, rolls back every database row, removes its private test documents, and sends no emails. It covers scope, evidence, both authorities, inclusive dates, overlaps, holiday exclusion, unchanged water charges, attendance restoration, consistent reports/student views, snapshots, and legacy bill preservation.

From `frontend`: `npm test -- --run` and `npm run build`.

The workflow UI tests and sign-in smoke test pass. The wider suite also exposes three unchanged enrollment bulk-import assertions in `bulkImportUtils.test.js` that still expect the pre-pull column/payload contract; this feature does not change that import implementation.

Mobile dependencies are pinned to the existing [Expo SDK 54 module versions](https://github.com/expo/expo/blob/sdk-54/packages/expo/bundledNativeModules.json). The mobile application adds document selection and authenticated document download/opening. Validate the native document picker and opening flow on a device before distributing a new native build.
