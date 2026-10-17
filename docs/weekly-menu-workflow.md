# Weekly menu workflow

Open **Mess workspace → Menu Management → Weekly Plan**. Set the hostel, enter meals for each weekday, set the default student count and effective date, then publish. Dishes are free text; ingredient templates are optional. Blank cells mean no meal is planned. No schedule generation is necessary.

## Daily operation

**Today's Menu** resolves the effective weekly plan automatically. **Change menu / count** saves an exception for the selected date and meal only. It can also skip a meal. Changing dishes clears the original ingredient suggestions by default; staff can choose to retain them. Count-only changes preserve suggestions and scale them to the updated count.

**Record consumption** opens editable ingredient quantities. Select the actual items and quantities in their inventory base units, then confirm. The existing inventory function deducts batches oldest first and values consumption at their weighted average cost. Consumption rows contribute to the existing monthly expense calculations. The cooking count never changes student attendance, enrollment, billable days or individual charge records.

Consumption is recorded on the meal date only. Past meals remain available for viewing. Confirmed meals are locked against a second confirmation and preserve their menu, count and consumption snapshot. Use the existing inventory return/correction process for inventory corrections; this feature does not silently rewrite a served meal.

## Customization

- Settings configure up to 12 slots, their names, times, report categories and default student count. The initial count is zero: staff supplies the actual hostel default.
- Custom slots such as night milk can share an existing inventory report category. Reports retain the existing breakfast/lunch/dinner/snacks categories.
- Settings defaults apply to newly published plan versions. Published versions preserve their slots, timings, ingredient estimates and default counts.
- Each hostel has separate settings and plans. Administrators explicitly select a hostel; staff are restricted to their assigned hostel.
- Publish a new regular version from its effective date. A later publication with the same effective date supersedes the earlier version. Older versions remain visible.
- A temporary plan needs an end date, overrides the regular plan during its inclusive date range and automatically expires. The applicable regular plan resumes afterwards. Within overlapping temporary plans the latest start date wins, then latest publication.
- An expired newer regular plan does not revive an older regular version.
- By default mess staff may publish, override, record consumption and change defaults; wardens may view. Administrators can delegate those actions to mess staff/wardens and always retain access.
- Change History records actor, reason and details for publication, overrides, settings changes and consumption. Requests carry revision keys to reject stale edits.

Recipes and previous ingredient templates/schedules remain under the expandable tools area. The mess dashboard and menu chatbot use the new plans when one applies, with legacy schedules as fallback. No existing schedules or historical bills are automatically converted. Staff must enter the hostel's actual weekly plan.

## Database and validation

Startup creates four additive tables: `menu_planning_settings`, `weekly_menu_plans`, `planned_daily_meals`, and `menu_planning_changes`. `ensureMenuPlanningSchema` also replaces the early development unique effective-date index with a nonunique index so same-day revisions work. No legacy table schema is changed.

All planning writes for a hostel take the settings-row lock. Consumption, stock changes, saved daily snapshot and audit entry share one transaction. Duplicate confirmations and stale forms are rejected. Stock shortages reject the complete request. A legacy schedule already served for the same date/category prevents duplicate confirmation through this workflow. Separate manual consumption screens still represent separate entries, so record each kitchen consumption through one workflow.

Checks:

```powershell
cd backend
node --test scripts/weekly-menu.test.mjs
node scripts/weekly-menu.integration.mjs
cd ../frontend
npm run test -- --run src/components/mess/WeeklyMenuWorkspace.test.jsx --testTimeout=60000
npm run build
```

The integration script creates the feature tables if needed, runs against a temporary MySQL fixture transaction and rolls back all fixture records and inventory changes. It does not send email. Run it against the configured local development database.
