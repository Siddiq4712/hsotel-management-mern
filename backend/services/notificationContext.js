import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';

const storage=new AsyncLocalStorage();
export const getNotificationContext=()=>storage.getStore();
export function withNotificationRequest(req,next) {
  return storage.run({id:crypto.randomUUID(),actorId:req.user.userId,actorRole:req.user.role},next);
}
export const runWithNotificationContext=(context,callback)=>storage.run(context,callback);
