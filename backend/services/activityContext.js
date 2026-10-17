import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';
import { ActivityOperation, ActivityChange } from '../models/activity.js';

export const activityContext = new AsyncLocalStorage();
export const mutationContext = new AsyncLocalStorage();
export const getActivityContext = () => activityContext.getStore();
export async function reconcileInterruptedActivities() {
  const pending=await ActivityOperation.findAll({where:{status:'pending'},attributes:['id']});
  for(const operation of pending) {
    const changeCount=await ActivityChange.count({where:{operation_id:operation.id}});
    await operation.update({status:changeCount?'partial':'failed',change_count:changeCount});
  }
}

export async function ensureActivity(context = getActivityContext()) {
  if (!context) return null;
  if (!context.operationPromise) context.operationPromise = ActivityOperation.create({
    id: context.id, actor_id: context.actorId, actor_name: context.actorName,
    actor_role: context.actorRole, workspace: context.workspace, module: context.module,
    method: context.method, path: context.path, kind: context.kind || 'activity',
    related_operation_id: context.relatedId || null, reason: context.reason || null,
  });
  return context.operationPromise;
}

export function withActivityRequest(req, res, next) {
  if (!['admin', 'warden', 'mess'].includes(req.user?.role)) return next();
  const requested = req.get('X-Workspace');
  const context = {
    id: crypto.randomUUID(), actorId: req.user.userId, actorName: req.user.userName,
    actorRole: req.user.role,
    workspace: req.user.role === 'admin' && ['admin', 'warden', 'mess'].includes(requested) ? requested : req.user.role,
    module: req.originalUrl.split('/')[2] || 'system', method: req.method,
    path: req.originalUrl.split('?')[0].slice(0, 500),
  };
  res.once('finish', async () => {
    if (!context.operationPromise) return;
    try {
      await context.operationPromise;
      const changeCount = await ActivityChange.count({ where: { operation_id: context.id } });
      await ActivityOperation.update({ http_status: res.statusCode, change_count: changeCount,
        status: res.statusCode >= 400 ? (changeCount ? 'partial' : 'failed') : 'completed',
        search_text: Buffer.from(`${context.actorName} ${context.path} ${[...context.search || []].join(' ')}`,'utf8').subarray(0,64000).toString('utf8'),
      }, { where: { id: context.id } });
    } catch (error) { console.error('Activity completion failed:', error.message); }
  });
  return activityContext.run(context, next);
}
