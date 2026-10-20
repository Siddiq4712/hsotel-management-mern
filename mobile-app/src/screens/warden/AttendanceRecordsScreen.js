import Screen from '../../components/common/Screen';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { sortAttendanceStudents } from '../../utils/attendanceSort';

export default function AttendanceRecordsScreen({ navigation }) {
  const [date,setDate]=useState(new Date()),[picker,setPicker]=useState(false),[students,setStudents]=useState([]),[records,setRecords]=useState([]);
  const [search,setSearch]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [loadError,setLoadError]=useState(false);
  const [changes,setChanges]=useState({});
  const [sortBy,setSortBy]=useState('name');
  const visibleStudents=useMemo(()=>sortAttendanceStudents(students.filter(student=>
    `${student.userName||student.username||''} ${student.roll_number||''} ${student.room_number??''}`.toLowerCase().includes(search.toLowerCase())
  ),sortBy),[students,search,sortBy]);
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
    ListHeaderComponent={<View>
    <View className="flex-row items-center justify-between mb-4" style={{gap:12}}>
      <Text className="text-2xl font-bold text-indigo-900" style={{flex:1}}>Attendance</Text>
      <Button variant="secondary" onPress={()=>navigation.navigate('GPSAttendance')}>GPS attendance</Button>
    </View>
    <Text className="bg-indigo-50 p-3 rounded-xl mb-4 text-gray-600">Presence records do not grant food reductions. Use Mess Reductions for documented approval. Approval-linked attendance is managed through its request.</Text>
    <TouchableOpacity disabled={saving||loading} className="bg-white border border-gray-200 p-3 rounded-xl mb-4" onPress={()=>setPicker(true)}><Text>{moment(date).format('DD MMM YYYY')} — select date</Text></TouchableOpacity>
    <Input accessibilityLabel="Search attendance" placeholder="Search name, roll number or room" value={search} onChangeText={setSearch} className="p-3 bg-white rounded-xl mb-4"/>
    <Text className="text-sm font-semibold text-gray-700 mb-2">Sort by</Text>
    <View className="flex-row flex-wrap mb-4" style={{gap:8}}>
      {[['name','Name'],['room_asc','Room ↑'],['room_desc','Room ↓']].map(([value,label])=><Button key={value}
        variant={sortBy===value?'primary':'secondary'} accessibilityLabel={value==='name'?'Sort by student name':`Sort by room number ${value==='room_asc'?'ascending':'descending'}`}
        accessibilityState={{selected:sortBy===value}} onPress={()=>setSortBy(value)} style={{flexGrow:1}}>{label}</Button>)}
    </View>
    <View className="flex-row mb-4" style={{gap:12}}>{[['P','Present all'],['A','Absent all']].map(([status,label])=><Button key={status} accessibilityRole="button" disabled={saving||loading||loadError||!editable.length} onPress={()=>markAll(status)} style={{flex:1}} variant={status==='P'?'primary':'danger'}>{label}</Button>)}</View>
    <Text className="text-gray-600 mb-4">Select the whole roster, search and adjust individual students, then tap Save attendance to confirm. Approved reduction entries stay locked.</Text>
    {loading&&<ActivityIndicator/>}
    </View>}
    data={visibleStudents} keyExtractor={s=>String(s.userId??s.id)} renderItem={({item})=>{
      const id=item.userId??item.id,record=records.find(r=>Number(r.student_id)===Number(id));
      const selectedStatus=changes[id]??record?.status;
      return <Card className="bg-white rounded-2xl p-4 mb-3 border border-gray-200">
        <Text className="font-bold">{item.userName||item.username}</Text><Text>{item.roll_number}</Text>
        <Text className="text-gray-600 mt-1">Room: {String(item.room_number??'').trim()||'Not allotted'}</Text>
        <Text className="my-2">{({P:'Present',A:'Absent',OD:'OD'})[selectedStatus]||'Unmarked'}</Text>
        {record?.reduction_request_id?<Text className="text-indigo-700">Approved reduction #{record.reduction_request_id} · {record.ReductionRequest?.category} · {record.MarkedBy?.userName}</Text>
          :<View className="flex-row flex-wrap" style={{gap:8}}>{[['P','Present'],['A','Absent'],['OD','OD']].map(([status,label])=><TouchableOpacity key={status} accessibilityRole="radio" accessibilityState={{checked:selectedStatus===status,disabled:saving||loading||loadError}} accessibilityLabel={`${label} for ${item.userName||item.username}`} disabled={saving||loading||loadError} onPress={()=>mark(id,status)} style={{minHeight:48,justifyContent:'center'}} className={`p-3 border rounded-xl ${selectedStatus===status?'bg-indigo-100 border-indigo-600':'bg-white border-gray-300'}`}><Text className="text-indigo-900">{selectedStatus===status?'✓ ':''}{label}</Text></TouchableOpacity>)}</View>}
      </Card>;
    }}
    ListEmptyComponent={!loading&&<Text className="text-gray-600 text-center my-4">{loadError?'Could not load the roster. Tap Refresh to retry.':'No matching students.'}</Text>}
    ListFooterComponent={<View style={{gap:12,paddingTop:4}}>
      <Button accessibilityLabel="Save attendance" disabled={saving||loading||loadError||!Object.keys(changes).length} onPress={save}>{saving?'Saving…':`Save attendance (${Object.keys(changes).length})`}</Button>
      <Button variant="secondary" onPress={load} disabled={saving||loading}>Refresh</Button>
    </View>}/>
  {picker&&<DateTimePicker value={date} mode="date" onChange={(event,value)=>{setPicker(false);if(value&&event.type!=='dismissed')setDate(value);}}/>}</Screen>;
}
