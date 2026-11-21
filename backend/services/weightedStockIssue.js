const quantityScale = 100000000n;

function quantityUnits(value) {
  const [whole, fraction] = Number(value).toFixed(8).split('.');
  return BigInt(whole) * quantityScale + BigInt(fraction);
}

export function allocateWeightedStockIssue(batches, quantity) {
  const requested = quantityUnits(quantity);
  const balances = batches.map(batch => quantityUnits(batch.quantity_remaining));
  const available = balances.reduce((sum, balance) => sum + balance, 0n);
  if (requested <= 0n || requested > available) throw new Error('Invalid issue quantity for the available batches.');

  // Round cumulative shares so that all allocations add up to the issued quantity.
  let cumulative = 0n;
  let allocated = 0n;
  return batches.flatMap((batch, index) => {
    const balance = balances[index];
    cumulative += balance;
    const target = (requested * cumulative + available / 2n) / available;
    const used = target - allocated;
    allocated = target;
    return used ? [{
      batch,
      used: Number(used) / Number(quantityScale),
      remaining: Number(balance - used) / Number(quantityScale)
    }] : [];
  });
}
