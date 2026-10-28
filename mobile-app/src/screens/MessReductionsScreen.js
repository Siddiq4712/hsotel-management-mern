import { withScreenPermission } from '../auth/PermissionContext';
import ApplicationDetails from '../components/student/ApplicationDetails';
import { requestReview } from '../utils/requestDetails';
import { RequestPage, RequestField, RequestSelect, NewRequestCard, ApplicationCard, requestStyles } from '../components/student/RequestUI';
import { useStudentVisible } from '../components/student/StudentPresentation';
import { FileText, Upload } from 'lucide-react-native';
import ProgressiveRows from "../components/common/ProgressiveRows";
import { Text } from "../components/common/ReferenceDesign";
import DateRangeField from '../components/common/DateRangeField';
import ReductionRequestCard from '../components/common/ReductionRequestCard';
import StudentHeader from '../components/student/StudentHeader';
import colors from '../theme/colors';
import Screen from '../components/common/Screen';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import AppButton from '../components/common/Button';
import ReviewSheet from '../components/common/ReviewSheet';
import { SearchField } from '../components/warden/WardenUI';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { Picker } from '../components/common/Picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { API_BASE_URL, reductionAPI } from '../api/api';
import { useAuth } from '../hooks/useAuth';
import { normalizeRole } from '../utils/role';
import Header from '../components/common/Header';
import { useFocusEffect } from '@react-navigation/native';

const categories = [
  ['medical', 'Medical leave', 'Doctor’s prescription', 'Absent'],
  ['od', 'OD — NSS / NCC / college participation', 'OD letter', 'OD'],
  ['internship', 'Internship', 'Offer letter', 'OD'],
  ['study_holiday', 'Study holiday', 'Tutor-signed reduction letter', 'Absent']
];
const empty = {category:'',from_date:moment().format('YYYY-MM-DD'),to_date:moment().format('YYYY-MM-DD'),reason:'',activity:''};
const Button = ({ children, onPress, disabled, permissionAction, variant = 'primary' }) => <AppButton permissionAction={permissionAction} variant={variant} disabled={disabled} onPress={onPress} style={{ marginVertical: 4 }}>{children}</AppButton>;

