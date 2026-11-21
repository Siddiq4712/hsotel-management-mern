import React from 'react';
import { useStaffWorkspace } from '../../context/StaffWorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import WorkspaceScope, { useWorkspaceScope } from '../common/WorkspaceScope';
import './WardenPages.css';

export function wardenListPagination(pageSize, noun) {
  return {
    pageSize, showSizeChanger: false, showLessItems: true,
    showTotal: (total, [first, last]) => `Showing ${first}–${last} of ${total} ${noun}`,
    itemRender: (_, type, node) => type === 'prev' || type === 'next'
      ? React.cloneElement(node, {}, type === 'prev' ? 'Previous' : 'Next') : node,
  };
}

export function useWardenHostelName() {
  const scope = useWorkspaceScope();
  const staff = useStaffWorkspace();
  const { user } = useAuth();
  return scope?.name || staff?.hostel?.name || user?.hostel?.name || user?.Hostel?.name;
}

export default function WardenWorkspace({ children, batchRouted = false, showHostelCard = true }) {
  const staff = useStaffWorkspace();
  if (!staff) return children;
  return (
    <WorkspaceScope label="Hostel" showBar={showHostelCard} scope={{ kind: 'hostel', id: staff.hostel.id, name: staff.hostel.name }}
      description={batchRouted ? "Student enrollment follows the hostel assigned to each batch." : staff.inventory?.name}>
      {children}
    </WorkspaceScope>
  );
}
