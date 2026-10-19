Notifications
=============

Every authenticated account uses the bell in the common header: Admin, Warden,
Mess, Student/LAPC, Parent, Security, and other authenticated roles. The badge shows
the account's real unread count. The drawer provides All/Unread filters, paginated
history, full-message details, individual read, mark-all-read and retry/refresh.
It refreshes every 30 seconds while the browser tab is visible and when it regains
focus. It does not request browser notification permission or enable bulk email.

The shared API is authenticated and always derives the owner from the verified
account. Client-supplied user IDs cannot select or modify another user's inbox:

GET   /api/notifications?status=all|unread|read&page=1&pageSize=20
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all  { throughId: <last fetched ID> }

The read-all cutoff keeps alerts arriving after the displayed snapshot unread.
Existing parent notification routes continue to use the same stored inbox.

Automatic events
----------------

* Requests and decisions: leave, complaints, room requests, day reductions, rebates.
  The student, linked parents, and responsible Warden/Admin receive relevant alerts.
* Outpass: submission, approval, rejection, cancellation, gate exit and return.
  Linked parents receive their child's updates. Security receives approval and
  cancellation alerts for its hostel, or globally for unassigned gate staff.
* Manual/GPS attendance, room allotments and suspensions: affected students and linked parents.
* Monthly attendance imports: Warden/Admin receive the import summary.
* Student fees and mess bills: affected students and linked parents receive charges,
  payment/status changes and removals. Staff special meals use the linked fee alert.
* Food orders: the student/parents receive status updates; Mess receives new requests.
* Low stock: Admin and the hostel's Mess staff are alerted on entering the low-stock
  threshold; further decreases below that threshold do not repeat the alert.
* Purchase-order status: Admin and the responsible Mess staff.
* Hostel notices: active users in that hostel, linked parents and responsible staff.
  Global notices reach all active accounts.
* New active accounts: a personal welcome notification confirms that the inbox is active.

Admin receives appropriate alerts across hostels. Warden/Mess routing uses their
assigned hostel; a workspace switch does not change identity or notification ownership.
No earlier activity is replayed and no test announcements are left in user inboxes.

Persistence
-----------

The existing InAppNotification table stores messages. NotificationDispatch stores
per-recipient event receipts for deduplication. Both are written in the same database
transaction as the business change. Rollbacks discard their alerts. Authenticated
request context feeds the model-write interceptor for all roles, while business audit
history continues to cover staff activity. Read/unread changes and notification
delivery are excluded from business audit snapshots and automatic notifications.

Corrections/reversals produce a new notification labeled Correction/Reversal when
applicable; they do not erase messages already read. No email is sent by this service.
Existing separately configured billing email flows retain their existing behavior.
Scripts outside authenticated request context do not broadcast alerts automatically.

Checks
------

Backend: node --test scripts/notification-api.test.mjs
Database: node scripts/check-notifications.mjs (requires the local sample hostels;
all fixtures, business changes, inbox messages and dispatch receipts are rolled back).
Frontend: npm test -- --run src/components/common/NotificationBell.test.jsx --maxWorkers=1
Build: npm run build
