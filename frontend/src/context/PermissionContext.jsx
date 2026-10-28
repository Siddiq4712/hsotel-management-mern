import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Button, Result, Spin } from 'antd';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { can as allowed, screenById } from '../../../shared/permissions.js';

const PermissionContext = createContext(null);
export const ScreenPermissionContext = createContext(null);
export function PermissionProvider({ children }) {
  const { user } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!user) return;
    const sequence = ++generation.current;
    try {
      const { data } = await api.get('/permissions/mine');
      if (generation.current === sequence) { setPolicy(data.data); setError(''); }
    } catch (e) {
      if (generation.current === sequence) { setPolicy(null); setError(e.message || 'Unable to load permissions.'); }
    }
  }, [user?.userId, user?.role]);
  useEffect(() => {
    setPolicy(null); setError(''); refresh();
    const focus = () => { if (!document.hidden) refresh(); };
    window.addEventListener('focus', focus);
    window.addEventListener('permissions-changed', refresh);
    document.addEventListener('visibilitychange', focus);
    const timer = setInterval(focus, 60000);
    return () => { ++generation.current; clearInterval(timer); window.removeEventListener('focus', focus); window.removeEventListener('permissions-changed', refresh); document.removeEventListener('visibilitychange', focus); };
  }, [refresh]);
  const can = useCallback((id, action = 'view') => user?.role === 'admin' || allowed(policy?.grants, policy?.role || user?.role, id, action), [policy, user?.role]);
  return <PermissionContext.Provider value={{ can, refresh, policy, error, ready: user?.role === 'admin' || Boolean(policy) }}>{children}</PermissionContext.Provider>;
}
export function usePermissions() {
  // Standalone component tests and previews may not have the application provider.
  return useContext(PermissionContext) || { can: () => true, ready: true, refresh: () => {}, error: '' };
}
export function ScreenPermission({ screen, children }) {
  const { can, ready, error, refresh } = usePermissions();
  if (error) return <Result status="warning" title="Unable to verify access" subTitle={error} extra={<Button onClick={refresh}>Retry</Button>} />;
  if (!ready) return <Spin tip="Loading permissions"><div style={{ minHeight: 200 }} /></Spin>;
  if (!screen || !can(screen)) return <Result status="403" title="Screen unavailable" subTitle="Your role does not have access to this screen. Choose an available page from the navigation." />;
  const actions = screenById[screen]?.actions || [];
  const readonly = actions.length > 1 && !actions.some(action => action !== 'view' && action !== 'export' && can(screen, action));
  return <ScreenPermissionContext.Provider value={screen}>
    {readonly && <Alert type="info" showIcon title="View-only access" description="Changes are disabled for your role. You can still browse permitted information." style={{ margin: 16 }} />}
    {children}
  </ScreenPermissionContext.Provider>;
}
export function PermissionAction({ screen, action, children }) {
  const current = useContext(ScreenPermissionContext);
  const { can } = usePermissions();
  return can(screen || current, action) ? children : null;
}
