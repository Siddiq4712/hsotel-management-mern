import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Badge, Button, Drawer, Empty, Modal, Segmented, Spin } from 'antd';
import { Bell, CalendarCheck, Check, CheckCheck, Megaphone, MessageCircle, Package, Receipt, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../services/api';

const icons={attendance:CalendarCheck,fee:Receipt,stock:Package,notice:Megaphone,complaint:MessageCircle};
export default function NotificationBell() {
  const {user}=useAuth();
  const {message}=App.useApp();
  const userId=user?.userId||user?.id;
  const [open,setOpen]=useState(false),[filter,setFilter]=useState('all');
  const [items,setItems]=useState([]),[unread,setUnread]=useState(0),[total,setTotal]=useState(0),[latestId,setLatestId]=useState(0);
  const [loading,setLoading]=useState(false),[working,setWorking]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState(null);
  const page=useRef(1),request=useRef(0),owner=useRef(userId);
  owner.current=userId;
  const load=useCallback(async(append=false,keepHistory=false)=>{
    if(!userId)return;
    const version=++request.current;
    setLoading(true);
    try {
      const result=await notificationAPI.getNotifications({status:filter,page:append?page.current+1:1,pageSize:20});
      if(version!==request.current||owner.current!==userId)return;
      const data=result.data;
      const preserve=keepHistory&&filter==='all'&&page.current>1;
      setItems(current=>append?[...current.filter(row=>!data.data.some(item=>item.id===row.id)),...data.data]
        :preserve?[...data.data,...current.filter(row=>!data.data.some(item=>item.id===row.id))]:data.data);
      page.current=append?page.current+1:preserve?page.current:1;
      setUnread(data.unreadCount);setTotal(data.total);setLatestId(data.latestId);setError('');
    }catch(err){if(version===request.current&&owner.current===userId)setError(err.message||'Unable to load notifications.');}
    finally{if(version===request.current&&owner.current===userId)setLoading(false);}
  },[filter,userId]);
  useEffect(()=>{
    ++request.current;setItems([]);setUnread(0);setTotal(0);setLatestId(0);setSelected(null);
  },[userId]);
  useEffect(()=>{
    load();
    const refresh=()=>{if(document.visibilityState!=='hidden')load(false,true);};
    const timer=setInterval(refresh,30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{++request.current;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[load]);
  const read=async item=>{
    setSelected(item);
    if(item.status==='read')return;
    setWorking(true);++request.current;
    try{await notificationAPI.markRead(item.id);await load();}
    catch(err){message.error(err.message);}finally{setWorking(false);}
  };
  const readAll=async()=>{
    setWorking(true);++request.current;
    try{await notificationAPI.markAllRead({throughId:latestId});await load();}
    catch(err){message.error(err.message);}finally{setWorking(false);}
  };
  return <>
    <Badge count={unread} overflowCount={99} size="small" offset={[-3,4]}>
      <button type="button" aria-label={`Notifications${unread?`, ${unread} unread`:''}`} aria-expanded={open} aria-haspopup="dialog"
        onClick={()=>{setOpen(true);load();}} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <Bell size={21}/>
      </button>
    </Badge>
    <Drawer title={<div className="flex items-center gap-2"><Bell size={20}/><span>Notifications</span><span className="text-xs font-normal text-slate-400">{unread} unread</span></div>}
      size="min(450px, 96vw)" open={open} onClose={()=>setOpen(false)}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Segmented aria-label="Notification filter" value={filter} onChange={setFilter} options={[{label:'All',value:'all'},{label:'Unread',value:'unread'}]}/>
        <div className="flex items-center gap-2"><Button size="small" aria-label="Refresh notifications" icon={<RefreshCw size={14}/>} onClick={()=>load()} disabled={loading}/>
          <Button size="small" icon={<CheckCheck size={14}/>} onClick={readAll} loading={working} disabled={!unread||loading}>Mark all read</Button></div>
      </div>
      {error&&<Alert type="error" showIcon title="Could not refresh notifications" description={error} style={{marginBottom:16}} action={<Button size="small" onClick={()=>load()}>Retry</Button>}/>}
      {loading&&!items.length?<div className="py-12 text-center"><Spin/></div>:!items.length&&!error?<Empty description={filter==='unread'?"You're all caught up":"No notifications yet"}/>:null}
      <div className="space-y-3">
        {items.map(item=>{const Icon=icons[item.type]||Bell;const isUnread=item.status==='unread';return <button type="button" key={item.id} disabled={working}
          onClick={()=>read(item)} aria-label={`${isUnread?'Read':'View'} notification: ${item.title}`}
          className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isUnread?'border-blue-100 bg-blue-50/60 hover:bg-blue-50':'border-slate-100 bg-white hover:bg-slate-50'}`}>
          <div className="flex gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isUnread?'bg-blue-100 text-blue-600':'bg-slate-100 text-slate-400'}`}><Icon size={17}/></span>
            <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><span className={`text-sm ${isUnread?'font-semibold text-slate-800':'font-medium text-slate-600'}`}>{item.title}</span>
              {isUnread?<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500"/>:<Check size={13} className="shrink-0 text-slate-400"/>}</div>
              <p className="mt-1 mb-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-500 line-clamp-2">{item.message}</p>
              <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</span>
            </div></div>
        </button>;})}
      </div>
      {items.length<total&&<Button block className="mt-5" loading={loading} onClick={()=>load(true)}>Load more notifications</Button>}
      {items.length>0&&<p className="mt-5 text-center text-xs text-slate-400">Select a notification to read it. Updates refresh every 30 seconds.</p>}
    </Drawer>
    <Modal title={selected?.title} open={Boolean(selected)} onCancel={()=>setSelected(null)} footer={null}>
      <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-600">{selected?.message}</p>
      {selected&&<p className="mt-4 text-xs text-slate-400">{new Date(selected.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p>}
    </Modal>
  </>;
}
