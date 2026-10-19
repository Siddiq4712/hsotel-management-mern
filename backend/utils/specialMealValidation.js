export function normalizeSpecialMeal(body) {
  const requested = body.student_ids ?? (body.student_id ? [body.student_id] : []);
  if (!Array.isArray(requested) || !requested.length || requested.length > 1000) throw new Error('Select between 1 and 1000 students.');
  const studentIds = requested.map(Number);
  if (studentIds.some(id => !Number.isInteger(id) || id <= 0)) throw new Error('Invalid student selection.');
  if (new Set(studentIds).size !== studentIds.length) throw new Error('A student cannot be selected more than once.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw new Error('Select between 1 and 100 dishes.');
  const dishes = new Map();
  for (const item of body.items) {
    const id = Number(item?.food_item_id), quantity = Number(item?.quantity);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      throw new Error('Each dish needs a valid ID and a whole quantity between 1 and 1000.');
    }
    dishes.set(id, (dishes.get(id) || 0) + quantity);
    if (dishes.get(id) > 1000) throw new Error('The total quantity for a dish cannot exceed 1000 per student.');
  }
  return { studentIds, items: [...dishes].map(([food_item_id, quantity]) => ({ food_item_id, quantity })) };
}
