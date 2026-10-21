import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Screen from '../../components/common/Screen';
import Header from '../../components/common/Header';
import { PageIntro, Segments, EmbeddedHeader, ui } from '../../components/common/ReferenceDesign';
import LeaveRequestsScreen from './LeaveRequestsScreen';
import MessReductionsScreen from '../MessReductionsScreen';
import GatePassRequestsScreen from './GatePassRequestsScreen';
import ComplaintManagementScreen from './ComplaintManagementScreen';

export const requestAliases = { Leaves: 'leave', MessReductions: 'reductions', GatePasses: 'passes', Complaints: 'complaints' };
const sections = [['leave', 'Leave'], ['reductions', 'Reductions'], ['passes', 'Gate passes'], ['complaints', 'Complaints']];
const screens = { leave: LeaveRequestsScreen, reductions: MessReductionsScreen, passes: GatePassRequestsScreen, complaints: ComplaintManagementScreen };

export default function RequestsScreen({ navigation, route }) {
  const initial = sections.some(([key]) => key === route.params?.kind) ? route.params.kind : 'leave';
  const [kind, setKind] = useState(initial);
  const [visited, setVisited] = useState({ [initial]: true });
  const choose = useCallback(value => {
    setVisited(current => current[value] ? current : { ...current, [value]: true });
    setKind(value);
  }, []);
  useEffect(() => { if (sections.some(([key]) => key === route.params?.kind)) choose(route.params.kind); }, [route.params?.kind, route.params?.request, choose]);
  const sectionNavigation = useMemo(() => ({ ...navigation, navigate(name, params) {
    if (requestAliases[name]) choose(requestAliases[name]); else navigation.navigate(name, params);
  } }), [navigation, choose]);
  return <Screen><Header />
    <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
      <PageIntro title="Requests" />
      <Segments scrollable items={sections} value={kind} onChange={choose} />
    </View>
    <EmbeddedHeader value={true}>
      {sections.filter(([key]) => visited[key]).map(([key]) => {
        const Component = screens[key];
        return <View key={key} style={[ui.page, key !== kind && { display: 'none' }]}>
          <Component navigation={sectionNavigation} route={{ ...route, name: key }} />
        </View>;
      })}
    </EmbeddedHeader>
  </Screen>;
}
