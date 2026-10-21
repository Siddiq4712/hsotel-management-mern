import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { studentAPI, outpassAPI } from '../../api/api';
import { useAuth } from '../../hooks/useAuth';
import { RequestPage, requestStyles } from '../../components/student/RequestUI';
import ApplicationDetails from '../../components/student/ApplicationDetails';
import Button from '../../components/common/Button';
import { Text } from '../../components/common/ReferenceDesign';
import colors from '../../theme/colors';

export default function StudentRequestDetailsScreen({ navigation, route }) {
  const { kind, id } = route.params;
  const { user } = useAuth();
  const [row, setRow] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const leave = kind === 'leave';
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [response, studentResponse] = await Promise.all([leave ? studentAPI.getMyLeaves() : outpassAPI.getMyOutpasses(), studentAPI.getProfile().catch(() => null)]);
      setProfile(studentResponse?.data?.data || null);
      setRow((response.data.data || []).find(item => String(item.id) === String(id)) || null);
    } catch (e) { setError(e.message || 'Unable to load request details.'); }
    finally { setLoading(false); }
  }, [id, leave]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <RequestPage title={leave ? 'Leave request details' : 'Gate pass details'} description={`${leave ? 'Application #LR' : 'Pass #GP'}-${id}`} navigation={navigation} contentStyle={{padding:8,paddingTop:18,paddingBottom:32}}>
    {loading ? <ActivityIndicator color={colors.primary} /> : error ? <>
      <Text style={requestStyles.small}>{error}</Text><Button variant="secondary" onPress={load}>Retry</Button>
    </> : row ? <ApplicationDetails kind={leave ? 'leave' : 'gatepass'} row={row} student={profile || user} onBack={() => navigation.goBack()} /> : <Text style={requestStyles.small}>This request is unavailable.</Text>}
  </RequestPage>;
}
