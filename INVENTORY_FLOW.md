# Shared inventories

Items, units, categories, and stores remain shared master data. Each inventory
holds its own balances, purchase batches, purchase history, and restock plans.
An inventory supplies one or more hostels; each hostel uses one inventory.

## Admin workflow

1. Open **Admin → Manage Inventories**, or the same entry in the Mess workspace.
2. Create an inventory, name it, and select its hostels.
3. Review assignments. If an entire existing hostel group moves, explicitly
   confirm combining its stock and batches into the destination inventory.
4. In the Mess workspace, open Stock Management or Purchase by Store and select
   the inventory. Record opening stock or purchases against that balance.
5. On Single-Page Meal Entry, choose the consuming hostel from the inventory's
   assigned hostels. The confirmation identifies both hostel and inventory.

Mess staff automatically use the inventory assigned to their hostel. Both
hostels sharing an inventory see the same stock balance. Consumption records
keep the actual hostel and inventory; hostel billing remains based on that
hostel's consumption costs.

## Reassignment rules

- Moving all hostels out of a source inventory combines its balances, batches,
  purchase transactions, and monthly restock quantities after confirmation.
- Moving only some hostels changes their inventory access; the original stock
  stays in the source inventory. No automatic partial stock transfer is made.
- To remove a hostel, assign it to a different inventory. An inventory with no
  hostels remains available for later assignment and retains its identity.
- Purchase correction is blocked once its batch has consumption or returns.
- Use **Delete** in Manage Inventories to remove an empty, unassigned inventory
  after confirmation. Assigned hostels, stock rows, batches, transactions,
  restock plans, or consumption history block deletion.

## Received purchase orders and expenses

Open **Purchase Orders → Record received order** after goods arrive. Select
the supplier store, enter its order reference, and add received item quantities
and purchase rates. Confirmation atomically creates purchase batches and
transactions and increases the selected inventory's stock. The supplier/order
reference cannot be received twice in that inventory. Every receipt has a
separate identity so historical orders remain distinct when inventories merge.
Received orders and their lines are read from the purchase transactions;
existing direct purchases stay available in Purchase History. Purchase
Suggestions retains the monthly recommendations and Excel export.

Current Stock displays the weighted unit rate of all remaining active batches,
including zero-price batches. This matches the existing consumption cost
calculation; batch quantities continue to deplete in FIFO order. Buying stock
does not insert a DailyConsumption or MessDailyExpense row. Ingredient costs
enter daily/monthly mess calculations through DailyConsumption when stock is
consumed. Daily Expenses is for additional expenses, which the calculation adds
separately. No purchase-to-expense copy is created.

This receipt flow needs a backend restart to register the new endpoints but
does not require a database schema change or rewrite existing records.

## Database upgrade

Restart the backend to load the new routes and models. Startup runs the
idempotent inventory schema upgrade. Existing hostel stock initially stays in
separate inventories, with no automatic pooling.

For an explicit upgrade with a before-image backup and value-preservation check:

```powershell
cd D:\PROJECT\Hostel_Management\hsotel-management-mern\backend
node scripts/migrate-inventories.mjs
```

Backups are saved under ignored `backend/import-work/inventory-backups/`.
The migration adds inventory IDs without changing existing quantities, prices,
or consumption. Back up the database before upgrading another installation.

## Validation

The mess sidebar groups item setup, stock operations, and purchase reporting
under **Inventory Management**. Its **Items**, **Current Stock**, and
**Purchase History** tabs retain the existing editors, imports, reports, and
purchase corrections. Inactive tabs unmount so revisiting stock or history
reloads data after changes elsewhere. The selected inventory stays above the
tabs and continues to scope stock and purchases; the item master remains shared.
Tab selection is stored in the `inventoryTab` URL parameter. Legacy `/items`
and `/stock` links open the corresponding tab, while `/inventory-transactions`
keeps its existing detailed transaction filters.

```powershell
cd D:\PROJECT\Hostel_Management\hsotel-management-mern\backend
node --test scripts/shared-inventory.test.mjs scripts/adminWorkspace.test.mjs scripts/weekly-menu-locking.test.mjs
node scripts/shared-inventory.integration.mjs
node scripts/weekly-menu.integration.mjs
```

Database integration fixtures and stock movements are rolled back. Run the
schema upgrade first. Frontend regressions cover inventory selection, reset on
switching, consuming-hostel selection, staff scope, and request retry scope.
