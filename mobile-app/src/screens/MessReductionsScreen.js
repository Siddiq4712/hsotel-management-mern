import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { API_BASE_URL, reductionAPI } from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { normalizeRole } from '../utils/role';
import Header from '../components/common/Header';

const categories = [
  ['medical', 'Medical leave', 'Doctor’s prescription', 'Absent'],
  ['od', 'OD — NSS / NCC / college participation', 'OD letter', 'OD'],
  ['internship', 'Internship', 'Offer letter', 'OD'],
  ['study_holiday', 'Study holiday', 'Tutor-signed reduction letter', 'Absent']
];
const empty = {category:'medical',from_date:moment().format('YYYY-MM-DD'),to_date:moment().format('YYYY-MM-DD'),reason:'',activity:''};
const statusLabel = status => ({pending_admin:'Pending review',approved_by_admin:'Approved by admin',approved_by_warden:'Approved by warden',needs_correction:'Returned for correction',cancelled:'Cancelled',rejected_by_admin:'Rejected by admin',rejected_by_warden:'Rejected by warden'}[status] || status);
const Button = ({children,onPress,disabled}) => <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} className={`rounded-lg p-3 my-1 ${disabled?'bg-gray-200':'bg-indigo-600'}`}><Text className="text-white text-center font-semibold">{children}</Text></TouchableOpacity>;

