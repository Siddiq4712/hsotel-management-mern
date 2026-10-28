# LAPC admission and shared mess setup

LAPC students use the **Student** access role and `college: lapc`. LAPC is a college classification; its hostel assignment and inventory membership are configured separately.

## Admin setup

1. In **Manage Hostels**, create or choose the LAPC hostel.
2. In **Manage Batches**, choose **LAPC**, the admission year and gender, then assign the LAPC hostel. NEC and LAPC may have the same year and gender with different hostels. Set the end year to the course's actual end year.
3. In **Manage Inventories**, select the existing boys' inventory, include both the boys' and LAPC hostels, and choose **Shared inventory — combined reports and one daily rate**. Choose the applicable effective month. Existing activity/finalization rules still apply, and combining existing stock uses the existing stock confirmation flow.
4. In **Student Admission → Bulk Import & Preview**, upload the Excel file and select **LAPC** under Target College. The selected college applies to every row. Check the hostel, inventory and current rate mode in the preview, enter the default password, and enroll.

The Excel template requires Student Name, Roll Number, Admission Year and Gender. Room Number and Email are optional. An imported room must belong to the selected batch's hostel.

Wardens can import only into their own assigned hostel. An admin can import across configured hostels. Manual admission and ERP/API imports reject LAPC; NEC ERP results exclude LAPC records.

## Allocation and billing

Matching uses **college + admission year + gender**, never roll-number prefixes. An LAPC row without a matching LAPC batch fails rather than falling back to the NEC batch. Changing Target College immediately changes the preview; submission refreshes the available batch rules and the backend independently resolves the assignment.

The shared inventory's existing billing policy pools the group's mess costs and billable student-days to calculate one daily rate. Each student's mess amount uses that shared rate and their own billable days. Other applicable fees and deductions keep their existing rules. Consumption must be recorded once for the shared inventory.

Existing batches without a college retain the NEC configuration when upgraded. Create separate LAPC batches and use **Review Batch Allocation** to inspect existing LAPC residents before applying selected changes. Batches with active students cannot be relabeled to another college. Imports also reject a roll/email already enrolled under another college.

The change does not automatically choose real hostel IDs, combine stock, change billing policies, or move existing residents. Allocation changes preserve historical bills, fees and attendance. Inventory/rate labels show the policy effective this month; a future policy is not shown as the current rate.

## Verification

From `backend`:

```powershell
node --test scripts/batch-allocation.test.mjs scripts/batch-college.test.mjs
node scripts/batch-erp-preview.test.mjs
node scripts/batch-allocation.integration.mjs
node scripts/shared-inventory.integration.mjs
```

The integration scripts create fixtures inside transactions and roll them back. The batch schema is prepared on normal backend startup by `ensureBatchSchema`.

From `frontend`:

```powershell
npx vitest run src/utils/batchMatching.test.js src/components/admin/ManageBatches.test.jsx src/components/warden/EnrollStudent.test.jsx
npm run build
```
