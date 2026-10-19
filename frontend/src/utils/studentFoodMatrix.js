const natural = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const mealOrder = { Breakfast: 0, Lunch: 1, Dinner: 2 };

// Both screen and exports use this same student-by-food matrix.
export function studentFoodMatrix(entries = []) {
  const foodKey = entry => JSON.stringify([entry.food, entry.meal_type || '']);
  const foods = [...new Map(entries.map(entry => [foodKey(entry), { identity: foodKey(entry), name: entry.food, meal: entry.meal_type || '' }])).values()]
    .sort((a, b) => natural.compare(a.name, b.name) || (mealOrder[a.meal] ?? 3) - (mealOrder[b.meal] ?? 3));
  foods.forEach((food, index) => {
    food.key = `food_${index}`;
    const repeatedName = foods.filter(other => other.name === food.name).length > 1;
    food.label = repeatedName ? `${food.name} (${food.meal || 'Meal not set'})` : food.name;
  });
  const byFood = new Map(foods.map(food => [food.identity, food.key]));
  const students = new Map();
  for (const entry of entries) {
    const key = entry.student_id != null ? `student:${entry.student_id}` : entry.roll_number ? `roll:${entry.roll_number}` : `name:${entry.name}:room:${entry.room_number || ''}`;
    if (!students.has(key)) students.set(key, { key, name: entry.name, roll_number: entry.roll_number || '', room_number: entry.room_number || '', ...Object.fromEntries(foods.map(food => [food.key, 0])) });
    students.get(key)[byFood.get(foodKey(entry))] += Number(entry.quantity);
  }
  const rows = [...students.values()].sort((a, b) => Number(!a.room_number) - Number(!b.room_number)
    || natural.compare(a.room_number, b.room_number) || natural.compare(a.roll_number, b.roll_number) || natural.compare(a.name, b.name));
  return { foods, rows, headers: ['Name', 'Roll No', 'Room No', ...foods.map(food => food.label)],
    values: rows.map(row => [row.name, row.roll_number || 'Not recorded', row.room_number || 'Not allotted', ...foods.map(food => row[food.key])]) };
}
