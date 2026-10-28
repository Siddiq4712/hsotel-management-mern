import { PermissionButton as Button } from '../common/PermissionControls';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App, Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { wardenAPI } from '../../services/api';
import { initialBillingDate } from '../../utils/billingDate';
import { categoryInfo } from '../../utils/reductionOptions';
import { ScopeAnchor, useScopeDraft, useWorkspaceScope } from '../common/WorkspaceScope';

export default function AttendanceRecords() {
  const { message } = App.useApp();
  const [date, setDate] = useState(() => initialBillingDate().format('YYYY-MM-DD'));
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).get('view') === 'monthly' ? 'monthly' : 'daily');
  const [students, setStudents] = useState([]), [rows, setRows] = useState([]), [legacy, setLegacy] = useState([]);
  const [search, setSearch] = useState(''), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [loadError, setLoadError] = useState('');
  const savingRef = useRef(false);
  const scope = useWorkspaceScope();
  const needsHostel = scope?.kind === 'hostel' && scope.allHostels;
  useScopeDraft(Object.keys(changes).length > 0, saving);
  const load = useCallback(async () => {
    setLoading(true); setChanges({}); setLoadError('');
    try {
      const [people, records] = await Promise.all([wardenAPI.getAttendanceRoster(), wardenAPI.getAttendance(view === 'daily' ? { date } : {view:'monthly',month:Number(date.slice(5,7)),year:Number(date.slice(0,4))})]);
      setStudents(people.data.data || []); setRows(records.data.data || []); setLegacy(records.data.legacyMonthlySummaries || []);
    } catch (error) { setLoadError(error.message); message.error(error.message); }
    finally { setLoading(false); }
  }, [date, view]);
  useEffect(() => { load(); }, [load]);
  const roster = useMemo(() => {
    const data = view === 'monthly' ? rows.map(row => ({...row,key:`${row.student_id}:${row.date}`,person:row.Student}))
      : students.map(student => {
        const id = student.userId ?? student.id;
        const record = rows.find(row => Number(row.student_id) === Number(id));
        return {...record,key:String(id),student_id:id,person:{...student,userName:student.userName||student.username}};
      });
    return data;
  }, [students, rows, view]);
  const source = useMemo(() => roster.filter(row => `${row.person?.userName} ${row.person?.roll_number}`.toLowerCase().includes(search.toLowerCase())), [roster, search]);
  const editable = roster.filter(row => !row.reduction_request_id);
  const save = async (entries, successMessage = 'Attendance saved. Reduction eligibility is unchanged.') => {
    if (needsHostel || savingRef.current || loading || loadError || !entries.length) return;
    savingRef.current = true;
    setSaving(true);
    try {
      for (let offset = 0; offset < entries.length; offset += 1000) {
        await wardenAPI.bulkMarkAttendance({ date, attendanceData: entries.slice(offset, offset + 1000) });
      }
      message.success(successMessage); await load();
    } catch (error) { message.error(error.message); await load(); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const markAll = status => {
    if (needsHostel || savingRef.current || loading || loadError) return;
    setChanges(Object.fromEntries(editable.map(row => [row.student_id, status])));
  };
  const columns = [
    {title:'Student',key:'student',render:(_,row)=><><strong>{row.person?.userName || `Student #${row.student_id}`}</strong><div>{row.person?.roll_number}</div></>},
    ...(view==='monthly'?[{title:'Date',dataIndex:'date',key:'date'}]:[]),
    {title:'Attendance',key:'status',render:(_,row)=>{const status=changes[row.student_id] || row.status;return <Tag color={status==='P'?'green':status==='A'?'red':'blue'}>{({P:'Present',A:'Absent',OD:'OD'})[status] || 'Unmarked'}</Tag>;}},
    {title:'Source / approval',key:'source',render:(_,row)=>row.reduction_request_id?<><Tag color="purple">Approved reduction #{row.reduction_request_id}</Tag><div>{categoryInfo(row.ReductionRequest?.category)?.label}</div><div>{row.MarkedBy?.userName || 'Warden / admin'}</div></>:row.source || (row.id?'Manual':'No record')},
    ...(view==='daily'?[{title:'Record attendance',key:'actions',render:(_,row)=>row.reduction_request_id?<Typography.Text type="secondary">Managed through reduction approval</Typography.Text>:<div role="radiogroup" aria-label={`Attendance for ${row.person?.userName || row.student_id}`} className="flex flex-wrap gap-2">
      {[['P','Present'],['A','Absent'],['OD','OD']].map(([status,label])=>{
        const selected=(changes[row.student_id] || row.status)===status;
        return <label key={status} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${selected ? status==='P'?'border-green-600 bg-green-50 text-green-800':status==='A'?'border-red-600 bg-red-50 text-red-800':'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white'} ${saving||loading?'opacity-60 cursor-wait':''}`}>
          <input type="radio" name={`attendance-${row.student_id}`} aria-label={`${label} for ${row.person?.userName || row.student_id}`} checked={selected} disabled={needsHostel||saving||loading} onChange={()=>setChanges(c=>({...c,[row.student_id]:status}))}/>{label}
        </label>;
      })}
    </div> }]:[])
  ];
  return <div className="module-page p-4 lg:p-8 bg-slate-50 min-h-screen space-y-5">
    <Typography.Title level={2} style={{margin:0}}>Attendance</Typography.Title>
    <ScopeAnchor />
    {needsHostel && <Alert type="info" showIcon title="Choose a hostel above to mark attendance. You can still browse all attendance records." />}
    <Alert type="info" showIcon message="Attendance records presence; it does not grant reduction"
      description="Absent or OD entries alone do not reduce food charges. Approved reduction requests mark their dates automatically. To correct an approval-linked entry, use Mess Reductions." />
    {loadError && <Alert type="error" showIcon message="Unable to load attendance" description={loadError} />}
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
        <label className="flex flex-col gap-2"><span>View</span><Select size="large" aria-label="Attendance view" disabled={saving} value={view} onChange={setView} style={{width:'100%'}} options={[{value:'daily',label:'Daily attendance'},{value:'monthly',label:'Monthly attendance'}]} /></label>
        <label className="flex flex-col gap-2"><span>{view==='monthly'?'Month':'Date'}</span><input aria-label={view==='monthly'?'Attendance month':'Attendance date'} disabled={saving} type={view==='monthly'?'month':'date'} value={view==='monthly'?date.slice(0,7):date} onChange={e=>{if(e.target.value)setDate(view==='monthly'?e.target.value+'-01':e.target.value);}} className="border border-slate-300 px-3 rounded-lg h-10 w-full bg-white" /></label>
        <label className="flex flex-col gap-2"><span>Student</span><Input size="large" aria-label="Search attendance" placeholder="Search name or roll number" value={search} onChange={e=>setSearch(e.target.value)} /></label>
        <Button size="large" onClick={load} disabled={saving||loading}>Refresh</Button>
      </div>
      {view==='daily'&&<div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Space wrap size={12}><Button permissionAction="edit" size="large" disabled={needsHostel||saving||loading||!!loadError||!editable.length} onClick={()=>markAll('P')}>Present all</Button>
            <Button permissionAction="edit" size="large" danger disabled={needsHostel||saving||loading||!!loadError||!editable.length} onClick={()=>markAll('A')}>Absent all</Button></Space>
          <Button permissionAction="edit" size="large" type="primary" loading={saving} disabled={saving||loading||!!loadError||!Object.keys(changes).length} onClick={()=>save(Object.entries(changes).map(([student_id,status])=>({student_id:Number(student_id),status})))}>Save attendance ({Object.keys(changes).length})</Button>
        </div>
        <Typography.Paragraph type="secondary" style={{margin:0}}>Present all and Absent all select the entire roster, including students hidden by search or pagination. Adjust individual students, then click Save attendance to confirm. Approved reduction entries stay locked.</Typography.Paragraph>
      </div>}
    </Card>
    <Card title={`${students.length} enrolled students · ${rows.length} recorded student-days`}><Table rowKey="key" columns={columns} dataSource={source} loading={loading} scroll={{x:800}} /></Card>
    {view==='monthly'&&legacy.length>0&&<Card title="Legacy monthly totals"><Alert type="warning" message="These imported totals do not identify individual attendance dates and do not grant reductions." />
      <Table rowKey="id" dataSource={legacy} columns={[{title:'Student',key:'student',render:(_,r)=>r.Student?.userName || r.student_id},{title:'Recorded legacy total',dataIndex:'totalManDays',key:'days'}]} />
    </Card>}
  </div>;
}
