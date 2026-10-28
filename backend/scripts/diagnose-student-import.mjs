import XLSX from '../../frontend/node_modules/xlsx/xlsx.js';
import sequelize from '../config/database.js';
import { initAssociations, User, Enrollment, RoomAllotment, HostelRoom } from '../models/index.js';
import { bulkEnrollStudents } from '../controllers/wardenController.js';
import { mapExcelRowToStudent } from '../../frontend/src/utils/bulkImportUtils.js';

initAssociations();
const nativeTransaction = sequelize.transaction.bind(sequelize);
let outer;
const failures = [];
try {
  outer = await nativeTransaction();
  // Every controller transaction remains below this rollback boundary.
  sequelize.transaction = (options, callback) => typeof options === 'function'
    ? nativeTransaction({ transaction: outer }, options)
    : nativeTransaction({ ...options, transaction: options?.transaction || outer }, callback);
  for (const model of [User, Enrollment, RoomAllotment, HostelRoom]) {
    for (const [owner, method] of [[model, 'create'], [model.prototype, 'update']]) {
      const original = owner[method];
      owner[method] = async function (...args) {
        try { return await original.apply(this, args); }
        catch (error) {
          failures.push({ model: model.name, method, type: error.name, message: error.message, details: error.errors?.map(item => ({ path: item.path, message: item.message, type: item.type })) });
          throw error;
        }
      };
    }
  }
  const workbook = XLSX.readFile(process.argv[2]);
  const students = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }).map(row => mapExcelRowToStudent(row)).filter(Boolean);
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await bulkEnrollStudents({ user: { role: 'admin' }, body: { import_source: 'excel', default_password: 'DiagnosticOnly123', college: 'nec', students } }, res);
  const groups = {};
  for (const failure of failures) { const key = JSON.stringify(failure); groups[key] = (groups[key] || 0) + 1; }
  console.log(JSON.stringify({ httpStatus: res.code, successful: res.body?.data?.successful, skipped: res.body?.data?.skipped, errors: res.body?.data?.errors?.length, failureGroups: Object.entries(groups).map(([failure, count]) => ({ ...JSON.parse(failure), count })), otherErrors: [...new Set(res.body?.data?.errors?.map(row => row.error))], message: res.body?.message }));
} finally {
  if (outer) await outer.rollback();
  await sequelize.close();
}
