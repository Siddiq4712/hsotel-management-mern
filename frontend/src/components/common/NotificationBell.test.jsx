import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationBell from './NotificationBell';

const state=vi.hoisted(()=>({user:{userId:7,role:'warden'},rows:[],getNotifications:vi.fn(),markRead:vi.fn(),markAllRead:vi.fn()}));
vi.mock('../../context/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('../../services/api',()=>({notificationAPI:state}));
vi.mock('antd',()=>{
  const Wrap=({children})=><div>{children}</div>;
  const message={error:vi.fn()};
  return {App:{useApp:()=>({message})},Badge:Wrap,
    Button:({children,onClick,disabled,...props})=><button aria-label={props['aria-label']} onClick={onClick} disabled={disabled}>{children}</button>,
    Drawer:({open,children,title})=>open?<section role="dialog" aria-label="Notifications">{title}{children}</section>:null,
    Modal:({open,children,title})=>open?<section role="dialog" aria-label={title}>{children}</section>:null,
    Empty:({description})=><div>{description}</div>,Spin:()=> <span>Loading notifications</span>,
    Alert:({title,description,action})=><div>{title}{description}{action}</div>,
    Segmented:({options,onChange})=><div>{options.map(option=><button key={option.value} onClick={()=>onChange(option.value)}>{option.label}</button>)}</div>,
  };
});
beforeEach(()=>{
  vi.clearAllMocks();state.user={userId:7,role:'warden'};
  state.rows=[{id:12,title:'Leave approved',message:'Your leave has been approved. Full notification details.',status:'unread',type:'leave',createdAt:'2026-10-15T10:00:00Z'},
    {id:11,title:'New fee',message:'Your additional meal charge was added.',status:'unread',type:'fee',createdAt:'2026-10-15T09:00:00Z'}];
  state.getNotifications.mockImplementation(async({status})=>({data:{data:state.rows.filter(row=>status!=='unread'||row.status==='unread'),
    unreadCount:state.rows.filter(row=>row.status==='unread').length,total:state.rows.filter(row=>status!=='unread'||row.status==='unread').length,latestId:Math.max(...state.rows.map(row=>row.id),0)}}));
  state.markRead.mockImplementation(async id=>{state.rows=state.rows.map(row=>row.id===id?{...row,status:'read'}:row);return {data:{success:true}};});
  state.markAllRead.mockImplementation(async({throughId})=>{state.rows=state.rows.map(row=>row.id<=throughId?{...row,status:'read'}:row);return {data:{success:true}};});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});

it.each(['admin','warden','mess','student','lapc','parent','security'])('offers a personal inbox to %s',async role=>{
  state.user={userId:7,role};render(<NotificationBell/>);
  const bell=await screen.findByRole('button',{name:'Notifications, 2 unread'});
  fireEvent.click(bell);await screen.findByRole('button',{name:'Read notification: Leave approved'});
  expect(state.getNotifications).toHaveBeenCalledWith({status:'all',page:1,pageSize:20});
});
it('opens complete details and keeps them visible after an unread item is marked read',async()=>{
  render(<NotificationBell/>);fireEvent.click(await screen.findByRole('button',{name:'Notifications, 2 unread'}));
  fireEvent.click(screen.getByRole('button',{name:'Unread'}));
  fireEvent.click(await screen.findByRole('button',{name:'Read notification: Leave approved'}));
  await waitFor(()=>expect(state.markRead).toHaveBeenCalledWith(12));
  await screen.findByRole('button',{name:'Notifications, 1 unread'});
  expect(screen.getByRole('dialog',{name:'Leave approved'})).toHaveTextContent('Full notification details.');
});
it('mark-all uses the fetched cutoff and leaves a newly arriving alert unread',async()=>{
  render(<NotificationBell/>);fireEvent.click(await screen.findByRole('button',{name:'Notifications, 2 unread'}));
  await screen.findByRole('button',{name:'Read notification: New fee'});
  state.rows=[{id:13,title:'New arrival',message:'Arrived after the displayed snapshot.',status:'unread',createdAt:'2026-10-15T11:00:00Z'},...state.rows];
  fireEvent.click(screen.getByRole('button',{name:'Mark all read'}));
  await waitFor(()=>expect(state.markAllRead).toHaveBeenCalledWith({throughId:12}));
  await screen.findByRole('button',{name:'Notifications, 1 unread'});
});
it('polls while visible and removes its timer on unmount',async()=>{
  vi.useFakeTimers();vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
  const view=render(<NotificationBell/>);await act(async()=>{});
  const before=state.getNotifications.mock.calls.length;
  await act(async()=>{await vi.advanceTimersByTimeAsync(30000);});
  expect(state.getNotifications.mock.calls.length).toBe(before+1);
  view.unmount();await vi.advanceTimersByTimeAsync(30000);
  expect(state.getNotifications.mock.calls.length).toBe(before+1);
});
