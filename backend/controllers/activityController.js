import { Op, literal } from 'sequelize';
import { ActivityOperation, ActivityChange, ActivityDelivery, ActivityReversal } from '../models/activity.js';
import { activityRecordDetails, changeActivityRecord, previewReversal, revertActivity } from '../services/activityActions.js';

const respondError=(res,error)=>{
  if(error.name==='SequelizeForeignKeyConstraintError')return res.status(409).json({success:false,message:'Related records prevent this action. No changes were saved.'});
  if(error.name==='SequelizeUniqueConstraintError')return res.status(409).json({success:false,message:'A record with those values already exists. No changes were saved.'});
  if(error.name==='SequelizeDatabaseError'){console.error('Activity database error:',error.message);return res.status(500).json({success:false,message:'Unable to complete this activity. No action was confirmed.'});}
  return res.status(error.status||400).json({success:false,message:error.message});
};
export async function listActivities(req,res) {
  try {
    const page=Math.max(1,Number.parseInt(req.query.page,10)||1);
    const pageSize=Math.min(100,Math.max(1,Number.parseInt(req.query.pageSize,10)||20));
    const where={};
    for(const field of ['workspace','actor_role','module','status','kind'])if(req.query[field])where[field]=String(req.query[field]);
    if(req.query.status==='reverted') {
      delete where.status;where.id={[Op.in]:literal('(SELECT operation_id FROM tbl_ActivityReversal)')};
    }else if(req.query.status==='completed')where.id={[Op.notIn]:literal('(SELECT operation_id FROM tbl_ActivityReversal)')};
    if(req.query.actor_id){where.actor_id=Number(req.query.actor_id);if(!Number.isInteger(where.actor_id)||where.actor_id<=0)throw new Error('Choose a valid staff account.');}
    if(req.query.search){const value=`%${String(req.query.search).slice(0,150)}%`;where[Op.or]=[{actor_name:{[Op.like]:value}},{path:{[Op.like]:value}},{search_text:{[Op.like]:value}}];}
    if(req.query.from || req.query.to) {
      where.createdAt={};
      for(const [key,operator] of [['from',Op.gte],['to',Op.lte]])if(req.query[key]) {
        const date=new Date(req.query[key]);if(!Number.isFinite(date.getTime()))throw new Error('Choose a valid date range.');
        where.createdAt[operator]=date;
      }
    }
    const {rows,count}=await ActivityOperation.findAndCountAll({where,limit:pageSize,offset:(page-1)*pageSize,order:[['createdAt','DESC'],['id','DESC']]});
    const reversals=rows.length?await ActivityReversal.findAll({where:{operation_id:{[Op.in]:rows.map(row=>row.id)}},raw:true}):[];
    const reversed=new Set(reversals.map(row=>row.operation_id));
    res.json({success:true,data:rows.map(row=>({...row.toJSON(),reverted:reversed.has(row.id)})),total:count,page,pageSize});
  }catch(error){respondError(res,error);}
}
export async function getActivity(req,res) {
  try {
    const operation=await ActivityOperation.findByPk(req.params.id);
    if(!operation)return res.status(404).json({message:'Activity not found.'});
    const afterId=Math.max(0,Number.parseInt(req.query.after,10)||0);
    const where={operation_id:operation.id,id:{[Op.gt]:afterId}};
    const changes=await ActivityChange.findAll({where,order:[['id','ASC']],limit:100,raw:true});
    const data=await Promise.all(changes.map(activityRecordDetails));
    const [deliveries,related,reversal,total]=await Promise.all([
      ActivityDelivery.findAll({where:{operation_id:operation.id},order:[['id','ASC']]}),
      ActivityOperation.findAll({where:{related_operation_id:operation.id},order:[['createdAt','ASC']]}),
      ActivityReversal.findByPk(operation.id),ActivityChange.count({where:{operation_id:operation.id}}),
    ]);
    res.json({success:true,data:{operation,changes:data,deliveries,related,reversal,total,
      nextAfter:changes.length===100?changes.at(-1).id:null}});
  }catch(error){respondError(res,error);}
}
export async function previewActivityReversal(req,res) {
  try {res.json({success:true,data:await previewReversal(req.params.id)});}
  catch(error){respondError(res,error);}
}
export async function applyActivityReversal(req,res) {
  try {res.json({success:true,data:await revertActivity(req.params.id,req.body.reason,req.body.token),message:'Activity reverted. Original history has been retained.'});}
  catch(error){respondError(res,error);}
}
export async function correctActivityRecord(req,res) {
  try {res.json({success:true,data:await changeActivityRecord(req.params.id,req.params.changeId,req.body,'correct'),message:'Correction saved and logged.'});}
  catch(error){respondError(res,error);}
}
export async function deleteActivityRecord(req,res) {
  try {res.json({success:true,data:await changeActivityRecord(req.params.id,req.params.changeId,req.body,'delete'),message:'Record deleted. Its activity history has been retained.'});}
  catch(error){respondError(res,error);}
}
