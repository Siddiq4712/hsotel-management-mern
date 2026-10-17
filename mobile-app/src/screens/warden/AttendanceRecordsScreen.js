import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';

export default function AttendanceRecordsScreen() {
  const [date,setDate]=useState(new Date()),[picker,setPicker]=useState(false),[students,setStudents]=useState([]),[records,setRecords]=useState([]);
  const [search,setSearch]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [loadError,setLoadError]=useState(false);
  const [changes,setChanges]=useState({});
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
  return <View className="flex-1 bg-gray-50"><Header/><View className="p-4 flex-1">
    <Text className="text-2xl font-bold mb-4">Attendance</Text>
    <Text className="bg-blue-50 p-3 mb-4">Presence records do not grant food reductions. Use Mess Reductions for documented approval. Approval-linked attendance is managed through its request.</Text>
    <TouchableOpacity disabled={saving||loading} className="bg-white border border-gray-200 p-3 rounded-lg mb-4" onPress={()=>setPicker(true)}><Text>{moment(date).format('DD MMM YYYY')} — select date</Text></TouchableOpacity>
    <TextInput accessibilityLabel="Search attendance" placeholder="Search name or roll number" value={search} onChangeText={setSearch} className="p-3 bg-white rounded-lg mb-4"/>
    <View className="flex-row mb-4" style={{gap:12}}>{[['P','Present all'],['A','Absent all']].map(([status,label])=><TouchableOpacity key={status} accessibilityRole="button" disabled={saving||loading||loadError||!editable.length} onPress={()=>markAll(status)} className={`flex-1 p-3 rounded-lg ${status==='P'?'bg-green-700':'bg-red-700'} ${saving||loading||loadError||!editable.length?'opacity-50':''}`}><Text className="text-white font-bold text-center">{label}</Text></TouchableOpacity>)}</View>
    <Text className="text-gray-600 mb-4">Select the whole roster, search and adjust individual students, then tap Save attendance to confirm. Approved reduction entries stay locked.</Text>
    {loading&&<ActivityIndicator/>}
    <FlatList data={students.filter(s=>`${s.userName||s.username} ${s.roll_number}`.toLowerCase().includes(search.toLowerCase()))} keyExtractor={s=>String(s.userId??s.id)} renderItem={({item})=>{
      const id=item.userId??item.id,record=records.find(r=>Number(r.student_id)===Number(id));
      const selectedStatus=changes[id]??record?.status;
      return <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
        <Text className="font-bold">{item.userName||item.username}</Text><Text>{item.roll_number}</Text>
        <Text className="my-2">{({P:'Present',A:'Absent',OD:'OD'})[selectedStatus]||'Unmarked'}</Text>
        {record?.reduction_request_id?<Text className="text-indigo-700">Approved reduction #{record.reduction_request_id} · {record.ReductionRequest?.category} · {record.MarkedBy?.userName}</Text>
          :<View className="flex-row" style={{gap:8}}>{[['P','Present'],['A','Absent'],['OD','OD']].map(([status,label])=><TouchableOpacity key={status} accessibilityRole="radio" accessibilityState={{checked:selectedStatus===status,disabled:saving||loading||loadError}} accessibilityLabel={`${label} for ${item.userName||item.username}`} disabled={saving||loading||loadError} onPress={()=>mark(id,status)} className={`p-3 border rounded-lg ${selectedStatus===status?'bg-indigo-100 border-indigo-600':'bg-white border-gray-300'}`}><Text className="text-indigo-900">{selectedStatus===status?'✓ ':''}{label}</Text></TouchableOpacity>)}</View>}
      </View>;
    }}/>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save attendance" disabled={saving||loading||loadError||!Object.keys(changes).length} onPress={save} className={`p-3 rounded-lg mb-4 ${saving||loading||loadError||!Object.keys(changes).length?'bg-indigo-300':'bg-indigo-700'}`}><Text className="text-white font-bold text-center">{saving?'Saving…':`Save attendance (${Object.keys(changes).length})`}</Text></TouchableOpacity>
    <TouchableOpacity onPress={load} disabled={saving||loading} className="p-3 bg-gray-200 rounded-lg"><Text className="text-center">Refresh</Text></TouchableOpacity>
  </View>{picker&&<DateTimePicker value={date} mode="date" onChange={(event,value)=>{setPicker(false);if(value&&event.type!=='dismissed')setDate(value);}}/>}</View>;
}