function MessReductionsScreen({ studentLayout = false, embedded = false, requestId, view, onViewChange, navigation, route }) {
  const { user } = useAuth();
  const isVisible = useStudentVisible();
  const initialRequest = route?.params?.request;
  const actualRole = normalizeRole(user?.role ?? user?.roleName);
  const reviewer = ['warden','admin'].includes(actualRole), role = reviewer ? actualRole : 'student';
  const [rows,setRows]=useState([]),[values,setValues]=useState(() => initialRequest ? {category:initialRequest.category||'',from_date:initialRequest.from_date,to_date:initialRequest.to_date,reason:initialRequest.reason,activity:initialRequest.activity||''} : {...empty,from_date:moment().format('YYYY-MM-DD'),to_date:moment().format('YYYY-MM-DD')}),[document,setDocument]=useState(null),[editing,setEditing]=useState(initialRequest || null);
  const [loading,setLoading]=useState(view === 'details'),[saving,setSaving]=useState(false),[status,setStatus]=useState('all');
  const [decision,setDecision]=useState(null),[remarks,setRemarks]=useState('');
  const [search,setSearch]=useState('');
  const busy=useRef(false);
  const info=categories.find(c=>c[0]===values.category);
  const load=useCallback(async()=>{
    setLoading(true);
    try{setRows((await reductionAPI.list(role,{status})).data.data||[]);}catch(error){Alert.alert('Unable to load requests',error.message);}finally{setLoading(false);}
  },[role,status]);
  useFocusEffect(useCallback(()=>{if(isVisible && (reviewer || view !== 'form'))load();},[reviewer,load,isVisible,view]));
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
      Alert.alert('Submitted',response.data.message);setValues(empty);setDocument(null);setEditing(null);if(view === 'form')navigation.goBack();else {onViewChange?.('history');await load();}
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
  if (studentLayout && !reviewer) {
    const decisionModal = <Modal visible={Boolean(decision)} transparent animationType="fade" onRequestClose={()=>!saving&&setDecision(null)}>
      <View style={requestStyles.overlay}><Card style={{ gap: 14 }}>
        <Text style={requestStyles.sectionTitle}>Cancel reduction request</Text>
        <Input accessibilityLabel="Cancellation reason" placeholder="Cancellation reason" multiline maxLength={2000} value={remarks} onChangeText={setRemarks} style={requestStyles.input}/>
        <AppButton permissionAction="delete" variant="danger" loading={saving} onPress={decide}>Confirm cancellation</AppButton>
        <AppButton variant="ghost" disabled={saving} onPress={()=>setDecision(null)}>Back</AppButton>
      </Card></View>
    </Modal>;
    if (view === 'details') {
      const row = rows.find(item => String(item.id) === String(requestId));
      return <RequestPage title="Reduction request details" description={`Request #MR-${requestId}`} navigation={navigation} busy={saving} contentStyle={{padding:8,paddingTop:18,paddingBottom:32}}>
        {loading ? <ActivityIndicator color={colors.primary}/> : row ? <ApplicationDetails kind="reduction" onDocument={viewDocument} onBack={()=>navigation.goBack()} row={row} categoryLabel={categories.find(c=>c[0]===row.category)?.[1]||'Legacy request'} submittedBy={user?.userName||user?.username}>
          {row.legacy&&<Text style={requestStyles.small}>Resubmit with a category and supporting document.</Text>}
          {['pending_admin','needs_correction','rejected_by_admin','rejected_by_warden'].includes(row.status)&&<AppButton variant="secondary" disabled={saving} onPress={()=>navigation.navigate('MessReductionRequest',{request:row})}>Edit / resubmit</AppButton>}
          {['pending_admin','needs_correction'].includes(row.status)&&<AppButton permissionAction="delete" variant="danger" disabled={saving} onPress={()=>choose(row,'cancel')}>Cancel request</AppButton>}
        </ApplicationDetails> : <Text style={requestStyles.small}>This reduction request is unavailable.</Text>}
        {decisionModal}
      </RequestPage>;
    }
    if (view === 'form') return <RequestPage title="Mess reduction request" description="Submit documented evidence for review" navigation={navigation} busy={saving}>
      <RequestField label="Reduction category" required>
        <RequestSelect label="Reduction category" placeholder="Select a category" value={values.category} options={categories.map(c=>[c[0],c[1]])} disabled={saving} onChange={category=>setValues(v=>({...v,category}))}/>
      </RequestField>
      <DateRangeField compact label="Reduction dates *" from={values.from_date} to={values.to_date} disabled={saving} onChange={(from_date,to_date)=>setValues(v=>({...v,from_date,to_date}))}/>
      <RequestField label="Activity / organization" hint="Optional · Maximum 150 characters">
        <Input accessibilityLabel="Activity / organization" placeholder="e.g. NEC Technical Symposium" editable={!saving} maxLength={150} value={values.activity} onChangeText={activity=>setValues(v=>({...v,activity}))} style={requestStyles.input}/>
      </RequestField>
      <RequestField label="Reason" required hint="Minimum 5 characters · Maximum 2,000 characters">
        <Input accessibilityLabel="Reduction reason" placeholder="Explain why you are requesting a reduction" editable={!saving} multiline maxLength={2000} value={values.reason} onChangeText={reason=>setValues(v=>({...v,reason}))} style={[requestStyles.input,{minHeight:120}]}/>
      </RequestField>
      <RequestField label="Supporting evidence" required hint={info?.[2]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Choose supporting evidence" disabled={saving} onPress={pick}
          style={{ flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:12,borderWidth:1,borderStyle:'dashed',borderColor:colors.primary,backgroundColor:colors.primarySoft }}>
          <View style={requestStyles.icon}><Upload size={22} color={colors.primary}/></View>
          <View style={{flex:1,gap:4}}><Text style={{fontSize:13,fontWeight:'700',color:colors.text}}>{document?.name||editing?.document?.name||'Choose PDF, PNG or JPEG'}</Text><Text style={requestStyles.small}>Maximum file size 5 MB</Text></View>
          <Text style={{fontSize:12,fontWeight:'600',color:colors.primary}}>Browse</Text>
        </TouchableOpacity>
      </RequestField>
      <View style={{gap:10}}><AppButton permissionAction={editing ? 'edit' : 'create'} loading={saving} onPress={submit}>Submit for approval</AppButton>
        <AppButton variant="secondary" disabled={saving} onPress={()=>navigation.goBack()} style={requestStyles.outline}>Cancel</AppButton></View>
    </RequestPage>;
    return <Screen className="flex-1 bg-background">
      {!embedded && <StudentHeader title="Mess reductions" back/>}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:32,gap:16}}>
        <NewRequestCard icon={FileText} title="Mess reduction" description="Submit documented evidence for review." button="New reduction request" onPress={()=>navigation.navigate('MessReductionRequest')}/>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={requestStyles.sectionTitle}>Your applications</Text><AppButton variant="ghost" disabled={loading} onPress={load}>Refresh</AppButton></View>
        <RequestSelect label="Filter reduction requests" value={status} onChange={setStatus} options={[["all","All requests"],["pending_admin","Pending review"],["approved","Approved"],["needs_correction","Returned"],["rejected","Rejected"],["cancelled","Cancelled"]]}/>
        {loading&&<ActivityIndicator color={colors.primary}/>}
        {!loading&&!rows.length&&<Card><Text style={requestStyles.small}>No matching reduction requests.</Text></Card>}
        <ProgressiveRows data={rows} resetKey={status} renderItem={row=><ApplicationCard key={row.id} title={categories.find(c=>c[0]===row.category)?.[1]||'Legacy request'} reference={`MR-${row.id}`} status={row.status}
          dates={`${moment(row.from_date).format('DD MMM')} → ${moment(row.to_date).format('DD MMM YYYY')} · ${moment(row.to_date).diff(moment(row.from_date),'days')+1} days`}
          correctionRemarks={row.status === 'needs_correction' ? requestReview('reduction', row).remarks : null}
          onEditResubmit={row.status === 'needs_correction' ? ()=>navigation.navigate('MessReductionRequest',{request:row}) : undefined}
          onPress={()=>navigation.navigate('ReductionRequestDetails',{id:row.id})}/>}/>
      </ScrollView>{decisionModal}
    </Screen>;
  }
  const ReviewerCard = requestId != null ? ApplicationDetails : ReductionRequestCard;
  if (reviewer) return <Screen className="flex-1 bg-background"><Header />
    <FlatList style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:32}}
      refreshing={loading} onRefresh={load}
      ListHeaderComponent={requestId == null && <View style={{gap:12,paddingBottom:16}}>
        <SearchField accessibilityLabel="Search reduction requests" placeholder="Search reductions" value={search} onChangeText={setSearch}/>
        <View style={{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:12,overflow:'hidden'}}><Picker accessibilityLabel="Filter reduction requests" selectedValue={status} onValueChange={setStatus}>
          {[['all','All requests'],['pending_admin','Pending review'],['approved','Approved'],['needs_correction','Needs correction'],['rejected','Rejected'],['cancelled','Cancelled']].map(([value,label])=><Picker.Item key={value} value={value} label={label}/>)}</Picker></View>
        {loading&&<ActivityIndicator color={colors.primary}/>}
      </View>}
      data={rows.filter(row=>requestId != null ? String(row.id) === String(requestId) : [row.Student?.userName,row.Student?.roll_number,row.category,row.reason,row.activity].filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase()))}
      keyExtractor={row=>String(row.id)}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary}/> : <Text style={{color:colors.mutedText,textAlign:'center',padding:24}}>{requestId != null ? 'This reduction request is unavailable.' : 'No matching reduction requests.'}</Text>}
      renderItem={({item:row})=><ReviewerCard kind="reduction" onDocument={viewDocument} wardenLayout={requestId == null} detailLayout={requestId != null} row={row} categoryLabel={categories.find(c=>c[0]===row.category)?.[1]||'Legacy request'}
        queueActions={['pending_admin','needs_correction'].includes(row.status)?<AppButton permissionAction="approve" disabled={saving||row.legacy||!row.document} onPress={()=>choose(row,'approve')}>Approve</AppButton>:null}>
        {requestId == null&&row.document&&<Button variant="secondary" onPress={()=>viewDocument(row)}>Open supporting document</Button>}
        {row.legacy&&<Text>Legacy request: resubmit category and supporting document.</Text>}
        {['pending_admin','needs_correction'].includes(row.status)&&<>
          <Button permissionAction="approve" disabled={saving||row.legacy||!row.document} onPress={()=>choose(row,'approve')}>Approve date range</Button>
          <Button permissionAction="approve" variant="danger" disabled={saving} onPress={()=>choose(row,'reject')}>Reject</Button><Button permissionAction="approve" variant="secondary" disabled={saving} onPress={()=>choose(row,'return')}>Return for correction</Button>
        </>}
        {!row.legacy&&row.status.startsWith('approved')&&<Button permissionAction="approve" variant="danger" disabled={saving} onPress={()=>choose(row,'cancel')}>Cancel approval</Button>}
      </ReviewerCard>}/>
    <ReviewSheet visible={Boolean(decision)} title={`${decision?.action||'Review'} reduction #${decision?.row.id||''}`} busy={saving} onClose={()=>setDecision(null)}>
      <Text>{decision?.row.from_date} → {decision?.row.to_date}. {decision?.action==='approve'?`Attendance becomes ${decision.row.attendance_status==='A'?'Absent':'OD'}. Only eligible food charges are reduced.`:decision?.action==='cancel'?'Cancellation restores approval-generated attendance. Recorded bills are protected.':decision?.action==='return'?'The student can correct and resubmit the request. Enter the required changes below.':'Enter a reason for rejecting this request.'}</Text>
      <Input accessibilityLabel="Decision remarks" placeholder={decision?.action==='approve'?'Remarks (optional)':'Reason (required)'} multiline maxLength={2000} value={remarks} onChangeText={setRemarks} style={{borderWidth:1,borderColor:colors.border,borderRadius:12,padding:12}}/>
      <AppButton permissionAction="approve" loading={saving} onPress={decide}>Confirm decision</AppButton>
    </ReviewSheet>
  </Screen>;
  return <Screen className="flex-1 bg-background"><Header/><ScrollView contentContainerStyle={{padding:16,paddingBottom:40}} keyboardShouldPersistTaps="handled">
    <Text className="text-2xl font-bold mb-3">Mess Reductions</Text>
    {!reviewer&&<View className="p-4 bg-white rounded-xl mb-4">
      <Text className="font-bold">{editing?`Resubmit #${editing.id}`:'New request'}</Text>
      <Text>Category</Text><Picker selectedValue={values.category} onValueChange={category=>setValues(v=>({...v,category}))}>{categories.map(c=><Picker.Item key={c[0]} label={c[1]} value={c[0]}/>)}</Picker>
      <DateRangeField from={values.from_date} to={values.to_date} disabled={saving}
        onChange={(from_date,to_date)=>setValues(v=>({...v,from_date,to_date}))}/>
      <Text className="my-2">Approval marks dates {info?.[3]}.</Text>
      <Input accessibilityLabel="Activity" placeholder="Activity / organization (optional)" maxLength={150} value={values.activity} onChangeText={activity=>setValues(v=>({...v,activity}))} className="border border-gray-300 p-3 rounded-xl my-2"/>
      <Input accessibilityLabel="Reason" placeholder="Reason" multiline maxLength={2000} value={values.reason} onChangeText={reason=>setValues(v=>({...v,reason}))} className="border border-gray-300 p-3 rounded-xl my-2"/>
      <Text>Required: {info?.[2]}. PDF / PNG / JPEG, up to 5 MB.</Text><Button disabled={saving} onPress={pick}>{document?.name||editing?.document?.name||'Choose supporting document'}</Button>
      <Button permissionAction={editing ? 'edit' : 'create'} disabled={saving} onPress={submit}>{saving?'Submitting…':'Submit for approval'}</Button>
      {editing&&<Button disabled={saving} onPress={()=>{setEditing(null);setValues(empty);setDocument(null);}}>New request</Button>}
    </View>}
    <Text>Filter requests</Text><Picker selectedValue={status} onValueChange={setStatus}>{[['all','All'],['pending_admin','Pending review'],['approved','Approved'],['needs_correction','Returned'],['rejected','Rejected'],['cancelled','Cancelled']].map(([value,label])=><Picker.Item key={value} value={value} label={label}/>)}</Picker>
    <Button onPress={load}>Refresh</Button>{loading&&<ActivityIndicator/>}
    {!loading&&rows.length===0&&<Text className="my-4">No matching requests.</Text>}
    <ProgressiveRows data={rows} resetKey={status} renderItem={row=><ReductionRequestCard key={row.id} row={row}
        categoryLabel={categories.find(c=>c[0]===row.category)?.[1]||'Legacy request'}
        submittedBy={!reviewer?(user?.userName||user?.username):undefined}>
      {row.document&&<Button variant="secondary" onPress={()=>viewDocument(row)}>Open supporting document</Button>}
      {row.legacy&&<Text>Legacy request: resubmit category and supporting document.</Text>}
      {reviewer&&['pending_admin','needs_correction'].includes(row.status)&&<>
        <Button permissionAction="approve" disabled={saving||row.legacy||!row.document} onPress={()=>choose(row,'approve')}>Approve date range</Button>
        <Button permissionAction="approve" variant="danger" disabled={saving} onPress={()=>choose(row,'reject')}>Reject</Button><Button permissionAction="approve" variant="secondary" disabled={saving} onPress={()=>choose(row,'return')}>Return for correction</Button>
      </>}
      {reviewer&&!row.legacy&&row.status.startsWith('approved')&&<Button permissionAction="approve" variant="danger" disabled={saving} onPress={()=>choose(row,'cancel')}>Cancel approval</Button>}
      {!reviewer&&['pending_admin','needs_correction','rejected_by_admin','rejected_by_warden'].includes(row.status)&&<Button disabled={saving} onPress={()=>{setEditing(row);setValues({category:row.category||'medical',from_date:row.from_date,to_date:row.to_date,reason:row.reason,activity:row.activity||''});setDocument(null);}}>Edit / resubmit</Button>}
      {!reviewer&&['pending_admin','needs_correction'].includes(row.status)&&<Button permissionAction="delete" disabled={saving} onPress={()=>choose(row,'cancel')}>Cancel request</Button>}
    </ReductionRequestCard>} />
  </ScrollView>
    <Modal visible={Boolean(decision)} transparent animationType="fade" onRequestClose={()=>!saving&&setDecision(null)}><View className="flex-1 justify-center p-6 bg-black/40"><View className="bg-white rounded-xl p-5">
      <Text className="font-bold text-lg">{decision?.action} reduction #{decision?.row.id}</Text>
      <Text>{decision?.row.from_date} → {decision?.row.to_date}. {decision?.action==='approve'?`Attendance becomes ${decision.row.attendance_status==='A'?'Absent':'OD'}.`:'Cancellation restores approval-generated attendance. Recorded bills are protected.'}</Text>
      <Input accessibilityLabel="Decision remarks" placeholder={decision?.action==='approve'?'Remarks (optional)':'Reason (required)'} multiline maxLength={2000} value={remarks} onChangeText={setRemarks} className="border border-gray-300 p-3 rounded-xl my-3"/>
      <Button permissionAction={reviewer ? 'approve' : 'delete'} disabled={saving} onPress={decide}>Confirm decision</Button><Button disabled={saving} onPress={()=>setDecision(null)}>Back</Button>
    </View></View></Modal>
  </Screen>;
}

export default withScreenPermission(MessReductionsScreen, (_, role) => role === 'warden' ? 'warden-reductions' : 'my-reductions');
