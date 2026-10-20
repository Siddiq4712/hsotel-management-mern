import DateRangeField from '../components/common/DateRangeField';
import ReductionRequestCard from '../components/common/ReductionRequestCard';
import StudentHeader from '../components/student/StudentHeader';
import colors from '../theme/colors';
import Screen from '../components/common/Screen';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import AppButton from '../components/common/Button';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
const Button = ({ children, onPress, disabled, variant = 'primary' }) => <AppButton variant={variant} disabled={disabled} onPress={onPress} style={{ marginVertical: 4 }}>{children}</AppButton>;

export default function MessReductionsScreen({ studentLayout = false, embedded = false }) {
  const { user } = useAuth();
  const actualRole = normalizeRole(user?.role ?? user?.roleName);
  const reviewer = ['warden','admin'].includes(actualRole), role = reviewer ? actualRole : 'student';
  const [rows,setRows]=useState([]),[values,setValues]=useState(empty),[document,setDocument]=useState(null),[editing,setEditing]=useState(null);
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[status,setStatus]=useState('all');
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
  if (studentLayout && !reviewer) return <Screen className="flex-1 bg-background">
    {!embedded && <StudentHeader title="Mess reductions" back />}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
      <View className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <Text className="font-semibold text-indigo-900 mb-2">Documented reductions</Text>
        <Text className="text-sm text-gray-600 leading-5">Only approved operational days reduce food charges. Attendance alone does not grant a reduction. Water and other charges stay unchanged.</Text>
      </View>
      <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
        <Text className="text-lg font-bold text-indigo-900 mb-1">{editing ? `Revise request #${editing.id}` : 'New reduction request'}</Text>
        <Text className="text-sm text-gray-600 mb-5">Choose the category and dates, then attach the required evidence.</Text>
        <Text className="text-sm font-semibold text-gray-700 mb-2">Category *</Text>
        <View className="border border-gray-200 bg-gray-50 rounded-xl mb-4">
          <Picker accessibilityLabel="Reduction category" selectedValue={values.category} onValueChange={category=>setValues(v=>({...v,category}))}>
            {categories.map(c=><Picker.Item key={c[0]} label={c[1]} value={c[0]}/>)}</Picker>
        </View>
        <DateRangeField from={values.from_date} to={values.to_date} disabled={saving}
          onChange={(from_date,to_date)=>setValues(v=>({...v,from_date,to_date}))}/>
        <Text className="text-xs text-gray-600 my-3">Approved dates are marked {info?.[3]}.</Text>
        <Text className="text-sm font-semibold text-gray-700 mb-2">Activity / organization</Text>
        <Input accessibilityLabel="Activity" placeholder="Optional activity or organization" maxLength={150} value={values.activity} onChangeText={activity=>setValues(v=>({...v,activity}))} className="border border-gray-200 bg-gray-50 p-3 rounded-xl mb-4"/>
        <Text className="text-sm font-semibold text-gray-700 mb-2">Reason *</Text>
        <Input accessibilityLabel="Reason" placeholder="Explain why you are requesting a reduction" multiline maxLength={2000} value={values.reason} onChangeText={reason=>setValues(v=>({...v,reason}))} className="border border-gray-200 bg-gray-50 p-3 rounded-xl mb-4"/>
        <Text className="text-sm font-semibold text-gray-700 mb-2">Supporting document *</Text>
        <Text className="text-xs text-gray-600 mb-3">{info?.[2]} · PDF, PNG or JPEG · Up to 5 MB</Text>
        <AppButton variant="secondary" disabled={saving} onPress={pick}>{document?.name||editing?.document?.name||'Choose supporting document'}</AppButton>
        <AppButton disabled={saving} onPress={submit} style={{ backgroundColor: colors.primary, padding: 14, marginTop: 16 }}>{saving?'Submitting…':'Submit for approval'}</AppButton>
        {editing&&<AppButton variant="ghost" disabled={saving} onPress={()=>{setEditing(null);setValues(empty);setDocument(null);}}>Start a new request</AppButton>}
      </Card>
      <View className="flex-row justify-between items-center"><Text className="text-base font-bold text-gray-900">Request history</Text>
        <AppButton variant="ghost" disabled={loading} onPress={load}>Refresh</AppButton></View>
      <View className="border border-gray-200 rounded-xl bg-white"><Picker accessibilityLabel="Filter reduction requests" selectedValue={status} onValueChange={setStatus}>
        {[['all','All requests'],['pending_admin','Pending review'],['approved','Approved'],['needs_correction','Returned'],['rejected','Rejected'],['cancelled','Cancelled']].map(([value,label])=><Picker.Item key={value} value={value} label={label}/>)}</Picker></View>
      {loading&&<ActivityIndicator color={colors.primary}/>}
      {!loading&&!rows.length&&<Card><Text className="text-sm text-gray-600 text-center">No matching reduction requests.</Text></Card>}
      {rows.map(row=><ReductionRequestCard key={row.id} row={row}
        categoryLabel={categories.find(c=>c[0]===row.category)?.[1]||'Legacy request'}
        submittedBy={!reviewer?(user?.userName||user?.username):undefined}>
        {row.document&&<AppButton variant="secondary" onPress={()=>viewDocument(row)}>Open supporting document</AppButton>}
        {row.legacy&&<Text className="text-sm text-amber-700 mt-2">Resubmit with a category and supporting document.</Text>}
        {['pending_admin','needs_correction','rejected_by_admin','rejected_by_warden'].includes(row.status)&&<AppButton variant="secondary" disabled={saving} style={{ marginTop: 10, padding: 12, backgroundColor: colors.primarySoft }} onPress={()=>{setEditing(row);setValues({category:row.category||'medical',from_date:row.from_date,to_date:row.to_date,reason:row.reason,activity:row.activity||''});setDocument(null);}}>Edit / resubmit</AppButton>}
        {['pending_admin','needs_correction'].includes(row.status)&&<AppButton variant="ghost" disabled={saving} onPress={()=>choose(row,'cancel')}><Text className="text-sm font-semibold text-red-700">Cancel request</Text></AppButton>}
      </ReductionRequestCard>)}
    </ScrollView>
    <Modal visible={Boolean(decision)} transparent animationType="fade" onRequestClose={()=>!saving&&setDecision(null)}>
      <View className="flex-1 justify-center p-4 bg-black/40"><Card className="bg-white rounded-2xl p-5">
        <Text className="font-bold text-lg text-indigo-900 mb-2">Cancel reduction request</Text>
        <Text className="text-sm text-gray-600 mb-4">Add a reason for cancelling request #{decision?.row.id}.</Text>
        <Input accessibilityLabel="Decision remarks" placeholder="Cancellation reason" multiline maxLength={2000} value={remarks} onChangeText={setRemarks} className="border border-gray-200 bg-gray-50 p-3 rounded-xl mb-4"/>
        <AppButton variant="danger" disabled={saving} onPress={decide}>Confirm cancellation</AppButton><AppButton variant="ghost" disabled={saving} onPress={()=>setDecision(null)}>Back</AppButton>
      </Card></View>
    </Modal>
  </Screen>;
  return <Screen className="flex-1 bg-background"><Header/><ScrollView contentContainerStyle={{padding:16,paddingBottom:40}} keyboardShouldPersistTaps="handled">
    <Text className="text-2xl font-bold mb-3">Mess Reductions</Text>
    <Text className="p-3 bg-blue-50 mb-4">Only documented requests approved by a warden or admin reduce food charges on operational days. Attendance alone grants no reduction. Water and other charges are unchanged.</Text>
    {!reviewer&&<View className="p-4 bg-white rounded-xl mb-4">
      <Text className="font-bold">{editing?`Resubmit #${editing.id}`:'New request'}</Text>
      <Text>Category</Text><Picker selectedValue={values.category} onValueChange={category=>setValues(v=>({...v,category}))}>{categories.map(c=><Picker.Item key={c[0]} label={c[1]} value={c[0]}/>)}</Picker>
      <DateRangeField from={values.from_date} to={values.to_date} disabled={saving}
        onChange={(from_date,to_date)=>setValues(v=>({...v,from_date,to_date}))}/>
      <Text className="my-2">Approval marks dates {info?.[3]}.</Text>
      <Input accessibilityLabel="Activity" placeholder="Activity / organization (optional)" maxLength={150} value={values.activity} onChangeText={activity=>setValues(v=>({...v,activity}))} className="border border-gray-300 p-3 rounded-xl my-2"/>
      <Input accessibilityLabel="Reason" placeholder="Reason" multiline maxLength={2000} value={values.reason} onChangeText={reason=>setValues(v=>({...v,reason}))} className="border border-gray-300 p-3 rounded-xl my-2"/>
      <Text>Required: {info?.[2]}. PDF / PNG / JPEG, up to 5 MB.</Text><Button disabled={saving} onPress={pick}>{document?.name||editing?.document?.name||'Choose supporting document'}</Button>
      <Button disabled={saving} onPress={submit}>{saving?'Submitting…':'Submit for approval'}</Button>
      {editing&&<Button disabled={saving} onPress={()=>{setEditing(null);setValues(empty);setDocument(null);}}>New request</Button>}
    </View>}
    <Text>Filter requests</Text><Picker selectedValue={status} onValueChange={setStatus}>{[['all','All'],['pending_admin','Pending review'],['approved','Approved'],['needs_correction','Returned'],['rejected','Rejected'],['cancelled','Cancelled']].map(([value,label])=><Picker.Item key={value} value={value} label={label}/>)}</Picker>
    <Button onPress={load}>Refresh</Button>{loading&&<ActivityIndicator/>}
    {!loading&&rows.length===0&&<Text className="my-4">No matching requests.</Text>}
    {rows.map(row=><ReductionRequestCard key={row.id} row={row}
        categoryLabel={categories.find(c=>c[0]===row.category)?.[1]||'Legacy request'}
        submittedBy={!reviewer?(user?.userName||user?.username):undefined}>
      {row.document&&<Button variant="secondary" onPress={()=>viewDocument(row)}>Open supporting document</Button>}
      {row.legacy&&<Text>Legacy request: resubmit category and supporting document.</Text>}
      {reviewer&&['pending_admin','needs_correction'].includes(row.status)&&<>
        <Button disabled={saving||row.legacy||!row.document} onPress={()=>choose(row,'approve')}>Approve date range</Button>
        <Button variant="danger" disabled={saving} onPress={()=>choose(row,'reject')}>Reject</Button><Button variant="secondary" disabled={saving} onPress={()=>choose(row,'return')}>Return for correction</Button>
      </>}
      {reviewer&&!row.legacy&&row.status.startsWith('approved')&&<Button variant="danger" disabled={saving} onPress={()=>choose(row,'cancel')}>Cancel approval</Button>}
      {!reviewer&&['pending_admin','needs_correction','rejected_by_admin','rejected_by_warden'].includes(row.status)&&<Button disabled={saving} onPress={()=>{setEditing(row);setValues({category:row.category||'medical',from_date:row.from_date,to_date:row.to_date,reason:row.reason,activity:row.activity||''});setDocument(null);}}>Edit / resubmit</Button>}
      {!reviewer&&['pending_admin','needs_correction'].includes(row.status)&&<Button disabled={saving} onPress={()=>choose(row,'cancel')}>Cancel request</Button>}
    </ReductionRequestCard>)}
  </ScrollView>
    <Modal visible={Boolean(decision)} transparent animationType="fade" onRequestClose={()=>!saving&&setDecision(null)}><View className="flex-1 justify-center p-6 bg-black/40"><View className="bg-white rounded-xl p-5">
      <Text className="font-bold text-lg">{decision?.action} reduction #{decision?.row.id}</Text>
      <Text>{decision?.row.from_date} → {decision?.row.to_date}. {decision?.action==='approve'?`Attendance becomes ${decision.row.attendance_status==='A'?'Absent':'OD'}.`:'Cancellation restores approval-generated attendance. Recorded bills are protected.'}</Text>
      <Input accessibilityLabel="Decision remarks" placeholder={decision?.action==='approve'?'Remarks (optional)':'Reason (required)'} multiline maxLength={2000} value={remarks} onChangeText={setRemarks} className="border border-gray-300 p-3 rounded-xl my-3"/>
      <Button disabled={saving} onPress={decide}>Confirm decision</Button><Button disabled={saving} onPress={()=>setDecision(null)}>Back</Button>
    </View></View></Modal>
  </Screen>;
}
