import React, { useContext } from 'react';
import { Button, Modal, Popconfirm } from 'antd';
import { ScreenPermissionContext, usePermissions } from '../../context/PermissionContext';

function useAction(action, screen) {
  const current = useContext(ScreenPermissionContext);
  const { can } = usePermissions();
  return !action || (!screen && !current) || can(screen || current, action);
}
export const PermissionButton = React.forwardRef(function PermissionButton({ permissionAction, permissionScreen, disabled, ...props }, ref) {
  const allowed = useAction(permissionAction, permissionScreen);
  return <Button ref={ref} {...props} disabled={disabled || !allowed} />;
});
export function PermissionNativeButton({ permissionAction, permissionScreen, disabled, ...props }) {
  const allowed = useAction(permissionAction, permissionScreen);
  return <button {...props} disabled={disabled || !allowed} />;
}
export function PermissionModal({ permissionAction, permissionScreen, onOk, okButtonProps, ...props }) {
  const allowed = useAction(permissionAction, permissionScreen);
  return <Modal {...props} onOk={allowed ? onOk : undefined} okButtonProps={{ ...okButtonProps, disabled: okButtonProps?.disabled || !allowed }} />;
}
Object.assign(PermissionModal, Modal);
export function PermissionPopconfirm({ permissionAction, permissionScreen, onConfirm, disabled, ...props }) {
  const allowed = useAction(permissionAction, permissionScreen);
  return <Popconfirm {...props} disabled={disabled || !allowed} onConfirm={allowed ? onConfirm : undefined} />;
}