export default function MessReductionsScreen() {
  const { user } = useAuth();
  const actualRole = normalizeRole(user?.role ?? user?.roleName);
  const reviewer = ['warden','admin'].includes(actualRole), role = reviewer ? actualRole : 'student';
  const [rows,setRows]=useState([]),[values,setValues]=useState(empty),[document,setDocument]=useState(null),[editing,setEditing]=useState(null);
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[picker,setPicker]=useState(null),[status,setStatus]=useState('all');
  const [decision,setDecision]=useState(null),[remarks,setRemarks]=useState('');
  const busy=useRef(false);
  const info=categories.find(c=>c[0]===values.category);
  const load=useCallback(async()=>{
    setLoading(true);
    try{setRows((await reductionAPI.list(role,{status})).data.data||[]);}catch(error){Alert.alert('Unable to load requests',error.message);}finally{setLoading(false);}
  },[role,status]);
  useEffect(()=>{load();},[load]);
  const pick=async()=>{
    try{
      const result=await DocumentPicker.getDocumentAsync({type:['application/pdf','image/png','image/jpeg'],copyToCacheDirectory:true,multiple:false});
      if(result.canceled)return;
      if(result.assets[0].size>5*1024*1024)return Alert.alert('Document too large','Choose a file up to 5 MB.');
      setDocument(result.assets[0]);
    }catch(error){Alert.alert('Cannot select document',error.message);}
  };
  const submit=async()=>{
    if(busy.current)return;
    const days=moment(values.to_date).diff(moment(values.from_date),'days')+1;
    if(!info||!moment(values.from_date,'YYYY-MM-DD',true).isValid()||!moment(values.to_date,'YYYY-MM-DD',true).isValid()||days<1||days>366||values.reason.trim().length<5)return Alert.alert('Check the request','Choose valid dates and enter a reason of at least five characters.');
    if(!document&&!editing?.document)return Alert.alert('Document required',info[2]);
    const data=new FormData();Object.entries(values).forEach(([key,value])=>data.append(key,value));
    if(document)data.append('document',Platform.OS==='web'?document.file:{uri:document.uri,name:document.name,type:document.mimeType||'application/pdf'});
    busy.current=true;setSaving(true);
    try{
      const response=editing?await reductionAPI.revise(editing.id,data):await reductionAPI.submit(data);
      Alert.alert('Submitted',response.data.message);setValues(empty);setDocument(null);setEditing(null);await load();
    }catch(error){Alert.alert('Cannot submit',error.message);}finally{busy.current=false;setSaving(false);}
  };
  const viewDocument=async row=>{
    const token=await AsyncStorage.getItem('token');
    const url=`${API_BASE_URL}/${role}/day-reduction-requests/${row.id}/document`;
    let local;
    try{
      if(Platform.OS==='web'){
        const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('Document unavailable');
        const objectUrl=URL.createObjectURL(await response.blob());window.open(objectUrl,'_blank');setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);return;
      }
      const ext=row.document.mime==='application/pdf'?'pdf':row.document.mime==='image/png'?'png':'jpg';
      local=`${FileSystem.cacheDirectory}reduction-${row.id}-${Date.now()}.${ext}`;
      const result=await FileSystem.downloadAsync(url,local,{headers:{Authorization:`Bearer ${token}`}});
      if(result.status!==200)throw new Error('Document unavailable');
      if(!await Sharing.isAvailableAsync())throw new Error('This device cannot open document actions.');
      await Sharing.shareAsync(result.uri,{mimeType:row.document.mime,dialogTitle:'Open supporting document'});
    }catch(error){Alert.alert('Cannot open document',error.message);}finally{if(local)await FileSystem.deleteAsync(local,{idempotent:true}).catch(()=>{});}
  };
  const decide=async()=>{
    if(busy.current)return;
    if(decision.action!=='approve'&&remarks.trim().length<5)return Alert.alert('Reason required','Enter at least five characters.');
    busy.current=true;setSaving(true);
    try{const response=await reductionAPI.decide(role,decision.row.id,{action:decision.action,remarks});Alert.alert('Updated',response.data.message);setDecision(null);await load();}
    catch(error){Alert.alert('Cannot update',error.message);}finally{busy.current=false;setSaving(false);}
  };
  const choose=(row,action)=>{setDecision({row,action});setRemarks('');};
  return <View className="flex-1 bg-gray-50"><Header/><ScrollView contentContainerStyle={{padding:16,paddingBottom:40}} keyboardShouldPersistTaps="handled">
    <Text className="text-2xl font-bold mb-3">Mess Reductions</Text>
    <Text className="p-3 bg-blue-50 mb-4">Only documented requests approved by a warden or admin reduce food charges on operational days. Attendance alone grants no reduction. Water and other charges are unchanged.</Text>
    {!reviewer&&<View className="p-4 bg-white rounded-xl mb-4">
      <Text className="font-bold">{editing?`Resubmit #${editing.id}`:'New request'}</Text>
      <Text>Category</Text><Picker selectedValue={values.category} onValueChange={category=>setValues(v=>({...v,category}))}>{categories.map(c=><Picker.Item key={c[0]} label={c[1]} value={c[0]}/>)}</Picker>
      {['from_date','to_date'].map(field=><View key={field}><Text>{field==='from_date'?'Start date':'End date'}</Text>
        {Platform.OS==='web'?<TextInput accessibilityLabel={field==='from_date'?'Start date':'End date'} value={values[field]} placeholder="YYYY-MM-DD" onChangeText={value=>setValues(v=>({...v,[field]:value}))} className="border border-gray-300 p-3 rounded-lg"/>
          :<Button onPress={()=>setPicker(field)}>{values[field]}</Button>}</View>)}
      <Text className="my-2">{moment(values.to_date).diff(moment(values.from_date),'days')+1} requested days, inclusive. Approval marks dates {info?.[3]}.</Text>
      <TextInput accessibilityLabel="Activity" placeholder="Activity / organization (optional)" maxLength={150} value={values.activity} onChangeText={activity=>setValues(v=>({...v,activity}))} className="border border-gray-300 p-3 rounded-lg my-2"/>
      <TextInput accessibilityLabel="Reason" placeholder="Reason" multiline maxLength={2000} value={values.reason} onChangeText={reason=>setValues(v=>({...v,reason}))} className="border border-gray-300 p-3 rounded-lg my-2"/>
      <Text>Required: {info?.[2]}. PDF / PNG / JPEG, up to 5 MB.</Text><Button disabled={saving} onPress={pick}>{document?.name||editing?.document?.name||'Choose supporting document'}</Button>
      <Button disabled={saving} onPress={submit}>{saving?'Submitting…':'Submit for approval'}</Button>
      {editing&&<Button disabled={saving} onPress={()=>{setEditing(null);setValues(empty);setDocument(null);}}>New request</Button>}
    </View>}
    <Text>Filter requests</Text><Picker selectedValue={status} onValueChange={setStatus}>{[['all','All'],['pending_admin','Pending review'],['approved','Approved'],['needs_correction','Returned'],['rejected','Rejected'],['cancelled','Cancelled']].map(([value,label])=><Picker.Item key={value} value={value} label={label}/>)}</Picker>
    <Button onPress={load}>Refresh</Button>{loading&&<ActivityIndicator/>}
    {!loading&&rows.length===0&&<Text className="my-4">No matching requests.</Text>}
    {rows.map(row=><View key={row.id} className="p-4 bg-white border border-gray-200 rounded-xl my-2">
      <Text className="font-bold">#{row.id} · {categories.find(c=>c[0]===row.category)?.[1]||'Legacy request'}</Text>
      {reviewer&&<Text>{row.Student?.userName} · {row.Student?.roll_number} · {row.Hostel?.name}</Text>}
      <Text>{row.from_date} → {row.to_date} · {row.requested_days} days</Text><Text className="font-semibold my-2">{statusLabel(row.status)}</Text><Text>{row.reason}</Text><Text>{row.admin_remarks||row.warden_remarks}</Text>
      {row.document&&<Button onPress={()=>viewDocument(row)}>Open supporting document</Button>}
      {row.legacy&&<Text>Legacy request: resubmit category and supporting document.</Text>}
      {reviewer&&['pending_admin','needs_correction'].includes(row.status)&&<>
        <Button disabled={saving||row.legacy||!row.document} onPress={()=>choose(row,'approve')}>Approve date range</Button>
        <Button disabled={saving} onPress={()=>choose(row,'reject')}>Reject</Button><Button disabled={saving} onPress={()=>choose(row,'return')}>Return for correction</Button>
      </>}
      {reviewer&&!row.legacy&&row.status.startsWith('approved')&&<Button disabled={saving} onPress={()=>choose(row,'cancel')}>Cancel approval</Button>}
      {!reviewer&&['pending_admin','needs_correction','rejected_by_admin','rejected_by_warden'].includes(row.status)&&<Button disabled={saving} onPress={()=>{setEditing(row);setValues({category:row.category||'medical',from_date:row.from_date,to_date:row.to_date,reason:row.reason,activity:row.activity||''});setDocument(null);}}>Edit / resubmit</Button>}
      {!reviewer&&['pending_admin','needs_correction'].includes(row.status)&&<Button disabled={saving} onPress={()=>choose(row,'cancel')}>Cancel request</Button>}
      {(row.Decisions||[]).map(d=><Text key={d.id}>{d.action} · {d.Actor?.userName||d.actor_role} · {d.remarks}</Text>)}
    </View>)}
  </ScrollView>
    {picker&&<DateTimePicker value={moment(values[picker]).toDate()} mode="date" onChange={(event,date)=>{const field=picker;setPicker(null);if(date&&event.type!=='dismissed')setValues(v=>({...v,[field]:moment(date).format('YYYY-MM-DD')}));}}/>}
    <Modal visible={Boolean(decision)} transparent animationType="fade" onRequestClose={()=>!saving&&setDecision(null)}><View className="flex-1 justify-center p-6 bg-black/40"><View className="bg-white rounded-xl p-5">
      <Text className="font-bold text-lg">{decision?.action} reduction #{decision?.row.id}</Text>
      <Text>{decision?.row.from_date} → {decision?.row.to_date}. {decision?.action==='approve'?`Attendance becomes ${decision.row.attendance_status==='A'?'Absent':'OD'}.`:'Cancellation restores approval-generated attendance. Recorded bills are protected.'}</Text>
      <TextInput accessibilityLabel="Decision remarks" placeholder={decision?.action==='approve'?'Remarks (optional)':'Reason (required)'} multiline maxLength={2000} value={remarks} onChangeText={setRemarks} className="border border-gray-300 p-3 rounded-lg my-3"/>
      <Button disabled={saving} onPress={decide}>Confirm decision</Button><Button disabled={saving} onPress={()=>setDecision(null)}>Back</Button>
    </View></View></Modal>
  </View>;
}
