# Batch and hostel allocation

Administrators configure batches in **Manage Batches**. Enter the start and end
years and one active hostel. The start year is the ERP admission-year matching
key: ERP `batch = 2024` maps to the configured `2024-2028` batch. Each admission
year has one batch and hostel; a hostel can hold several admission years.

Allocation uses the student's explicit ERP `batch` value, not the roll number.
For example, even a roll beginning with `23` belongs to `2024-2028` if ERP says
`batch = 2024`. Missing, invalid and unconfigured years are flagged, with no
prefix or latest-batch fallback. The end year is explicitly configured and can
represent four-year or other academic durations.

Manual admission requires **Batch Admission Year**. Excel imports require a
**Batch** column containing the admission year; the downloadable template includes
it. ERP normalization preserves the original year and maps `studentName`,
`registerNumber`, `studentId`, `Userid` and `personal_email` from the source schema.
ERP IDs remain distinct from local login-user IDs. Preview and sync resolve the
configured year, and wardens process only students assigned to their own hostel.

The warden student roster reads saved local enrollments by default. Explicit
`GET /api/warden/students?source=erp` fetches ERP candidates filtered by their
configured batch's hostel; ERP synchronization previews list unmatched years.
Gender and hostel names do not determine batch allocation.

In **Manage Students → Fetch from Academics**, fetch a preview using the Academics
authorization token, select eligible students, then click **Import Selected Students**.
Fetching alone does not write enrollment records. The popup displays the ERP year,
matched batch, assigned hostel and import status. Selection can include every
eligible filtered row across all pages. Already enrolled students, missing mappings
and students assigned to another warden's hostel cannot be selected. Existing
enrollments with missing or changed batch data can be updated; their bed eligibility
is preserved. New students' bed eligibility follows the popup's explicit checkbox.
After import, the popup reports successful, skipped and failed rows and refreshes
the saved student roster without closing the preview.

The migration adds nullable `erp_batch_year` fields to batches and enrollments
and a unique batch-year index. Existing configured batch/hostel rules retain their
years and hostel assignments; the old prefix column is retained only as legacy
storage and is not read by allocation logic. Students' missing source years are
never inferred from their roll numbers or their earlier prefix-based assignment.
Fetch the year through ERP sync, or supply it explicitly through admission.
The existing `/sessions` API routes and database IDs remain compatible.

After saving a batch, use **Review Batch Allocation**. Search or filter the
preview, select ready rows, and apply their changes. A preview token rejects
stale updates. Unmatched admission years, multiple active enrollments and rooms in another
hostel are conflicts and cannot be applied. An active room must be vacated before
moving its student to another hostel.

The table's selection checkbox and **Select all matching eligible students** button
select ready students across every filtered page. Individual selections survive
pagination; changing a filter clears them. The page-size control supports 10, 20,
50 or 100 rows without changing the scope of the selected students.

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
