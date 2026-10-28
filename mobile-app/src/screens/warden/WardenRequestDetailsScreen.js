import { withScreenPermission } from '../../auth/PermissionContext';
import React from 'react';
import Screen from '../../components/common/Screen';
import ReferenceHeader from '../../components/common/ReferenceHeader';
import { RequestHeader } from '../../components/student/RequestUI';
import { EmbeddedHeader, Text } from '../../components/common/ReferenceDesign';
import LeaveRequestsScreen from './LeaveRequestsScreen';
import GatePassRequestsScreen from './GatePassRequestsScreen';
import ComplaintManagementScreen from './ComplaintManagementScreen';
import MessReductionsScreen from '../MessReductionsScreen';

const screens = { leave: LeaveRequestsScreen, passes: GatePassRequestsScreen, complaints: ComplaintManagementScreen, reductions: MessReductionsScreen };
const titles = { leave: 'Leave request details', passes: 'Gate pass details', complaints: 'Complaint details', reductions: 'Reduction request details' };

// Route parameters contain only the request kind and ID. Each existing screen
// reloads the hostel-scoped record and owns its original review handlers.
function WardenRequestDetailsScreen({ route, navigation }) {
  const { kind, requestId } = route.params || {};
  const Component = screens[kind];
  const valid = Component && requestId != null && String(requestId).trim() !== '';
  return <Screen>
    {kind === 'complaints' ? <ReferenceHeader title={titles[kind]} back /> : <RequestHeader title={titles[kind] || 'Request details'}
      description={`${kind === 'leave' ? 'Application #LR' : kind === 'reductions' ? 'Request #MR' : 'Pass #GP'}-${requestId}`} navigation={navigation} />}
    {valid ? <EmbeddedHeader value={true}><Component requestId={requestId} navigation={navigation} route={route} /></EmbeddedHeader>
      : <Text style={{ padding: 24 }}>This request is unavailable.</Text>}
  </Screen>;
}

export default withScreenPermission(WardenRequestDetailsScreen, props => ({ leave: 'leave-approvals', passes: 'outpass-approvals', complaints: 'complaint-management', reductions: 'warden-reductions' })[props.route?.params?.kind]);
