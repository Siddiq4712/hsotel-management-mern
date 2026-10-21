import { NewRequestCard, requestStyles } from '../../components/student/RequestUI';
import { Text } from "../../components/common/ReferenceDesign";
import { useStudentVisible } from '../../components/student/StudentPresentation';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import colors from '../../theme/colors';
import React, { useState, useCallback } from 'react';
import { View, Image, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { outpassAPI } from '../../api/api';
import { QrCode, Clock, ChevronRight } from 'lucide-react-native';
import moment from 'moment';

const OutpassStatusScreen = ({ navigation, refreshToken = 0 }) => {
  const isVisible = useStudentVisible();
  const [currentOutpass, setCurrentOutpass] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        outpassAPI.getCurrentOutpass(),
        outpassAPI.getMyOutpasses()
      ]);
      setCurrentOutpass(currentRes.data.data);
      setHistory(historyRes.data.data || []);
    } catch (error) {
      console.error('Error fetching student outpasses:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isVisible) fetchData();
    }, [refreshToken, isVisible])
  );

  const handleCancel = async () => {
    if (!currentOutpass) return;
    Alert.alert(
      'Cancel Outpass',
      'Are you sure you want to cancel this outpass request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await outpassAPI.cancelOutpass(currentOutpass.id);
              Alert.alert('Cancelled', 'Outpass request has been cancelled.');
              fetchData();
            } catch (error) {
              Alert.alert('Error', error.message.replace('API Error: ', ''));
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  const badge = status => {
    const tone = ['approved','outside'].includes(status) ? 'primary' : status === 'completed' ? 'success' : status === 'pending' ? 'warning' : ['rejected','expired','late_return'].includes(status) ? 'danger' : 'mutedText';
    return <Text style={{ color: colors[tone], backgroundColor: colors[`${tone}Soft`] || colors.surface, fontSize: 12, fontWeight: '600', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, textTransform: 'capitalize' }}>{status?.replace(/_/g,' ')}</Text>;
  };
  const openRequest = () => navigation.navigate('OutpassRequest');
  return <FlatList style={{flex:1,backgroundColor:colors.background}} contentContainerStyle={{padding:16,paddingBottom:32}}
    refreshing={loading} onRefresh={fetchData} keyboardShouldPersistTaps="handled"
    data={history.filter(item=>String(item.id)!==String(currentOutpass?.id))} keyExtractor={item=>String(item.id)}
    ListHeaderComponent={<View style={{gap:16,paddingBottom:16}}>
      {loading && <ActivityIndicator color={colors.primary}/>}
      {currentOutpass ? <>
        <Card style={{padding:18,gap:16}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <Text style={{color:colors.mutedText,fontSize:12,fontWeight:'600',letterSpacing:0.7}}>ACTIVE GATE PASS</Text>{badge(currentOutpass.status)}
          </View>
          <View style={{gap:4}}><Text style={{fontSize:18,fontWeight:'700',color:colors.text}}>{currentOutpass.purpose}</Text><Text style={requestStyles.small}>{currentOutpass.destination}</Text></View>
          {['approved','outside'].includes(currentOutpass.status) && currentOutpass.qr_token ? <>
            <View style={{alignSelf:'center',padding:8,borderWidth:1,borderColor:colors.primaryTint,backgroundColor:colors.card}}>
              <Image accessibilityLabel="Approved gate pass QR code" source={{uri:`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentOutpass.qr_token)}`}} style={{width:168,height:168}}/>
            </View><Text style={[requestStyles.small,{textAlign:'center'}]}>Show this code to security on exit and return.</Text>
          </> : currentOutpass.status==='pending' ? <View style={{padding:16,borderRadius:12,backgroundColor:colors.warningSoft,alignItems:'center',gap:8}}>
            <Clock size={26} color={colors.warning}/><Text style={{color:colors.warning,fontSize:13,fontWeight:'600'}}>Pending warden approval</Text>
          </View> : null}
          <View style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.surface,padding:12,borderRadius:12}}>
            <View style={{flex:1,gap:4}}><Text style={requestStyles.small}>EXIT</Text><Text style={{fontSize:12,fontWeight:'700'}}>{moment(currentOutpass.from_date).format('DD MMM · h:mm A')}</Text></View>
            <ChevronRight size={18} color={colors.text}/>
            <View style={{flex:1,gap:4}}><Text style={requestStyles.small}>RETURN BY</Text><Text style={{fontSize:12,fontWeight:'700'}}>{moment(currentOutpass.to_date).format('DD MMM · h:mm A')}</Text></View>
          </View>
          <Button variant="ghost" onPress={()=>navigation.navigate('StudentRequestDetails',{kind:'gatepass',id:currentOutpass.id})}>View details</Button>
          {currentOutpass.status==='pending'&&<Button variant="danger" loading={cancelling} onPress={handleCancel}>Cancel request</Button>}
        </Card>
        <Button variant="secondary" onPress={openRequest} style={requestStyles.outline}>Request another gate pass</Button>
      </> : !loading && <NewRequestCard icon={QrCode} title="Gate pass request" description="Request permission to leave the hostel." button="New gate pass request" onPress={openRequest}/>}
      <Text accessibilityRole="header" style={requestStyles.sectionTitle}>Recent passes</Text>
    </View>}
    renderItem={({item})=><Card style={{padding:14,marginBottom:12,flexDirection:'row',alignItems:'center',gap:12}}>
      <View style={[requestStyles.icon,{backgroundColor:colors.accentSoft}]}><QrCode size={22} color={colors.accent}/></View>
      <View style={{flex:1,gap:5}}><Text style={{fontSize:14,fontWeight:'600',color:colors.text}}>{item.purpose}</Text><Text style={requestStyles.small}>{moment(item.from_date).format('DD MMM YYYY')} · {item.destination}</Text><Button variant="ghost" onPress={()=>navigation.navigate('StudentRequestDetails',{kind:'gatepass',id:item.id})} style={{alignSelf:'flex-start',paddingHorizontal:0}}>View details</Button></View>
      {badge(item.status)}
    </Card>}
    ListEmptyComponent={!loading&&<Card><Text style={requestStyles.small}>No previous gate passes.</Text></Card>}
  />;
};
export default OutpassStatusScreen;
