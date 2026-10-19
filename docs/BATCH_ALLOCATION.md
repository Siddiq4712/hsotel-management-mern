# Batch and hostel allocation

Administrators configure batches in **Manage Batches**. Enter the start and end
years, a numeric roll number prefix, and one active hostel. The batch name is
generated from the years. A hostel can hold several batches. Prefixes cannot
duplicate or overlap another prefix, including an archived batch's prefix.

For example, prefix `24` on batch `2024-2028` matches roll number `24104085`.
Admission, Excel import and ERP synchronization use this match as the authority
for the student's batch and hostel. Imported batch IDs and source batch labels
cannot override it. Wardens can admit only students assigned to their own hostel;
administrators can import a mix of batches assigned to different hostels.

Existing sessions remain in the same database table with their original IDs.
The migration adds nullable `roll_prefix` and `hostel_id` columns and a unique
prefix index. Legacy entries display **Needs setup** until configured. Database
column names and existing `/sessions` API routes remain compatible; academic UI
labels use Batch. GPS attendance and login sessions retain their own terminology.

After saving a batch, use **Review Batch Allocation**. Search or filter the
preview, select ready rows, and apply their changes. A preview token rejects
stale updates. Unmatched rolls, multiple active enrollments and rooms in another
hostel are conflicts and cannot be applied. An active room must be vacated before
moving its student to another hostel.

Allocation updates the user's current hostel and active enrollment's batch and
hostel. It preserves enrollment dates, bed eligibility, remaining dues, historical
attendance, fees and mess bills. Archiving a batch with active residents is blocked.

**Manage Hostels → Assign Batches** adds configured, unassigned batches to a hostel.
Batches owned by another hostel are disabled. Move one by editing its assigned
hostel in Manage Batches, then reviewing the affected student allocations.

Checks (run from the indicated directory):

```powershell
# backend
node --test scripts/batch-allocation.test.mjs
node scripts/batch-allocation.integration.mjs
# Local seeded example required; synthetic ERP responses, read-only DB checks:
node scripts/batch-erp-preview.test.mjs

# frontend
npx vitest run src/utils/batchMatching.test.js src/components/admin/ManageBatches.test.jsx --maxWorkers=1
npm run build
```

The integration test rolls its fixtures back and checks single admission,
mixed-hostel import, stale previews, role scope and financial history preservation.
