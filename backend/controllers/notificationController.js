import { Op } from 'sequelize';
import { InAppNotification } from '../models/index.js';

export async function listNotifications(req,res) {
  try {
    const page=Math.max(1,Number.parseInt(req.query.page,10)||1);
    const pageSize=Math.min(50,Math.max(1,Number.parseInt(req.query.pageSize,10)||20));
    if(req.query.status && !['all','unread','read'].includes(req.query.status))return res.status(400).json({message:'Choose all, unread, or read notifications.'});
    const owner={user_id:req.user.userId};
    const where={...owner,...(req.query.status && req.query.status!=='all'?{status:req.query.status}:{})};
    const [result,unreadCount,latestId]=await Promise.all([
      InAppNotification.findAndCountAll({where,order:[['id','DESC']],limit:pageSize,offset:(page-1)*pageSize}),
      InAppNotification.count({where:{...owner,status:'unread'}}),
      InAppNotification.max('id',{where:owner}),
    ]);
    res.json({success:true,data:result.rows,total:result.count,unreadCount,latestId:latestId||0,page,pageSize});
  }catch(error){console.error('Notification list failed:',error.message);res.status(500).json({message:'Unable to load notifications. Please try again.'});}
}
export async function readNotification(req,res) {
  try {
    const id=Number(req.params.id);
    if(!Number.isInteger(id)||id<=0)return res.status(400).json({message:'Invalid notification.'});
    const row=await InAppNotification.findOne({where:{id,user_id:req.user.userId}});
    if(!row)return res.status(404).json({message:'Notification not found.'});
    if(row.status!=='read')await row.update({status:'read'});
    res.json({success:true,data:row});
  }catch(error){console.error('Notification read failed:',error.message);res.status(500).json({message:'Unable to mark this notification as read.'});}
}
export async function readAllNotifications(req,res) {
  try {
    const throughId=req.body.throughId===undefined?await InAppNotification.max('id',{where:{user_id:req.user.userId}}):Number(req.body.throughId);
    if(throughId!==null && (!Number.isInteger(throughId)||throughId<0))return res.status(400).json({message:'Invalid notification cutoff.'});
    const [updated]=await InAppNotification.update({status:'read'}, {where:{user_id:req.user.userId,status:'unread',id:{[Op.lte]:throughId||0}}});
    res.json({success:true,updated});
  }catch(error){console.error('Notification read-all failed:',error.message);res.status(500).json({message:'Unable to mark notifications as read.'});}
}
