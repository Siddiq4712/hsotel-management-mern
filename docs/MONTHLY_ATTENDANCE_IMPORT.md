# Monthly attendance Excel import

Sign in as Admin and open Monthly Attendance Import in the sidebar, or visit `/monthly-attendance-import`.

1. Select the hostel and month.
2. Download Template. For a roster of up to 1000 students, the first sheet contains the current active students' roll numbers and names. Larger rosters receive a headers-only template; import in batches of at most 1000 rows.
3. Fill Mess Days. Keep roll numbers as text and names unchanged. Remove students you are not importing. Enter zero explicitly when appropriate. Blank days do not mean zero.
4. Upload the `.xlsx` file and review every validation result. Nothing is written during preview.
5. Confirm Import. The server revalidates all rows and saves the entire batch atomically. A failed batch saves no attendance.

The first worksheet must have exactly these three columns, starting in cell A1:

| Roll Number | Student Name | Mess Days |
| --- | --- | --- |
| Existing student roll as text | Existing student name | Whole number from 0 to the calendar days in that month |

Files must be `.xlsx`, at most 2 MB and 1000 student rows. Formulas and extra columns are rejected. Student matching is by roll number within the selected hostel's active student accounts; the name is cross-checked. Duplicate rolls, unknown students, blank day counts, fractions, negative numbers and out-of-month counts are rejected. Dates and the hostel are selected on the page, not repeated in Excel.

Imports do not create student accounts, bills, payments, or email messages. The attendance date is the first day of the chosen month as a reference, with `is_monthly=true` and the month's total in `totalManDays`. It is not evidence of attendance on individual dates. The warden can see these totals under Attendance → Monthly Summary.

Existing daily, GPS, or monthly attendance for a submitted student blocks that student's import. Any invalid row blocks the whole batch. Saved mess bills or a protected historical statement block imports for the entire hostel and month. The existing August 2026 historical import is protected.

Every successful batch is recorded in `tbl_MonthlyAttendanceImport` with the administrator, hostel, period, filename, hash of the validated import, student/day totals, timestamp and inserted attendance IDs. Recent batches appear on the Admin page. Existing records are never overwritten by this workflow.

Backend endpoints under `/api/admin/monthly-attendance` require an authenticated Admin:

- `GET /roster?hostel_id=...`
- `GET /imports?hostel_id=...`
- `POST /preview`
- `POST /import`

The JSON posts contain `hostel_id`, `month`, `year`, `file_name`, and `rows` of `{roll_number, student_name, mess_days}`. Only `/import` writes records. Import transactions serialize against the selected hostel, and the server repeats conflict checks before creating any attendance.
