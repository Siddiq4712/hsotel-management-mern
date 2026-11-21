import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App, Button, Card, DatePicker, Descriptions, Drawer, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import Alert from '../common/WorkspaceAlert';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import WorkspaceToolbar from '../common/WorkspaceToolbar';
import { Activity, ArrowLeftRight, Download, Eye, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import './AdminWorkspace.css';

const { Title, Text } = Typography;
const statuses = {completed:'green',pending:'gold',partial:'orange',failed:'red',reverted:'default'};
const labels = value => String(value).replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2');
const shown = value => value === undefined || value === null ? '—' : typeof value === 'object' ? JSON.stringify(value,null,2) : String(value);
const time = value => new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
const detailDate = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
});
const detailClock = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
});
const managementRoutes={Attendance:'/attendance?workspace=warden',MonthlyAttendanceImport:'/monthly-attendance-import?workspace=admin',
  StudentFee:'/mess-fee?workspace=mess',FoodOrder:'/food-orders-dashboard?workspace=mess',
  RoomAllotment:'/room-allotment?workspace=warden',HostelRoom:'/rooms?workspace=warden',
  DailyConsumption:'/daily-operations?workspace=mess',InventoryBatch:'/inventory?workspace=mess'};

function FieldDiff({ row }) {
  const keys=[...new Set([...Object.keys(row.before_values||{}),...Object.keys(row.after_values||{})])];
  return <Table size="small" pagination={false} rowKey="field" scroll={{x:600}}
    dataSource={keys.map(field=>({field,before:row.before_values?.[field],after:row.after_values?.[field]}))}
    columns={[
      {title:'Field',dataIndex:'field',width:170,render:field=><Text strong={row.changed_fields.includes(field)}>{labels(field)}</Text>},
      ...['before','after'].map(key=>({title:key==='before'?'Before':'After',dataIndex:key,render:value=><pre className="m-0 whitespace-pre-wrap break-all max-h-40 overflow-auto text-xs">{shown(value)}</pre>})),
    ]} />;
}

