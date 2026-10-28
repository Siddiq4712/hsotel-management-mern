# Role screen permissions

Open **Admin workspace → Settings → Screen Permissions** (`/screen-permissions?workspace=admin`). Columns are roles; there are no individual account overrides. Existing LAPC account roles are normalized to Student by the backend and inherit the Student permission column. College affiliation remains separate from access roles.

Choose Hidden, View, Manage, or expand a row for custom actions. Enabling any action automatically enables View; clearing View clears the row's other actions for that role. Admin access is protected. Unsupported role/screen combinations are not editable.

Search screens or filter a module, choose a role and access level, then use **Apply to draft** for a bulk change across all matching screens, including other pages of results. **Review & Save** shows before/after values and affected active accounts. A reason is required. **Discard Changes** restores the last loaded configuration; resetting a role loads its original defaults into the draft. History shows the administrator, timestamp, reason, revision and changed permissions. Preview-as-role and restoring historical revisions are future enhancements.

## Enforcement

- `shared/roles.js` normalizes legacy LAPC account and token roles to Student. Student permissions apply to both, and old LAPC permission overrides are ignored.
- `shared/permissions.js` defines capabilities, actions, supported roles and web aliases.
- `shared/permissionRoutes.js` maps actual API URLs/methods to capabilities. The API never trusts a caller's screen name or workspace header to authorize a request. Unrecognized resources in the student, warden and mess areas are denied to non-admin roles.
- `backend/middleware/auth.js` runs permission enforcement after authentication. Existing role checks, hostel assignment checks, record ownership checks and workflow-specific rules still apply. This feature restricts existing workflows; it does not make a student account compatible with staff screens.
- Some enabled forms need read-only supporting lookups, such as the student roster for attendance and stock for consumption. These dependencies allow the required reads without granting writes or making the directory screen visible.
- Tabs that operate on the same records share one row. This includes inventory tabs, menu planning tabs, and mess/bed/paper billing. This prevents a hidden tab from becoming an alternate way to edit the same records.
- Export permissions control application export/print actions and server export endpoints. They cannot prevent a person with View access from copying information already displayed or using their browser's own print function.
- Web navigation, page guards, annotated action controls and dashboard shortcuts consume the shared policy. Mobile screens have guards, filtered navigation and annotated action controls; the API also protects older clients. Changes to the mobile interface require distributing the updated app bundle through the project's usual release process.
- Permissions refresh on focus/foreground, after a denied action, and every minute while visible. Backend checks read the policy on each request, so revocations apply to subsequent requests immediately. Requests already in progress may finish.

## Storage and startup

The normal API startup synchronizes `tbl_PermissionPolicy` and `tbl_PermissionHistory` and initializes the policy once with current-role defaults. Later starts preserve saved settings. Newly introduced capabilities default to Hidden in an existing policy until an admin enables them. No account role or hostel assignment is changed by editing the matrix.

Policy saves lock a singleton row and compare the submitted revision. Policy and history changes commit together; stale saves return HTTP 409. A policy lookup failure denies feature requests with HTTP 503 instead of silently granting access.

## Checks

From `backend`:

```powershell
node --test scripts/screen-permissions.test.mjs
node scripts/screen-permissions.integration.mjs
node scripts/screen-permissions.http.mjs
```

The integration check uses two process-specific test tables in the configured MySQL database and drops only those tables. It verifies persistence, concurrent-save conflicts and audit-failure rollback without changing the live policy.

From `frontend`:

```powershell
npx vitest run src/components/admin/ScreenPermissions.test.jsx src/components/common/PermissionControls.test.jsx --maxWorkers=1
npm run build
```

The Android export verifies bundling and shared imports; device behavior still needs a device or emulator check.
