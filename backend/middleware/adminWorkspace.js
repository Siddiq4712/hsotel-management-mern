import { Writable } from 'node:stream';
import ExcelJS from 'exceljs';
import * as models from '../models/index.js';
import { inventoryPolicy } from '../services/inventoryBilling.js';
import { identifyHostel, inventoryEntryScope, distinctBillingHostels, staffEntryScope } from './workspaceScope.js';

const inventoryPath = /^\/(stock|inventory-purchase|inventory-transactions|inventory\/correct-last-purchase|purchase-orders|daily-expenses)(\/|$)|^\/items\/[^/]+\/(fifo-price|batches)$|^\/chart-data\/item-stock$|^\/reports\/latest-purchase$/;
const consumptionWrite = /^\/consumption\/(bulk|single-page|return)$/;

const sharedMess = /^\/(item-categories|uoms|stores|item-stores|special-food-items|concerns|expenses-types)(\/|$)/;
export function mergeWorkspaceValues(values, key = '') {
  const present = values.filter(value => value !== undefined && value !== null);
  if (!present.length) return null;
  if (present.every(Array.isArray)) return present.flat();
  if (present.every(value => typeof value === 'object' && !Array.isArray(value))) {
    if (present.every(value => Array.isArray(value.labels) && Array.isArray(value.datasets))) {
      const labels=[...new Set(present.flatMap(value=>value.labels))];
      return { ...present[0], labels, datasets: present[0].datasets.map((dataset,index)=>({ ...dataset,
        data:labels.map(label=>present.reduce((sum,chart)=>sum+Number(chart.datasets[index]?.data[chart.labels.indexOf(label)]||0),0)) })) };
    }
    const result = {};
    for (const field of new Set(present.flatMap(value => Object.keys(value)))) result[field] = mergeWorkspaceValues(present.map(value => value[field]), field);
    if (Number(result.totalManDays) > 0 && typeof result.totalExpenses === 'number') result.dailyRate = result.totalExpenses / result.totalManDays;
    return result;
  }
  if (present.every(value => typeof value === 'boolean')) return present.some(Boolean);
  if (/rate|percent|average/i.test(key)) return present.every(value => Number(value) === Number(present[0])) ? present[0] : null;
  if (/amount|cost|expense|income|balance/i.test(key) && present.every(value => typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value))) {
    return present.reduce((sum,value)=>sum+Number(value),0).toFixed(2);
  }
  if (present.every(value => typeof value === 'number')) {
    if (/^(id|userId|roleId|hostel_id|month|year|daysInMonth|operationalDays|holidayCount|totalItems)$/i.test(key)) return present[0];
    return Math.round(present.reduce((sum, value) => sum + value, 0) * 100) / 100;
  }
  return present[0];
}

function addHostel(body, hostel) {
  const value = JSON.parse(JSON.stringify(body));
  const tag = row => row && typeof row === 'object' && !Array.isArray(row) ? { ...row, hostel_id:hostel.id, hostel_name:hostel.name,
    ...(value.historicalImport ? {historicalImport:true} : {}) } : row;
  if (Array.isArray(value.data)) value.data = value.data.map(tag);
  else if (value.data && Array.isArray(value.data.students)) value.data.students = value.data.students.map(tag);
  return value;
}
async function capture(handler, req) {
  const chunks = [];
  const result = { status:200, headers:{}, body:undefined };
  const res = new Writable({write(chunk, encoding, callback){chunks.push(Buffer.from(chunk));callback();}});
  res.status = code => {result.status=code;return res;};
  res.json = body => {result.body=body;return res;};
  res.send = body => {if(Buffer.isBuffer(body))chunks.push(body);else result.body=body;return res;};
  res.setHeader = (key,value) => {result.headers[key.toLowerCase()]=value;return res;};
  res.set = res.setHeader;
  await handler(req,res);
  if (res.writableEnded && !res.writableFinished) await new Promise(resolve=>res.once('finish',resolve));
  result.buffer=Buffer.concat(chunks);
  return result;
}
function scopedRequest(req, hostel) {
  const copy=Object.create(req);
  copy.user={...req.user,hostel_id:hostel.id,hostelId:hostel.id};
  copy.query={...req.query,hostel_id:hostel.id};
  copy.body={...req.body,hostel_id:hostel.id};
  return copy;
}

