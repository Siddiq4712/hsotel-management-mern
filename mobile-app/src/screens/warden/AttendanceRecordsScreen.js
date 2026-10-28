import { PermissionTouchable } from '../../auth/PermissionContext';
import { withScreenPermission } from '../../auth/PermissionContext';
import { Segments, useEmbeddedHeader } from '../../components/common/ReferenceDesign';
import colors from '../../theme/colors';
import { Text } from "../../components/common/ReferenceDesign";
import Screen from '../../components/common/Screen';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { StudentIdentity, SearchField, AttendanceSort } from '../../components/warden/WardenUI';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { CalendarDays, ChevronDown, LockKeyhole } from 'lucide-react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { sortAttendanceStudents } from '../../utils/attendanceSort';

function AttendanceRecordsScreen({ navigation }) {
  const [date,setDate]=useState(new Date()),[picker,setPicker]=useState(false),[students,setStudents]=useState([]),[records,setRecords]=useState([]);
  const [search,setSearch]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [loadError,setLoadError]=useState(false);
  const [changes,setChanges]=useState({});
  const embedded = useEmbeddedHeader();
  const [attendanceFilter,setAttendanceFilter]=useState('all');
  const [sortBy,setSortBy]=useState('name');
  const visibleStudents=useMemo(()=>sortAttendanceStudents(students.filter(student=>
    `${student.userName||student.username||''} ${student.roll_number||''} ${student.room_number??''}`.toLowerCase().includes(search.toLowerCase()) && (attendanceFilter === 'all' || !(changes[student.userId ?? student.id] ?? records.find(row => Number(row.student_id) === Number(student.userId ?? student.id))?.status))
  ),sortBy),[students,search,sortBy,attendanceFilter,changes,records]);
  const savingRef=useRef(false);
  const load=useCallback(async()=>{
    setLoading(true);setLoadError(false);setChanges({});
    try{const [people,attendance]=await Promise.all([wardenAPI.getAttendanceRoster(),wardenAPI.getAttendance({date:moment(date).format('YYYY-MM-DD')})]);setStudents(people.data.data||[]);setRecords(attendance.data.data||[]);}
    catch(error){setLoadError(true);Alert.alert('Unable to load attendance',error.message);}finally{setLoading(false);}
  },[date]);
  useEffect(()=>{load();},[load]);
  const mark=(student_id,status)=>{
    if(savingRef.current||loading||loadError)return;
    setChanges(current=>({...current,[student_id]:status}));
  };
  const editable=students.filter(student=>!records.some(record=>Number(record.student_id)===Number(student.userId??student.id)&&record.reduction_request_id));
  const markAll=(status)=>{
    if(savingRef.current||loading||loadError||!editable.length)return;
    setChanges(Object.fromEntries(editable.map(student=>[student.userId??student.id,status])));
  };
  const save=async()=>{
    if(savingRef.current||loading||loadError||!Object.keys(changes).length)return;
    savingRef.current=true;setSaving(true);
    try{
      const attendanceData=Object.entries(changes).map(([student_id,status])=>({student_id:Number(student_id),status}));
      for(let offset=0;offset<attendanceData.length;offset+=1000){
        await wardenAPI.bulkMarkAttendance({date:moment(date).format('YYYY-MM-DD'),attendanceData:attendanceData.slice(offset,offset+1000)});
      }
      Alert.alert('Attendance saved','Your attendance selections have been saved. Approved reductions are unchanged.');
      await load();
    }catch(error){Alert.alert('Cannot save attendance',error.message);}
    finally{savingRef.current=false;setSaving(false);}
  };
  return <Screen className="flex-1 bg-background"><Header/>
    <FlatList style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:32}}
    ListHeaderComponent={<View style={{ gap: 12, paddingBottom: 12 }}>
      {!embedded && <View style={styles.standaloneHeading}><Text style={styles.title}>Attendance</Text><Button variant="secondary" onPress={()=>navigation.navigate('GPSAttendance')}>GPS session</Button></View>}
      <View style={styles.filters}>
        <Button variant="ghost" disabled={saving||loading} accessibilityLabel="Choose attendance date" onPress={()=>setPicker(true)} style={styles.date}>
          <CalendarDays size={18} color={colors.mutedText} /><Text style={styles.dateText}>{moment(date).format('DD MMM YYYY')}</Text><ChevronDown size={16} color={colors.mutedText} />
        </Button>
        <SearchField accessibilityLabel="Search attendance" placeholder="Search student or room" value={search} onChangeText={setSearch} style={styles.search} />
      </View>
      <Segments items={[[ 'all', 'All students' ], [ 'unmarked', 'Unmarked' ]]} value={attendanceFilter} onChange={setAttendanceFilter} />
      <AttendanceSort value={sortBy} onChange={setSortBy} />
      <View style={styles.bulk}>
        <Text style={styles.meta}>{visibleStudents.length} students · {Object.keys(changes).length} unsaved changes</Text>
        <View style={styles.bulkButtons}>{[['P','Present all'],['A','Absent all']].map(([status,label])=><Button permissionAction="edit" key={status} variant="ghost"
          disabled={saving||loading||loadError||!editable.length} onPress={()=>markAll(status)} style={styles.bulkButton}>
          <Text style={{fontSize:12,fontWeight:'700',color:status==='P'?colors.success:colors.danger}}>{label}</Text>
        </Button>)}</View>
      </View>
      {loading&&<ActivityIndicator color={colors.primary}/>}
    </View>}
    data={visibleStudents} keyExtractor={s=>String(s.userId??s.id)} renderItem={({item})=>{
      const id=item.userId??item.id,record=records.find(r=>Number(r.student_id)===Number(id));
      const selectedStatus=changes[id]??record?.status;
      return <Card style={[styles.rosterCard, record?.reduction_request_id && styles.locked]}>
        <View style={styles.rosterRow}>
          <StudentIdentity name={item.userName||item.username} meta={[item.roll_number,'Room '+(String(item.room_number??'').trim()||'not allotted')].filter(Boolean).join(' · ')} style={styles.identity} />
          {record?.reduction_request_id ? <View style={styles.lockedBadge}><LockKeyhole size={13} color={colors.primary}/><Text style={styles.lockedText}>{selectedStatus || '—'} · Locked</Text></View>
            : <View style={styles.choices}>{[['P','Present'],['A','Absent'],['OD','On duty']].map(([status,label])=><PermissionTouchable permissionAction="edit" key={status}
              accessibilityRole="radio" accessibilityState={{checked:selectedStatus===status,disabled:saving||loading||loadError}}
              accessibilityLabel={label+' for '+(item.userName||item.username)} disabled={saving||loading||loadError} onPress={()=>mark(id,status)}
              style={[styles.choice,selectedStatus===status&&{borderColor:({P:colors.success,A:colors.danger,OD:colors.accent})[status],backgroundColor:({P:colors.successSoft,A:colors.dangerSoft,OD:colors.accentSoft})[status]}]}>
              <Text style={{fontSize:12,fontWeight:'700',color:selectedStatus===status?({P:colors.success,A:colors.danger,OD:colors.accent})[status]:colors.mutedText}}>{status}</Text>
            </PermissionTouchable>)}</View>}
        </View>
        {record?.reduction_request_id && <Text style={styles.lockedDetail}>Reduction #{record.reduction_request_id}{record.ReductionRequest?.category ? ' · '+record.ReductionRequest.category : ''}{record.MarkedBy?.userName ? ' · '+record.MarkedBy.userName : ''}</Text>}
      </Card>;
    }}
    ListEmptyComponent={!loading&&<Text style={styles.empty}>{loadError?'Could not load the roster. Tap Refresh to retry.':'No matching students.'}</Text>}
    ListFooterComponent={<View style={{gap:12,paddingTop:8}}>
      <Button permissionAction="edit" accessibilityLabel="Save attendance" disabled={saving||loading||loadError||!Object.keys(changes).length} onPress={save}>{saving?'Saving…':'Save attendance · '+Object.keys(changes).length+' changes'}</Button>
      <Button variant="ghost" onPress={load} disabled={saving||loading}>Refresh</Button>
    </View>}/>
    {picker&&<DateTimePicker value={date} mode="date" onChange={(event,value)=>{setPicker(false);if(value&&event.type!=='dismissed')setDate(value);}}/>}
  </Screen>;
}
const styles=StyleSheet.create({
  standaloneHeading:{flexDirection:'row',alignItems:'center',gap:12},title:{flex:1,fontSize:24,fontWeight:'700',color:colors.primaryDark},
  filters:{flexDirection:'row',flexWrap:'wrap',gap:8},
  date:{flexGrow:1,flexBasis:135,minHeight:50,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,paddingHorizontal:10,gap:7,flexWrap:'nowrap'},
  dateText:{flex:1,fontSize:12,fontWeight:'600'},search:{flexGrow:1.4,flexBasis:160},
  bulk:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:4},
  meta:{fontSize:12,lineHeight:18,color:colors.mutedText},bulkButtons:{flexDirection:'row',gap:4},bulkButton:{paddingHorizontal:8},
  rosterCard:{padding:12,marginBottom:8,borderRadius:14,gap:8},
  rosterRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},identity:{flex:1,minWidth:112},
  choices:{flexDirection:'row',gap:4},choice:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:9,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background},
  locked:{backgroundColor:colors.background},lockedBadge:{flexDirection:'row',alignItems:'center',gap:5,borderRadius:9,padding:8,backgroundColor:colors.primarySoft},lockedText:{fontSize:12,fontWeight:'700',color:colors.primary},lockedDetail:{fontSize:12,lineHeight:18,color:colors.mutedText},
  empty:{color:colors.mutedText,textAlign:'center',paddingVertical:24},
});

export default withScreenPermission(AttendanceRecordsScreen, 'attendance');
