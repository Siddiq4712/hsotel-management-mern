Activity logs
=============

Open Admin workspace > Activity Logs, or /activity-logs?workspace=admin.
History begins when this feature is enabled. Existing records are not presented
as past activity. All hostels appear in the same table. Search staff names,
student names/roll numbers, record descriptions, or route names. Filter by date,
workspace, actual actor role, effective status, and activity type. Export current
page produces a CSV containing the displayed activities.

View opens the operation's record changes, before/after comparisons, notification
delivery attempts, and linked corrections/reversals. Large operations load changes
in batches of 100; the table paginates those loaded changes. Expand a record to
inspect its complete recorded values. Timestamps are displayed in IST.

Correct supports catalog fields and editable income/expense fields. Delete record
supports editable income/expense records. Other records link to their existing
management screen where available. All corrections/deletions require a reason and
an unchanged-record fingerprint. No endpoint edits or deletes original audit rows.

Revert first previews every affected record. The server checks the preview again
under record locks, orders related restores/deletes by foreign-key dependencies,
and applies the entire operation in one transaction. A linked reversal entry and a
unique duplicate-reversal guard are committed with the changed records. Failures
roll back the reversal and its change rows. Failed attempts remain identifiable.

Automatic reversals cover supported catalogs, manual/monthly attendance, room
allotment records, linked unpaid meal orders/fees, and inventory changes when their
current state and dependencies still permit reversal. Enrollment is reversible only
for remaining-dues changes linked to fees. Later recorded actions, changed rows,
dependent records, settled fees/payments, protected imported August statements,
and months with bills block automatic reversal. Credential/account, gate/outpass,
finalized bill, and unregistered model workflows require dedicated corrections.
Corrections/reversals cannot themselves be automatically reversed.

Tracking implementation
-----------------------

Authenticated Admin/Warden/Mess requests receive an AsyncLocalStorage context with
the actor loaded from the database. Admin's selected workspace is a display label;
it never changes the actor or authorization. Model write interception captures
create/save/update/delete/bulk/upsert/increment/decrement operations. Linked writes
share one operation ID. Declared database cascade deletes/set-null changes are
captured with their parent operation. Writes without their own transaction receive
a managed transaction; snapshots and business changes use the same transaction.
The separate operation envelope records attempted actions even when changes fail.
Interrupted requests are marked partial/failed at the next backend startup.

Credentials, tokens, OTPs and virtual/association fields are excluded from snapshots;
structured JSON is recursively redacted. Notifications use ActivityDelivery without
storing message bodies. Activities attempting external email are blocked from
automatic reversal because a delivered message cannot be recalled. This feature
does not send notifications when a record is corrected or reverted.

Audit tables are created by the existing startup sync, without altering existing
business tables. Keep model-based writes in application code: direct SQL writes,
external database edits and scripts outside authenticated request contexts are not
captured. Add policies and tests before enabling automatic reversal for new models.
Policy, delivery and version checks are repeated server-side, regardless of UI state.

Verification
------------

node --test scripts/activity-values.test.mjs (backend)
node scripts/check-activity.mjs (backend, local database, rollback-only)
npm test -- --run src/components/admin/ActivityLogs.test.jsx --maxWorkers=1 (frontend)
npm run build (frontend)

The integration check covers capture, corrections, batch attendance, linked meals,
stock increments, cascade restoration, dependency/paid-period/historical guards,
and forced mid-reversal/audit failure. It rolls back business changes and removes
only its own test operation envelopes. It sends no emails.
The integration script expects the local HOSTEL 2 sample students and the protected
August 2026 import already used by this project.
