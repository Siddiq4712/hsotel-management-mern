import { Text } from "../../components/common/ReferenceDesign";
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { SectionTitle, useEmbeddedHeader } from '../../components/common/ReferenceDesign';
import { InfoNote, StudentIdentity } from '../../components/warden/WardenUI';
import { MapPin, Clock, ArrowLeft } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import Input from '../../components/common/Input';
import colors from '../../theme/colors';
import React, { useEffect, useMemo, useState } from 'react';
import { View, SectionList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Picker } from '@react-native-picker/picker';
import Header from '../../components/common/Header';
import { gpsAttendanceAPI, wardenAPI } from '../../api/api';

const CONFIG_RADIUS = Number(Constants.expoConfig?.extra?.GEOFENCE_RADIUS_M);
const DEFAULT_RADIUS = Number.isFinite(CONFIG_RADIUS) ? CONFIG_RADIUS : 150;
const DEFAULT_DURATION = 20;
const CONFIG_GEOFENCE = {
  latitude: Number(Constants.expoConfig?.extra?.GEOFENCE_LAT),
  longitude: Number(Constants.expoConfig?.extra?.GEOFENCE_LNG)
};
const hasConfiguredGeofence =
  Number.isFinite(CONFIG_GEOFENCE.latitude) &&
  Number.isFinite(CONFIG_GEOFENCE.longitude);

const GPSAttendanceScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const embedded = useEmbeddedHeader();
  const [activeSession, setActiveSession] = useState(null);
  const [lastClosedSession, setLastClosedSession] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [summary, setSummary] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [sessionBatch, setSessionBatch] = useState('all');
  const [yearInput, setYearInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS));
  const [duration, setDuration] = useState(String(DEFAULT_DURATION));
  const [customRadius, setCustomRadius] = useState(!['150','200','250'].includes(String(DEFAULT_RADIUS)));
  const [customDuration, setCustomDuration] = useState(false);
  const [nowTick, setNowTick] = useState(0);
  const sessionForResults = activeSession || lastClosedSession;
  const isSessionActive = !!activeSession;

  const remainingSeconds = useMemo(() => {
    if (!activeSession?.end_time) return 0;
    const now = Date.now() + serverOffsetMs;
    const end = new Date(activeSession.end_time).getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [activeSession, serverOffsetMs, nowTick]);

  useEffect(() => {
    if (!isFocused) return;
    refreshActiveSession();
    fetchStudents();
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || !activeSession?.id) return;
    fetchSummary();
    const summaryTimer = setInterval(fetchSummary, 10000);
    const clockTimer = setInterval(() => {
      setNowTick((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(summaryTimer);
      clearInterval(clockTimer);
    };
  }, [activeSession?.id, isFocused]);

  const studentsById = useMemo(() => {
    const map = new Map();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedBatch === 'all') return students;
    return students.filter((s) => String(s.enrollment_year) === String(selectedBatch));
  }, [students, selectedBatch]);

  const activeBatch = sessionBatch === 'all' ? selectedBatch : sessionBatch;
  const filteredSummary = useMemo(() => {
    const filteredByStudents = summary.filter((s) => studentsById.has(s.id));
    if (activeBatch === 'all') return filteredByStudents;
    return filteredByStudents.filter(
      (s) => String(studentsById.get(s.id)?.enrollment_year) === String(activeBatch)
    );
  }, [summary, activeBatch, studentsById]);

  const presentList = useMemo(
    () => filteredSummary.filter((s) => s.status === 'P'),
    [filteredSummary]
  );
  const absentList = useMemo(
    () => filteredSummary.filter((s) => s.status === 'A'),
    [filteredSummary]
  );

  const refreshActiveSession = async () => {
    setLoading(true);
    try {
      const res = await gpsAttendanceAPI.getActiveSession({ session: 'EVENING' });
      const serverTime = new Date(res.data.server_time).getTime();
      setServerOffsetMs(serverTime - Date.now());
      if (res.data.active) {
        setActiveSession(res.data.session);
        setLastClosedSession(null);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (yearOverride) => {
    setStudentsLoading(true);
    try {
      const yearValue =
        typeof yearOverride === 'string' ? yearOverride : yearInput;
      const trimmedYear = yearValue?.trim();
      const res = await wardenAPI.getStudents(
        trimmedYear ? { enrollment_year: trimmedYear } : undefined
      );
      const fetchedStudents = res.data?.data || [];
      const normalizedStudents = fetchedStudents.map((student) => ({
        ...student,
        enrollment_year: student.enrollment_year || student.session || null,
        id: student.id || student.userId
      }));
      setStudents(normalizedStudents);
    } catch (error) {
      console.error('Failed to fetch enrolled students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!activeSession?.id) return;
    try {
      const res = await gpsAttendanceAPI.getSessionSummary(activeSession.id);
      const serverTime = new Date(res.data.server_time).getTime();
      setServerOffsetMs(serverTime - Date.now());
      setSummary(res.data.summary || []);
    } catch (error) {
      console.error(error);
    }
  };

  const startSession = () => {
    setStarting(true);
    (async () => {
      try {
        if (selectedBatch === 'all') {
          Alert.alert('Select year', 'Please choose a batch/year before starting attendance.');
          return;
        }

        let geofence_lat = CONFIG_GEOFENCE.latitude;
        let geofence_lng = CONFIG_GEOFENCE.longitude;
        if (!hasConfiguredGeofence) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission required', 'Location permission is needed to start attendance.');
            return;
          }

          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
          });
          geofence_lat = pos.coords.latitude;
          geofence_lng = pos.coords.longitude;
        }
        const duration_minutes = Number(duration || DEFAULT_DURATION);
        const geofence_radius_m = Number(radius || DEFAULT_RADIUS);

        const res = await gpsAttendanceAPI.startSession({
          session: 'EVENING',
          duration_minutes,
          geofence_lat,
          geofence_lng,
          geofence_radius_m,
          enrollment_year: selectedBatch
        });

        const serverTime = new Date(res.data.server_time).getTime();
        setServerOffsetMs(serverTime - Date.now());
        setActiveSession(res.data.session);
        setLastClosedSession(null);
        setSummary([]);
        setSessionBatch(selectedBatch);
      } catch (error) {
        const existingSession = error?.response?.data?.session;
        if (existingSession) {
          setActiveSession(existingSession);
          setSummary([]);
          Alert.alert('Session Active', error?.response?.data?.message || 'Attendance session already active.');
        } else {
          Alert.alert('GPS Error', error.message || 'Failed to get location');
        }
      } finally {
        setStarting(false);
      }
    })();
  };

  const closeSession = async () => {
    if (!activeSession?.id) return;
    setClosing(true);
    try {
      const closeRes = await gpsAttendanceAPI.closeSession(activeSession.id);
      const closedSession = closeRes?.data?.session;
      const closedSessionId = closedSession?.id || activeSession.id;

      const summaryRes = await gpsAttendanceAPI.getSessionSummary(closedSessionId);
      const serverTime = new Date(summaryRes.data.server_time).getTime();
      setServerOffsetMs(serverTime - Date.now());
      setSummary(summaryRes.data.summary || []);
      setLastClosedSession(summaryRes.data.session || closedSession || null);
      setActiveSession(null);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to close session');
    } finally {
      setClosing(false);
    }
  };

  const renderStudent = ({ item }) => {
    const tone = item.status === 'P' ? 'success' : item.status === 'A' ? 'danger' : 'warning';
    return <Card style={styles.studentCard}>
      <StudentIdentity name={item.userName} meta={[item.roll_number,item.distance != null ? Math.round(item.distance)+' m from center' : null].filter(Boolean).join(' · ')} style={{flex:1}} />
      <Text style={[styles.statusPill,{backgroundColor:colors[tone+'Soft'],color:colors[tone]}]}>{item.status}</Text>
    </Card>;
  };
  const renderBatchSection = () => {
    const preview = filteredStudents.slice(0, 6);
    return <View style={{gap:12}}>
      <SectionTitle title="Enrolled students" action={studentsLoading?'Loading…':'Refresh'} onPress={studentsLoading?undefined:fetchStudents} />
      <Card style={{gap:14}}>
        <View style={styles.enrollmentSummary}>
          <View style={{flex:1,gap:4}}><Text style={styles.fieldLabel}>Enrollment year</Text><Text style={styles.summaryValue}>{selectedBatch==='all'?'All years':selectedBatch}</Text></View>
          <View style={{flex:1,gap:4}}><Text style={styles.fieldLabel}>Eligible students</Text><Text style={styles.summaryValue}>{studentsLoading?'—':filteredStudents.length}</Text></View>
        </View>
        <View style={styles.yearFilter}>
          <Input accessibilityLabel="Enrollment year" style={[styles.input,{flexGrow:1,flexBasis:110}]} keyboardType="numeric" value={yearInput} onChangeText={setYearInput} placeholder="e.g. 2025" maxLength={4} />
          <Button onPress={()=>{const trimmed=yearInput.trim();setSelectedBatch(trimmed||'all');fetchStudents(trimmed);}}>Apply</Button>
          <Button variant="ghost" onPress={()=>{setYearInput('');setSelectedBatch('all');fetchStudents('');}}>Clear</Button>
        </View>
        {studentsLoading?<ActivityIndicator color={colors.primary}/>:!filteredStudents.length?<Text style={styles.meta}>No enrolled students for this batch.</Text>:<View style={{gap:10}}>
          {preview.map(student=><StudentIdentity key={student.id} name={student.userName||student.username||student.name} meta={student.roll_number} />)}
          {filteredStudents.length>preview.length&&<Text style={styles.meta}>+{filteredStudents.length-preview.length} more students</Text>}
        </View>}
      </Card>
    </View>;
  };
  return <Screen><Header />
    <SectionList style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:32}}
      sections={sessionForResults?[{title:'Present',data:presentList},{title:'Absent',data:absentList}]:[]}
      keyExtractor={item=>String(item.id)} renderItem={renderStudent} stickySectionHeadersEnabled={false}
      renderSectionHeader={({section})=><Text style={styles.sectionHeader}>{section.title} · {section.data.length}</Text>}
      ListHeaderComponent={<View style={{gap:16,paddingBottom:16}}>
        {!embedded&&<Button variant="ghost" onPress={()=>navigation.navigate('AttendanceRecords')} style={{alignSelf:'flex-start'}}><ArrowLeft size={18} color={colors.primary}/>Attendance</Button>}
        {loading?<ActivityIndicator color={colors.primary}/>:sessionForResults?<>
          <Card style={styles.setup}>
            <View style={styles.locationIcon}><MapPin size={25} color={colors.accent}/></View>
            <Text style={styles.title}>{isSessionActive?'GPS session active':'Session completed'}</Text>
            {isSessionActive&&<View style={styles.timer}><Clock size={18} color={colors.accent}/><Text style={styles.timerText}>{String(Math.floor(remainingSeconds/60)).padStart(2,'0')}:{String(remainingSeconds%60).padStart(2,'0')} remaining</Text></View>}
            <View style={styles.sessionGrid}>
              {[[ 'Date',sessionForResults.attendance_date||'Not recorded' ],[ 'Enrollment year',activeBatch==='all'?'All years':activeBatch ],[ 'Radius',Math.round(sessionForResults.geofence_radius_m)+' m' ]].map(([label,value])=><View key={label} style={styles.sessionDetail}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>)}
            </View>
            {isSessionActive&&<Button variant="danger" onPress={closeSession} loading={closing}>Close session</Button>}
          </Card>
          <View style={styles.results}>{[[ 'Present',presentList.length,'success' ],[ 'Absent',absentList.length,'danger' ]].map(([label,count,tone])=><Card key={label} style={{flex:1,gap:6,padding:16}}><Text style={styles.fieldLabel}>{label}</Text><Text style={{fontSize:26,fontWeight:'800',color:colors[tone]}}>{count}</Text></Card>)}</View>
        </>:<Card style={styles.setup}>
          <View style={styles.locationIcon}><MapPin size={25} color={colors.accent}/></View>
          <Text style={styles.title}>Evening GPS attendance</Text>
          <Text style={styles.setupDescription}>{hasConfiguredGeofence?'Start a timed session using the configured hostel coordinates.':'Start a timed session using your live location as the geofence center.'}</Text>
          <View style={styles.parameterGrid}>
            <View style={styles.parameter}><Text style={styles.fieldLabel}>Radius</Text>
              <View style={styles.picker}><Picker accessibilityLabel="GPS radius" selectedValue={customRadius?'custom':radius} onValueChange={value=>{setCustomRadius(value==='custom');if(value!=='custom')setRadius(value);}}>
                {['150','200','250'].map(value=><Picker.Item key={value} label={value+' m'} value={value}/>)}<Picker.Item label="Other" value="custom"/>
              </Picker></View>
              {customRadius&&<Input accessibilityLabel="Geofence radius in meters" style={styles.input} keyboardType="numeric" value={radius} onChangeText={setRadius} placeholder="Meters"/>}
            </View>
            <View style={styles.parameter}><Text style={styles.fieldLabel}>Duration</Text>
              <View style={styles.picker}><Picker accessibilityLabel="GPS duration" selectedValue={customDuration?'custom':duration} onValueChange={value=>{setCustomDuration(value==='custom');if(value!=='custom')setDuration(value);}}>
                {['15','20','30'].map(value=><Picker.Item key={value} label={value+' min'} value={value}/>)}<Picker.Item label="Other" value="custom"/>
              </Picker></View>
              {customDuration&&<Input accessibilityLabel="Session duration in minutes" style={styles.input} keyboardType="numeric" value={duration} onChangeText={setDuration} placeholder="Minutes"/>}
            </View>
          </View>
          <Text style={styles.meta}>Choose an enrollment year below before starting.</Text>
          <Button onPress={startSession} loading={starting}><MapPin size={19} color={colors.card}/>Start GPS session</Button>
        </Card>}
        {renderBatchSection()}
        <InfoNote icon={Clock}>Active results refresh every 10 seconds. This session uses its own geofence radius, separate from the Home location check.</InfoNote>
      </View>}
    />
  </Screen>;
};
export default GPSAttendanceScreen;
const styles=StyleSheet.create({
  setup:{padding:20,gap:16,borderRadius:18},locationIcon:{width:50,height:50,borderRadius:14,backgroundColor:colors.accentSoft,alignSelf:'center',alignItems:'center',justifyContent:'center'},
  title:{fontSize:20,lineHeight:28,fontWeight:'700',color:colors.primaryDark,textAlign:'center'},setupDescription:{fontSize:13,lineHeight:20,color:colors.mutedText,textAlign:'center'},
  parameterGrid:{flexDirection:'row',flexWrap:'wrap',gap:12},parameter:{flexGrow:1,flexBasis:'44%',minWidth:115,gap:8},
  input:{backgroundColor:colors.background,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:12},fieldLabel:{fontSize:12,fontWeight:'600',color:colors.mutedText},
  picker:{minHeight:50,backgroundColor:colors.background,borderWidth:1,borderColor:colors.border,borderRadius:12,overflow:'hidden'},
  meta:{fontSize:12,lineHeight:18,color:colors.mutedText},yearFilter:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
  enrollmentSummary:{flexDirection:'row',flexWrap:'wrap',gap:12,paddingBottom:14,borderBottomWidth:1,borderBottomColor:colors.border},summaryValue:{fontSize:14,fontWeight:'700',color:colors.text},
  sessionGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},sessionDetail:{flexGrow:1,flexBasis:'44%',minWidth:110,gap:5,backgroundColor:colors.background,padding:12,borderRadius:12},
  timer:{alignSelf:'center',flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.accentSoft,padding:12,borderRadius:12},timerText:{fontSize:16,fontWeight:'700',color:colors.accent},
  results:{flexDirection:'row',gap:12},sectionHeader:{fontSize:15,fontWeight:'700',color:colors.text,marginVertical:12},
  studentCard:{padding:14,borderRadius:14,marginBottom:8,flexDirection:'row',alignItems:'center',gap:10},statusPill:{fontSize:12,fontWeight:'700',paddingHorizontal:10,paddingVertical:7,borderRadius:9},
});
