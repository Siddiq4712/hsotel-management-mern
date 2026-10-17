import sequelize from '../config/database.js';
import { MenuPlanningSettings, WeeklyMenuPlan, PlannedDailyMeal, MenuPlanningChange } from '../models/menuPlanning.js';

export async function ensureMenuPlanningSchema() {
  for (const model of [MenuPlanningSettings, WeeklyMenuPlan, PlannedDailyMeal, MenuPlanningChange]) await model.sync();
  // Earlier development builds allowed one version per effective date. Versions
  // are now ordered by publication ID, allowing corrections on the same day.
  const query = sequelize.getQueryInterface();
  const indexes = await query.showIndex(WeeklyMenuPlan.getTableName());
  const old = indexes.find(index => index.name === 'weekly_menu_plans_hostel_id_kind_effective_from' && index.unique);
  if (old) {
    await query.removeIndex(WeeklyMenuPlan.getTableName(), old.name);
  }
}
