import { Inventory, InventoryHostel } from '../models/inventory.js';
import { InventoryBillingPolicy } from '../models/inventoryBilling.js';
import { schoolToday } from './inventoryBilling.js';

// Preview the current inventory and effective rate policy. Future policies and
// historic bills are never treated as the current hostel's rate configuration.
export async function withBatchInventory(batches) {
  const [inventories, assignments, policies] = await Promise.all([
    Inventory.findAll({ raw: true }), InventoryHostel.findAll({ raw: true }),
    InventoryBillingPolicy.findAll({ raw: true, order: [['effective_from', 'DESC'], ['id', 'DESC']] })
  ]);
  const month = `${schoolToday().slice(0, 7)}-01`;
  const effective = new Map();
  for (const policy of policies) {
    if (policy.effective_from <= month && !effective.has(policy.inventory_id)) effective.set(policy.inventory_id, policy);
  }
  return batches.map(batch => {
    const assignment = assignments.find(row => Number(row.hostel_id) === Number(batch.hostel_id));
    const inventory = inventories.find(row => row.id === assignment?.inventory_id);
    const policy = effective.get(inventory?.id);
    const shared = policy?.mode === 'shared' && policy.hostel_ids.map(Number).includes(Number(batch.hostel_id));
    return { ...batch, inventory_id: inventory?.id ?? null, inventory_name: inventory?.name ?? '',
      billing_mode: shared ? 'shared' : 'hostel', billing_effective_from: policy?.effective_from ?? null };
  });
}
