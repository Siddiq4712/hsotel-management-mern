Admin workspaces
================

Sign in as Admin and use the Workspace dropdown in the top bar to choose Admin,
Warden, or Mess. The sidebar and dashboard use the existing portal components.
Switching workspaces does not change the account, token, or audit identity.

Warden and Mess lists include records from every hostel in the same screen.
Actions on an existing student, room, menu, fee, or other record derive the hostel
from that record. A conflicting entry hostel is rejected before the action runs.
Related records in a single entry must belong to the same hostel.

When a new entry has no record from which to determine its hostel (for example,
a stock purchase), a Hostel for this entry dialog appears before saving. Its
selection applies only to that request. Cancel saves nothing. Layouts also require
a local hostel choice because each blueprint belongs to one building.

Shared catalog data, such as units, item categories, items, stores, sessions, and
special dishes, stays shared. Regular Warden and Mess accounts retain their
existing assigned-hostel behavior.

Each student's report retains the calculation for that student's hostel. The
combined rate card is an average for reference; it does not recalculate the rows.
Historical imported statements retain their source amounts and rounding. Excel
exports include the existing report sheets with hostel IDs in their sheet names.

Verification: backend workspace permission, aggregation, scope inference, and
write-gate tests; frontend workspace selection and request retry/cancel tests;
production build; authenticated live API checks. Finalization/email actions are
not used during verification.
