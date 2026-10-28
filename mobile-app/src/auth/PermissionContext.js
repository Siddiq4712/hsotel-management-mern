import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, DeviceEventEmitter, Pressable, View } from 'react-native';
import TouchableOpacity from '../components/common/Touchable';
import { Text } from '../components/common/ReferenceDesign';
import api from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { can as allowed } from '../../shared-permissions';

const PermissionContext = createContext(null);
export const ScreenPermissionContext = createContext(null);
export function PermissionProvider({ children }) {
  const { user } = useAuth();
  const [policy, setPolicy] = useState(null), [error, setError] = useState('');
  const generation = useRef(0);
  const policySignature = useRef('null');
  const refresh = useCallback(async () => {
    if (!user) return;
    const sequence = ++generation.current;
    try {
      const response = await api.get('/permissions/mine');
      if (sequence === generation.current) {
        const nextPolicy = response.data.data ?? null;
        const nextSignature = JSON.stringify(nextPolicy);
        if (nextSignature !== policySignature.current) {
          policySignature.current = nextSignature;
          setPolicy(nextPolicy);
        }
        setError('');
      }
    } catch (e) {
      if (sequence === generation.current) {
        if (policySignature.current !== 'null') {
          policySignature.current = 'null';
          setPolicy(null);
        }
        setError(e.message);
      }
    }
  }, [user?.userId, user?.role]);
  useEffect(() => {
    policySignature.current = 'null';
    setPolicy(null);
    refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const denied = DeviceEventEmitter.addListener('permissions-changed', refresh);
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 60000);
    return () => { ++generation.current; listener.remove(); denied.remove(); clearInterval(timer); };
  }, [refresh]);
  const can = useCallback((id, action = 'view') => user?.role === 'admin' || allowed(policy?.grants, policy?.role || user?.role, id, action), [policy, user?.role]);
  const value = useMemo(() => ({
    can,
    ready: Boolean(policy) || user?.role === 'admin',
    error,
    refresh,
  }), [can, policy, user?.role, error, refresh]);
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}
export const usePermissions = () => useContext(PermissionContext) || { can: () => true, ready: true, refresh: () => {}, error: '' };
export function PermissionTouchable({ permissionAction, permissionScreen, disabled, ...props }) {
  const current = useContext(ScreenPermissionContext);
  const { can } = usePermissions();
  const blocked = permissionAction && (permissionScreen || current) && !can(permissionScreen || current, permissionAction);
  return <TouchableOpacity {...props} disabled={disabled || blocked} accessibilityState={{ ...props.accessibilityState, disabled: Boolean(disabled || blocked) }} />;
}
export function ScreenPermission({ screen, children }) {
  const { can, ready, error, refresh } = usePermissions();
  const { logout } = useAuth();
  if (!ready || error || !can(screen)) return <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
    {!ready && !error ? <ActivityIndicator /> : <Text>{error || 'Your role does not have access to this screen.'}</Text>}
    <Pressable accessibilityRole="button" onPress={refresh}><Text>Refresh permissions</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={logout}><Text>Sign out</Text></Pressable>
  </View>;
  return <ScreenPermissionContext.Provider value={screen}>{children}</ScreenPermissionContext.Provider>;
}
export function withScreenPermission(Component, screen) {
  function GuardedScreen(props) {
    const { user } = useAuth();
    const id = typeof screen === 'function' ? screen(props, user?.role) : screen;
    return <ScreenPermission screen={id}><Component {...props} /></ScreenPermission>;
  }
  GuardedScreen.displayName = `Permission(${Component.displayName || Component.name || 'Screen'})`;
  return GuardedScreen;
}
export function mobileRouteScreens(role, name) {
  const common = { Dashboard: ['dashboard'], ParentDashboard: ['parent-portal'], ParentAttendance: ['parent-portal'], ParentAlerts: ['notifications'],
    SecurityDashboard: ['gate-activity'], SecurityActivity: ['gate-activity'], Scan: ['gate-scan'], ChangePassword: null };
  if (Object.prototype.hasOwnProperty.call(common, name)) return common[name];
  if (role === 'warden') return ({ Attendance: ['attendance', 'gps-attendance'], Requests: ['leave-approvals', 'warden-reductions', 'outpass-approvals', 'complaint-management'],
    More: ['students', 'warden-rooms', 'room-allotment', 'room-requests', 'mess-fees', 'holidays', 'suspensions', 'complaint-management'],
    Students: ['students'], EnrollStudent: ['students'], Rooms: ['room-allotment'], CreateRoom: ['warden-rooms'], RoomRequests: ['room-requests'],
    ViewLayout: ['warden-rooms'], Bills: ['mess-fees'], Holidays: ['holidays'], Suspensions: ['suspensions'], Complaints: ['complaint-management'] })[name] || null;
  return ({ Attendance: ['gps-attendance', 'my-leaves', 'my-reductions', 'my-outpass'], MessCharges: ['my-fees', 'my-food', 'my-transactions'],
    Profile: ['my-profile'], FoodOrder: ['my-food'], MyFoodOrders: ['my-food'], Transactions: ['my-transactions'], Rooms: ['my-rooms'], Complaints: ['my-complaints'] })[name] || null;
}
