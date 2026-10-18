import { Inventory, InventoryHostel } from '../models/inventory.js';

export async function inventoryScope(hostelId, transaction) {
  if (!Number.isInteger(Number(hostelId)) || Number(hostelId) <= 0) {
    throw Object.assign(new Error('Choose a hostel before accessing inventory.'), { status: 400 });
  }
  const assignment = await InventoryHostel.findByPk(hostelId, { transaction });
  if (!assignment) throw Object.assign(new Error('This hostel has no inventory. Ask an administrator to assign one.'), { status: 409 });
  // Serialize purchases, consumption, and assignments at the shared stock pool,
  // including requests arriving from different hostels.
  const inventory = await Inventory.findByPk(assignment.inventory_id, {
    transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!inventory) throw new Error('Assigned inventory no longer exists.');
  if (transaction) {
    const current = await InventoryHostel.findByPk(hostelId, { transaction, lock: transaction.LOCK.UPDATE });
    if (current?.inventory_id !== inventory.id) throw new Error('Inventory assignment changed. Reload and try again.');
  }
  return { inventory_id: inventory.id };
}
