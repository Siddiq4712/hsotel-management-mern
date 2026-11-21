// Read-only HTTP verification against the July–September 2026 imported database.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import {sequelize,initAssociations,User,Attendance,MessBill,MessBillingSnapshot,DailyRateLog} from '../models/index.js';
import {HistoricalBilling} from '../utils/historicalBilling.js';
import {getMessCalculation} from '../services/messCalculation.js';
import {buildMonthlyMessReport} from '../services/monthlyMessReport.js';
import messRoutes from '../routes/mess.js';
import inventoryRoutes from '../routes/inventories.js';
initAssociations();
let server;
async function fingerprint() {
 const rows=await Promise.all([Attendance,MessBill,MessBillingSnapshot,DailyRateLog,HistoricalBilling].map(model=>model.findAll({raw:true,order:[[model.primaryKeyAttribute,'ASC']]})));
 const [source]=await sequelize.query('SELECT * FROM tbl_HistoricalMessInputs ORDER BY id');
 return crypto.createHash('sha256').update(JSON.stringify([...rows,source])).digest('hex');
}
try {
 const before=await fingerprint();
 const admin=await User.findOne({where:{userName:'admin'},attributes:['userId']});assert(admin);
 const token=jwt.sign({userId:admin.userId,role:'admin'},process.env.JWT_SECRET,{expiresIn:'5m'});
 const app=express();app.use(express.json());app.use('/api/mess',messRoutes);app.use('/api/inventories',inventoryRoutes);
 server=await new Promise(resolve=>{const running=app.listen(0,'127.0.0.1',()=>resolve(running));});
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=(path,options={})=>fetch(base+path,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},signal:AbortSignal.timeout(15000)});
 const results=[];
 for(const [month,days,rate] of [[7,13435,'92.67'],[9,14378,'95.25']]) {
  for(const hostel of [1,2,156]) {
   const response=await request(`/api/mess/reports/daily-rate-calculation?month=${month}&year=2026`,{headers:{'X-Entry-Hostel-Id':String(hostel)}});
   const body=await response.json();assert.equal(response.status,200,body.message);
   assert.equal(body.data.totalManDays,days);assert.equal(body.data.dailyRate.toFixed(2),rate);
   assert.equal(body.data.waterIncluded,true);assert.equal(body.data.rateOnly,true);
   assert.deepEqual(body.data.coveredHostelIds,[1,2,156]);
  }
  const pool=await request(`/api/mess/reports/daily-rate-calculation?month=${month}&year=2026`,{headers:{'X-Inventory-Id':'10'}});
  const poolBody=await pool.json();assert.equal(pool.status,200,poolBody.message);assert.equal(poolBody.data.totalManDays,days);
  const all=await request(`/api/mess/reports/daily-rate-calculation?month=${month}&year=2026`);
  const allBody=await all.json();assert.equal(all.status,200,allBody.message);
  // The boys' source must appear once even with three member hostels.
  assert.equal(allBody.hostelSummaries.filter(r=>Number(r.totalManDays)===days).length,1);
  const preview=await request(`/api/inventories/10/reports?month=${month}&year=2026&kind=rate&format=preview`);
  const previewBody=await preview.json();assert.equal(preview.status,200,previewBody.message);
  assert.equal(previewBody.data.summary.dailyRate.toFixed(2),rate);
  assert.deepEqual(previewBody.data.scope.hostels.map(h=>h.id).sort((a,b)=>a-b),[1,2,156]);
  assert.equal(previewBody.data.summary.waterIsSeparate,false);
  const exported=await request(`/api/mess/reports/daily-rate-calculation?month=${month}&year=2026&export=true`,{headers:{'X-Inventory-Id':'10'}});
  assert.equal(exported.status,200);
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(await exported.arrayBuffer()));
  const cells=workbook.worksheets[0].getSheetValues().filter(Boolean).map(row=>row.slice(1));
  assert(cells.some(row=>String(row[0]).includes(`Billable food days = ${days}`)));
  assert(cells.some(row=>row[0]==='Water included in historical expenses'));
  const save=await request('/api/mess/daily-rate/save',{method:'POST',headers:{'Content-Type':'application/json','X-Entry-Hostel-Id':'1'},body:JSON.stringify({month,year:2026})});
  const saveBody=await save.json();assert.equal(save.status,409,saveBody.message);assert.match(saveBody.message,/report-only/);
  await assert.rejects(buildMonthlyMessReport(1,month,2026),/student charges and legacy identity/);
  results.push({month,days,rate,hostelReports:3,inventoryReport:true,export:true,unsafeSaveBlocked:true});
 }
 const august=await request('/api/mess/reports/daily-rate-calculation?month=8&year=2026',{headers:{'X-Inventory-Id':'10'}});
 const augustBody=await august.json();assert.equal(august.status,200,augustBody.message);assert.equal(augustBody.data.dailyRate,92.98);
 await assert.rejects(getMessCalculation(1,8,2026),/7 man-days/);
 assert.equal(await fingerprint(),before,'Attendance, source inputs, bills or saved rates changed');
 console.log(JSON.stringify({results,augustApprovedRatePreserved:true,augustRecalculationBlocked:true,protectedDataUnchanged:true},null,2));
} finally {
 if(server) await new Promise(resolve=>server.close(resolve));
 await sequelize.close();
}
