import { withScreenPermission } from '../../auth/PermissionContext';
import Screen from '../../components/common/Screen';
import ReferenceHeader from '../../components/common/ReferenceHeader';
import { SectionTitle, ui } from '../../components/common/ReferenceDesign';
import { Text } from "../../components/common/ReferenceDesign";
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import HighlightCard, { highlightStyles } from '../../components/common/HighlightCard';
import colors from '../../theme/colors';
import React, { useState, useCallback, useRef } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import useAfterPaintFocusEffect from '../../hooks/useAfterPaintFocusEffect';
import { getDashboardResource } from '../../api/api';
import { Scan, ExternalLink, RefreshCw, LogOut, KeyRound } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import moment from 'moment';

const SecurityDashboardScreen = ({ navigation, route }) => {
  const activity = route?.params?.section === 'activity';
  const { logout } = useAuth();
  const loadingRef = useRef(false);
  const loaded = useRef(false);
  const scanSource = useRef(null);
  const [stats, setStats] = useState({ exits: 0, returns: 0, outside: 0 });
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (force = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!loaded.current || force === true) setLoading(true);
    try {
      const [activityRes, outsideRes, scansRes] = await Promise.all([
        getDashboardResource('/outpass/today-activity', {}, { force }),
        getDashboardResource('/outpass/outside', {}, { force }),
        getDashboardResource('/outpass/recent-scans', {}, { force })
      ]);

      const activities = activityRes.data.data || [];
      const outsideList = outsideRes.data.data || [];

      const exitsToday = activities.filter(a => a.exit_time).length;
      const returnsToday = activities.filter(a => a.return_time).length;

      setStats(current => current.exits === exitsToday && current.returns === returnsToday && current.outside === outsideList.length
        ? current : { exits: exitsToday, returns: returnsToday, outside: outsideList.length });

      if (scanSource.current !== scansRes.data.data) {
        scanSource.current = scansRes.data.data;
        setRecentScans((scansRes.data.data || []).slice(0, 10));
      }
      loaded.current = true;
    } catch (error) {
      console.error('Error fetching security dashboard data:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useAfterPaintFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  return <Screen>
    <ReferenceHeader title={activity ? 'Gate activity' : 'Security console'} notifications={false} actions={<Button variant="ghost" onPress={logout} accessibilityLabel="Log out"><LogOut size={20} color={colors.mutedText} /></Button>} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
      {!activity && <>
      <HighlightCard>
        <Scan size={36} color={colors.highlightText} /><Text style={[highlightStyles.value, { fontSize: 21 }]}>Scan student QR</Text>
        <Button variant="secondary" onPress={() => navigation.navigate('Scan', { screen: 'QRScanner', params: { manual: false } })} style={highlightStyles.button}>Open scanner</Button>
      </HighlightCard>
      <Button variant="ghost" onPress={() => navigation.navigate('Scan', { screen: 'QRScanner', params: { manual: true } })}><KeyRound size={18} color={colors.primary} />Use manual token instead</Button>
      </>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[[stats.outside, 'Outside now', ExternalLink], [stats.exits, 'Exits today', Scan], [stats.returns, 'Returns', RefreshCw]].map(([count, label, Icon]) => <HighlightCard key={label} style={{ flex: 1, minWidth: 0, padding: 12, gap: 9 }}>
          <View style={[highlightStyles.badge, { alignSelf: 'flex-start', paddingHorizontal: 8 }]}><Icon size={19} color={colors.highlightText} /></View><Text style={[highlightStyles.value, { fontSize: 25 }]}>{count}</Text><Text style={highlightStyles.detail}>{label}</Text>
        </HighlightCard>)}
      </View>
      {activity && <Card style={{ padding: 16, gap: 8 }}>
        <SectionTitle title="Recent scans" action="Refresh" onPress={() => fetchData(true)} />
        {loading ? <ActivityIndicator color={colors.primary} /> : recentScans.length ? recentScans.map(item => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.surface, paddingVertical: 14 }}>
          <View style={{ flex: 1, gap: 5 }}><Text style={{ fontWeight: '700' }}>{item.Student?.userName}</Text><Text style={ui.small}>{item.Student?.roll_number || 'No roll number'}</Text></View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}><Text style={{ fontSize: 12, fontWeight: '700', color: item.status === 'outside' ? colors.primary : colors.success }}>{item.status.replaceAll('_', ' ')}</Text><Text style={ui.small}>{moment(item.updatedAt).format('h:mm A')}</Text></View>
        </View>) : <Text style={[ui.description, { paddingVertical: 18 }]}>No scans recorded today</Text>}
      </Card>}
    </ScrollView>
  </Screen>;
};
export default withScreenPermission(SecurityDashboardScreen, 'gate-activity');
