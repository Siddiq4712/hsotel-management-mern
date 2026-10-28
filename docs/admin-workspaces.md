Admin workspaces
================

Sign in as Admin and use the Workspace dropdown in the top bar to choose Admin,
Warden, or Mess. The sidebar and dashboard use the existing portal components.
Switching workspaces does not change the account, token, or audit identity.

Admin Warden pages have a visible Hostel scope bar. All hostels supports browsing;
choosing one hostel filters lists and supplies that hostel for new entries. The
selection is remembered within the browser session. Attendance marking and hostel
layouts require a single hostel. Enrollment continues to follow each batch's
configured hostel rather than overriding it with the browsing selection.

Inventory-based Mess pages have the same scope bar with an Inventory selector and
the names of all supplied hostels. Reports place month and refresh controls beside
the inventory selector. Shared inventory entries do not require a second hostel.
Shared master pages keep their existing system-wide scope.

Actions on an existing student, room, menu, fee, or other record derive the hostel
from that record. A conflicting entry hostel is rejected before the action runs.
Related records in a single entry must belong to the same hostel.

The scope bar warns before discarding an unsaved draft and prevents switching
while a registered save is in progress. Existing record ownership takes priority
over the browsing selection. When an older flow has neither a selected scope nor
an existing record to identify its hostel, the per-entry hostel dialog remains a
fallback. Cancel saves nothing. Ordinary staff retain their assigned scope.

Shared catalog data, such as units, item categories, items, stores, sessions, and
special dishes, stays shared. Regular Warden and Mess accounts retain their
existing assigned-hostel behavior.

Hostels in a shared inventory billing group use its combined daily rate; each
student's bill retains that student's billable days and individual charges.
Historical imported statements retain their source amounts and rounding. Excel
exports include the existing report sheets with hostel IDs in their sheet names.

Verification: backend workspace permission, aggregation, scope inference, and
write-gate tests; frontend workspace selection and request retry/cancel tests;
production build; authenticated live API checks. Finalization/email actions are
not used during verification.