export function installAdminWorkspace(router, portal) {
  for (const method of ['get','post','put','patch','delete']) {
    const register=router[method].bind(router);
    router[method]=(path,...handlers)=>{
      const handler=handlers.pop();
      return register(path,...handlers,async(req,res,next)=>{
        if(req.user?.role!=='admin' || (portal==='outpass' && !/^\/(warden|approve|reject)(\/|$)/.test(path)))return handler(req,res,next);
        const staff = req.staffWorkspace;
        const shared=portal==='mess' && (sharedMess.test(path) || /^\/items(?:\/[^/]+)?$/.test(path) || /^\/items\/(bulk|:item_id\/stores)$/.test(path));
        const inventoryId = req.get('X-Inventory-Id') || req.body?.inventory_id || req.query.inventory_id;
        const poolRequest = portal === 'mess' && (inventoryPath.test(path) || consumptionWrite.test(path) || path === '/chart-data/monthly-expenses' || (method === 'get' && path === '/items' && (inventoryId || staff?.inventory)));
        if((shared && !poolRequest) || path==='/sessions' || (portal==='warden' && method==='post' && (path==='/students' || path==='/students/bulk-import')))return handler(req,res,next);
        try {
          if (staff) {
            const scope = await staffEntryScope(req, { path, portal, method, poolRequest, inventoryId });
            if (scope.status) return res.status(scope.status).json({ message: scope.message });
            const scoped = scopedRequest(req, scope.hostel);
            if (scope.inventory) scoped.inventory_id = scope.inventory.id;
            return handler(scoped, res, next);
          }
          if (poolRequest && inventoryId) {
            const { inventory, hostels, explicit } = await inventoryEntryScope(req, inventoryId);
            const policy = await inventoryPolicy(inventory.id, req.body?.consumption_date || req.body?.expense_date || req.query?.from_date);
            if ((consumptionWrite.test(path) || path.startsWith('/daily-expenses') && method !== 'get') && policy.mode !== 'shared' && !explicit) return res.status(409).json({ code: 'HOSTEL_REQUIRED', message: 'Choose the hostel for this consumption or expense.',
              hostels: hostels.map(hostel => ({ id: hostel.id, name: hostel.name })) });
            const hostel = hostels.find(row => row.id === Number(explicit)) || hostels[0];
            const scoped = scopedRequest(req, hostel);
            scoped.inventory_id = inventory.id;
            return handler(scoped, res, next);
          }
          // Existing records determine their own hostel; the UI selection is a fallback for lists/new entries.
          const inferredId = await identifyHostel(req,path,portal);
          const selectedHostel = (portal === 'warden' || portal === 'outpass') && req.get('X-Workspace-Hostel-Id');
          if (selectedHostel && (!Number.isSafeInteger(Number(selectedHostel)) || Number(selectedHostel) <= 0)) throw new Error('Choose a valid hostel.');
          const id = inferredId || (selectedHostel ? Number(selectedHostel) : null);
          if(id){
            const hostel=await models.Hostel.findByPk(id);
            if(!hostel)return res.status(400).json({message:'Hostel not found.'});
            return handler(scopedRequest(req,hostel),res,next);
          }
          let hostels=await models.Hostel.findAll({order:[['id','ASC']]});
          if(method!=='get' || path==='/daily-charges/calculate' || path==='/layout')return res.status(409).json({code:'HOSTEL_REQUIRED',message:'Choose the hostel for this entry.',
            hostels:hostels.map(hostel=>({id:hostel.id,name:hostel.name}))});
          if (path === '/chart-data/monthly-expenses') {
            hostels = await distinctBillingHostels(hostels, req.query.month, req.query.year);
          }
          if (poolRequest && inventoryPath.test(path)) {
            const assignments = await models.InventoryHostel.findAll({ raw: true });
            const seen = new Set();
            hostels = hostels.filter(hostel => {
              const pool = assignments.find(row => row.hostel_id === hostel.id)?.inventory_id;
              if (!pool || seen.has(pool)) return false;
              seen.add(pool); return true;
            });
          }
          const results=[];
          for(const hostel of hostels){
            const response=await capture(handler,scopedRequest(req,hostel));
            if(response.status>=400)return res.status(response.status).json(response.body||{message:`Unable to load ${hostel.name}.`});
            results.push({...response,hostel});
          }
          if(results.some(value=>value.buffer.length)){
            const workbook=new ExcelJS.Workbook();
            for(const result of results){
              if(!result.buffer.length)continue;
              const input=new ExcelJS.Workbook();await input.xlsx.load(result.buffer);
              for(const source of input.worksheets){const name=`${result.hostel.id} ${source.name}`.slice(0,31);
                const sheet=workbook.addWorksheet(name);sheet.model={...source.model,id:sheet.id,name};}
            }
            res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition','attachment; filename=All-Hostels-Report.xlsx');
            await workbook.xlsx.write(res);return res.end();
          }
          const combined=mergeWorkspaceValues(results.map(result=>addHostel(result.body,result.hostel)));
          return res.json({...combined,success:true,allHostels:true,
            hostelSummaries:results.map(result=>({hostel_id:result.hostel.id,dailyRate:result.body?.data?.dailyRate,
              totalExpenses:result.body?.data?.totalExpenses,totalManDays:result.body?.data?.totalManDays}))});
        }catch(error){return res.status(400).json({success:false,message:error.message});}
      });
    };
  }
}