export default function ActivityLogs() {
  const navigate=useNavigate();
  const { message }=App.useApp();
  const [rows,setRows]=useState([]),[total,setTotal]=useState(0),[page,setPage]=useState(1);
  const [filters,setFilters]=useState({}),[search,setSearch]=useState(''),[loading,setLoading]=useState(false);
  const [loadError, setLoadError] = useState('');
  const listRevision = useRef(0);
  const [detail,setDetail]=useState(null),[detailLoading,setDetailLoading]=useState(false);
  const [preview,setPreview]=useState(null),[working,setWorking]=useState(false),[reason,setReason]=useState('');
  const [editing,setEditing]=useState(null),[editForm]=Form.useForm();
  const load=useCallback(async()=>{
    const revision = ++listRevision.current;
    setLoading(true);
    setLoadError('');
    try {
      const result = await adminAPI.getActivities({ ...filters, page, pageSize: 20 });
      if (revision !== listRevision.current) return;
      setRows(result.data.data);
      setTotal(result.data.total);
    } catch (error) {
      if (revision === listRevision.current) {
        setRows([]);
        setTotal(0);
        setLoadError(error.message || 'Unable to load activity logs.');
      }
    } finally {
      if (revision === listRevision.current) setLoading(false);
    }
  }, [filters, page]);
  useEffect(()=>{load();},[load]);
  const filter=(name,value)=>{setPage(1);setFilters(current=>({...current,[name]:value}));};
  const openDetail=async(id,after)=>{
    setDetailLoading(true);
    try {
      const result=await adminAPI.getActivity(id,after?{after}:{});
      setDetail(current=>after?{...result.data.data,changes:[...current.changes,...result.data.data.changes]}:result.data.data);
    }catch(error){message.error(error.message);}finally{setDetailLoading(false);}
  };
  const openPreview=async id=>{
    setWorking(true);setReason('');
    try{const result=await adminAPI.previewActivityReversal(id);setPreview(result.data.data);}
    catch(error){message.error(error.message);}finally{setWorking(false);}
  };
  const applyRevert=async()=>{
    setWorking(true);
    try {
      await adminAPI.revertActivity(preview.operation.id,{reason,token:preview.token});
      message.success('Activity reverted. Original history retained.');setPreview(null);await load();
      if(detail)await openDetail(detail.operation.id);
    }catch(error){message.error(error.message);}finally{setWorking(false);}
  };
  const startEdit=(row,mode)=>{
    setEditing({row,mode});editForm.resetFields();
    editForm.setFieldsValue(Object.fromEntries(row.edit_fields.map(({key,type})=>[key,
      ['DATE','DATEONLY'].includes(type)?row.current_values?.[key]?.slice(0,10):row.current_values?.[key]])));
  };
  const saveEdit=async()=>{
    try {
      const values=await editForm.validateFields();setWorking(true);
      const payload={reason:values.reason,token:editing.row.record_token};
      if(editing.mode==='correct')payload.values=Object.fromEntries(editing.row.edit_fields.map(({key})=>[key,values[key]??null]));
      if(editing.mode==='delete')await adminAPI.deleteActivityRecord(detail.operation.id,editing.row.id,payload);
      else await adminAPI.correctActivityRecord(detail.operation.id,editing.row.id,payload);
      message.success(editing.mode==='delete'?'Record deleted; history retained.':'Correction saved and logged.');
      setEditing(null);await openDetail(detail.operation.id);await load();
    }catch(error){if(error.message)message.error(error.message);}finally{setWorking(false);}
  };
  const exportPage=()=>{
    const csvCell=value=>{let text=String(value??'');if(/^[=+@-]/.test(text.trimStart())||/^[\t\r\n]/.test(text))text=`'${text}`;return `"${text.replace(/"/g,'""')}"`;};
    const content=[['Operation ID','Time (IST)','User','Role','Workspace','Action','Status','Record changes'],
      ...rows.map(row=>[row.id,time(row.createdAt),row.actor_name,row.actor_role,row.workspace,`${row.method} ${row.path}`,row.reverted?'reverted':row.status,row.change_count])]
      .map(row=>row.map(csvCell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF',content],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download=`activity-logs-page-${page}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const columns=[
    {title:'Time (IST)',dataIndex:'createdAt',width:190,render:time},
    {title:'Performed by',dataIndex:'actor_name',render:(value,row)=><div><Text strong>{value}</Text><div className="text-xs text-slate-500 capitalize">{row.actor_role}</div></div>},
    {title:'Workspace',dataIndex:'workspace',render:value=><Tag color={value==='mess'?'green':value==='warden'?'purple':'blue'} className="capitalize">{value}</Tag>},
    {title:'Activity',dataIndex:'path',render:(value,row)=><div><Tag>{row.method}</Tag><Text>{labels(value.split('/').filter(Boolean).slice(2).join(' / '))}</Text>
      {row.kind!=='activity'&&<Tag color="blue">{labels(row.kind)}</Tag>}<div className="text-xs text-slate-500 mt-1">{row.change_count} record changes</div></div>},
    {title:'Status',dataIndex:'status',render:(value,row)=><Tag color={row.reverted?'default':statuses[value]}>{row.reverted?'Reverted':labels(value)}</Tag>},
    {title:'Actions',key:'actions',align:'center',width:190,render:(_,row)=><Space>
      <Button size="small" icon={<Eye size={14}/>} onClick={()=>openDetail(row.id)}>View</Button>
      <Button size="small" icon={<RotateCcw size={14}/>} loading={working} disabled={row.reverted||row.status!=='completed'||row.kind!=='activity'} onClick={()=>openPreview(row.id)}>Revert</Button>
    </Space>},
  ];
  const hasFilters = Object.values(filters).some(Boolean);
  const detailStatus = detail?.reversal ? 'reverted' : detail?.operation.status;
  const detailTimestamp = detail ? new Date(detail.operation.createdAt) : null;
  return <section className="module-page" aria-labelledby="activity-logs-title">
    <WorkspacePageHeader id="activity-logs-title" title="Activity Logs" icon={Activity}
      description="Review Admin, Warden and Mess activity across hostels." />
    <Alert className="mb-4" type="info" showIcon title="Original activity history is retained"
      description="Logs start when activity tracking is enabled. Corrections and reversals create linked entries. Revert previews check current records and dependencies before allowing changes." />
    <Card>
      <WorkspaceToolbar className="activity-log-toolbar mb-4">
        <Input.Search className="workspace-search" aria-label="Search activity" allowClear placeholder="Name, roll no., activity or record" value={search} onChange={event=>setSearch(event.target.value)} onSearch={value=>filter('search',value.trim())} />
        <Select className="workspace-toolbar-filter" aria-label="Filter workspace" allowClear placeholder="All workspaces" onChange={value=>filter('workspace',value)} options={['admin','warden','mess'].map(value=>({value,label:labels(value)}))}/>
        <Select className="workspace-toolbar-filter" aria-label="Filter actor role" allowClear placeholder="All actor roles" onChange={value=>filter('actor_role',value)} options={['admin','warden','mess'].map(value=>({value,label:labels(value)}))}/>
        <Select className="workspace-toolbar-filter" aria-label="Filter status" allowClear placeholder="All statuses" onChange={value=>filter('status',value)} options={Object.keys(statuses).map(value=>({value,label:labels(value)}))}/>
        <Select className="workspace-toolbar-filter" aria-label="Filter activity type" allowClear placeholder="All activity types" onChange={value=>filter('kind',value)} options={['activity','correct','delete','revert'].map(value=>({value,label:labels(value)}))}/>
        <DatePicker.RangePicker className="activity-log-date-range" placeholder={['From date', 'To date']} onChange={dates=>{setPage(1);setFilters(current=>({...current,from:dates?.[0]?.startOf('day').toISOString(),to:dates?.[1]?.endOf('day').toISOString()}));}}/>
        <div className="workspace-toolbar-actions">
          <Button loading={loading} icon={<RefreshCw size={16}/>} onClick={load}>Refresh</Button>
          <Button disabled={loading || !rows.length} icon={<Download size={16}/>} onClick={exportPage}>Export current page</Button>
        </div>
      </WorkspaceToolbar>
      {loadError && <Alert type="error" showIcon title={loadError} className="mb-4" />}
      <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{x:1000}}
        pagination={{current:page,pageSize:20,total,showSizeChanger:false,onChange:setPage,showTotal:value=>`${value} activities`}}
        locale={{emptyText:loadError ? 'Activities could not be loaded' : hasFilters ? 'No activities match your filters' : 'No activities yet'}} />
    </Card>
    <Drawer title={<div className="activity-detail-heading">
      <h2>Activity details</h2>
      <p>Review operation metadata and recorded changes.</p>
    </div>} size="min(100%, 920px)" rootClassName="admin-activity-detail" closable={{ placement: 'end' }}
      open={Boolean(detail)} onClose={()=>setDetail(null)} loading={detailLoading}>
      {detail&&<div className="activity-detail-content">
        <div className="activity-detail-summary">
          <Tag color={statuses[detailStatus]}>{labels(detailStatus)}</Tag>
          <time dateTime={detail.operation.createdAt}>{detailDate.format(detailTimestamp)} · {detailClock.format(detailTimestamp)} IST</time>
        </div>
        <Descriptions className="activity-detail-metadata" column={1} colon={false} size="small" items={[
          {key:'actor',label:'Performed by',children:`${detail.operation.actor_name} (${detail.operation.actor_role})`},
          {key:'workspace',label:'Workspace',children:labels(detail.operation.workspace)},
          {key:'time',label:'Time (IST)',children:time(detail.operation.createdAt)},
          {key:'status',label:'Status',children:detailStatus},
          {key:'operation',label:'Operation ID',children:detail.operation.id},
          {key:'path',label:'Action',children:`${detail.operation.method} ${detail.operation.path}`},
          ...(detail.operation.reason?[{key:'reason',label:'Reason',children:detail.operation.reason}]:[]),
        ]}/>
        {detail.operation.related_operation_id&&<Button onClick={()=>openDetail(detail.operation.related_operation_id)}>View original activity</Button>}
        <div className="activity-detail-changes">
          <h3>{detail.total} recorded {detail.total === 1 ? 'change' : 'changes'}</h3>
          {detail.changes.length > 0 && <p>Expand a row to compare before and after.</p>}
        </div>
        <Table className="activity-detail-table" size="small" rowKey="id" dataSource={detail.changes}
          scroll={detail.changes.length ? {x:600} : undefined} pagination={detail.changes.length > 10 ? {pageSize:10} : false}
          locale={{ emptyText: <div className="activity-detail-empty">
            <strong>No recorded changes</strong>
            <p>This operation did not capture any record-level changes.</p>
          </div> }}
          expandable={detail.changes.length ? {expandedRowRender:row=><FieldDiff row={row}/>} : undefined} columns={[
            {title:'Record',dataIndex:'model_name',render:(value,row)=><div><Text strong>{labels(value)}</Text><div className="text-xs text-slate-500">{row.record_key}{row.hostel_id?` · Hostel ${row.hostel_id}`:''}</div></div>},
            {title:'Change',dataIndex:'action',render:value=><Tag>{labels(value)}</Tag>},
            {title:'Fields',dataIndex:'changed_fields',render:fields=><span className="text-xs">{fields.filter(field=>!['createdAt','updatedAt'].includes(field)).map(labels).join(', ')}</span>},
            {title:'Actions',key:'actions',render:(_,row)=>row.current_values&&<Space>
              <Button size="small" icon={<Pencil size={13}/>} disabled={!row.edit_fields.length} onClick={()=>startEdit(row,'correct')}>Correct</Button>
              {row.can_delete&&<Button danger size="small" icon={<Trash2 size={13}/>} onClick={()=>startEdit(row,'delete')}>Delete record</Button>}
              {!row.edit_fields.length&&managementRoutes[row.model_name]&&<Button size="small" onClick={()=>navigate(managementRoutes[row.model_name])}>Open module</Button>}
            </Space>},
          ]}/>
        {detail.nextAfter&&<Button onClick={()=>openDetail(detail.operation.id,detail.nextAfter)}>Load more changes</Button>}
        <aside className="activity-detail-corrections">
          <h3>About corrections</h3>
          <p>Corrections here support catalog fields and editable income/expenses. Other records use their existing management screens. Finalized periods and dependent records are checked by the server.</p>
        </aside>
        {detail.deliveries.length>0&&<div><Title level={5}>Notifications</Title>{detail.deliveries.map(item=><p key={item.id}><Tag>{item.status}</Tag>{item.recipient} — {item.subject}</p>)}</div>}
        {detail.related.length>0&&<div><Title level={5}>Related activity</Title>{detail.related.map(item=><p key={item.id}><Button type="link" onClick={()=>openDetail(item.id)}>{labels(item.kind)} by {item.actor_name}</Button>{item.reason} <Tag>{item.status}</Tag></p>)}</div>}
      </div>}
    </Drawer>
    <Modal title={<Space><ArrowLeftRight size={20}/>Reversal preview</Space>} open={Boolean(preview)} onCancel={()=>setPreview(null)} onOk={applyRevert}
      okText="Confirm reversal" confirmLoading={working} okButtonProps={{danger:true,disabled:!preview?.allowed||reason.trim().length<5}} width={760}>
      {preview&&<Space orientation="vertical" size={16} style={{width:'100%'}}>
        <Alert showIcon type={preview.allowed?'warning':'error'} title={preview.allowed?`Revert ${preview.changes.length} affected records together`:'This activity cannot be automatically reverted'} description={preview.blockers.join(' ')||'All changes will succeed together or be rolled back. The original log will remain.'}/>
        <Table size="small" rowKey="id" pagination={{pageSize:5}} dataSource={preview.changes} expandable={{expandedRowRender:row=><FieldDiff row={{...row,before_values:row.current_values,after_values:row.before_values}}/>}} columns={[
          {title:'Record',dataIndex:'model_name'},{title:'Key',dataIndex:'record_key'},{title:'Reversal',dataIndex:'reversal_action'},
        ]}/>
        {preview.allowed&&<Input.TextArea aria-label="Reason for reversal" placeholder="Explain why this activity should be reverted (at least 5 characters)" value={reason} onChange={event=>setReason(event.target.value)} maxLength={500} showCount rows={3}/>}
      </Space>}
    </Modal>
    <Modal title={editing?.mode==='delete'?'Delete business record':'Correct business record'} open={Boolean(editing)} onCancel={()=>setEditing(null)} onOk={saveEdit} confirmLoading={working} okText={editing?.mode==='delete'?'Delete record':'Save correction'} okButtonProps={{danger:editing?.mode==='delete'}} destroyOnHidden>
      <Alert type="info" title="The original activity log will remain. This action creates a new linked log entry." style={{marginBottom:18}}/>
      <Form form={editForm} layout="vertical">
        {editing?.mode==='correct'&&editing.row.edit_fields.map(({key,type,values,nullable})=><Form.Item key={key} name={key} label={labels(key)} rules={[{required:!nullable,message:'This field is required.'}]}>
          {type==='BOOLEAN'?<Select options={[{value:true,label:'Yes'},{value:false,label:'No'}]}/>:values?.length?<Select options={values.map(value=>({value,label:value}))}/>:['INTEGER','DECIMAL','FLOAT','DOUBLE'].includes(type)?<InputNumber style={{width:'100%'}}/>:<Input type={['DATE','DATEONLY'].includes(type)?'date':'text'}/>}
        </Form.Item>)}
        <Form.Item name="reason" label="Reason" rules={[{required:true,min:5,max:500,message:'Enter a reason between 5 and 500 characters.'}]}><Input.TextArea rows={3} maxLength={500} showCount/></Form.Item>
      </Form>
    </Modal>
  </section>;
}
