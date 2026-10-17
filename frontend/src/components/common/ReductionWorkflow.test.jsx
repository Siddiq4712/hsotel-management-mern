import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReductionReview from './ReductionReview';
import MessReductionApplication from '../student/MessReductionApplication';

const mocks=vi.hoisted(()=>({user:{role:'admin'},list:vi.fn(),submit:vi.fn(),revise:vi.fn(),decide:vi.fn(),hostels:vi.fn(),message:{error:vi.fn(),success:vi.fn()}}));
vi.mock('../../context/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('../../services/api',()=>({reductionAPI:{list:mocks.list,submit:mocks.submit,revise:mocks.revise,decide:mocks.decide},adminAPI:{getHostels:mocks.hostels}}));
vi.mock('./ReductionEvidence',()=>({default:({request})=><span>{request.document?'Supporting document available':'No document'}</span>}));
vi.mock('antd',()=>{
  const Wrap=({children,title})=><div>{typeof title==='string'?<h3>{title}</h3>:title}{children}</div>;
  const Input=props=><input {...props}/>;Input.TextArea=props=><textarea {...props}/>;
  return {App:{useApp:()=>({message:mocks.message})},Card:Wrap,Space:Wrap,Tag:Wrap,
    Typography:{Title:Wrap,Text:Wrap},Input,
    Alert:({message,description})=><div>{message}{description}</div>,
    Select:({options,value,onChange,'aria-label':label})=><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>,
    Button:({children,onClick,disabled,htmlType})=><button type={htmlType||'button'} onClick={onClick} disabled={disabled}>{children}</button>,
    Modal:({open,children,title,onOk,okText})=>open?<div role="dialog">{title}{children}{onOk&&<button onClick={onOk}>{okText}</button>}</div>:null,
    Table:({dataSource,columns})=><table><tbody>{dataSource.map(row=><tr key={row.id}>{columns.map(col=><td key={col.key}>{col.render?col.render(null,row):row[col.dataIndex]}</td>)}</tr>)}</tbody></table>
  };
});
const request={id:12,student_id:8,category:'medical',from_date:'2026-10-10',to_date:'2026-10-15',requested_days:6,status:'pending_admin',reason:'Doctor advised rest',attendance_status:'A',document:{name:'prescription.pdf',mime:'application/pdf'},Student:{userName:'ANISH',roll_number:'2310001'},Hostel:{id:2,name:'Second Hostel'},Decisions:[]};
beforeEach(()=>{
  vi.clearAllMocks();mocks.user={role:'admin'};
  mocks.list.mockResolvedValue({data:{data:[request]}});mocks.hostels.mockResolvedValue({data:{data:[{id:2,name:'Second Hostel'}]}});
  mocks.decide.mockResolvedValue({data:{message:'Approved'}});mocks.submit.mockResolvedValue({data:{message:'Submitted'}});
});
afterEach(cleanup);
it('admin reviews requests across hostels and approves directly',async()=>{
  render(<ReductionReview role="admin"/>);
  await screen.findByText('ANISH');
  expect(screen.getByLabelText('Hostel filter')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Review request #12'}));
  expect(screen.getByText('Supporting document available')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Approve date range'}));
  expect(screen.getByText(/Attendance will become Absent/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Confirm decision'}));
  await waitFor(()=>expect(mocks.decide).toHaveBeenCalledWith('admin',12,{action:'approve',remarks:''}));
});
it('warden review has no all-hostel switch and rejection requires remarks',async()=>{
  mocks.user={role:'warden'};render(<ReductionReview role="warden"/>);
  await screen.findByText('ANISH');expect(screen.queryByLabelText('Hostel filter')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Review request #12'}));fireEvent.click(screen.getByRole('button',{name:'Reject'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm decision'}));expect(mocks.decide).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Decision remarks'),{target:{value:'The letter does not cover these dates'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm decision'}));
  await waitFor(()=>expect(mocks.decide).toHaveBeenCalledWith('warden',12,{action:'reject',remarks:'The letter does not cover these dates'}));
});
it('student submits inclusive dates, category, reason, and the required evidence as multipart data',async()=>{
  mocks.list.mockResolvedValue({data:{data:[]}});await act(async()=>{render(<MessReductionApplication/>);});
  fireEvent.change(screen.getByLabelText('Reduction category'),{target:{value:'internship'}});
  fireEvent.change(screen.getByLabelText('Start date'),{target:{value:'2026-10-10'}});
  fireEvent.change(screen.getByLabelText('End date'),{target:{value:'2026-10-15'}});
  fireEvent.change(screen.getByLabelText('Reduction reason'),{target:{value:'Internship at the company'}});
  expect(screen.getByText(/6 requested days/)).toBeInTheDocument();
  const file=new File(['%PDF-1.4'],'offer.pdf',{type:'application/pdf'});
  fireEvent.change(screen.getByLabelText('Supporting document'),{target:{files:[file]}});
  fireEvent.submit(screen.getByRole('button',{name:'Submit for approval'}).closest('form'));
  await waitFor(()=>expect(mocks.submit).toHaveBeenCalledTimes(1));
  const body=mocks.submit.mock.calls[0][0];
  expect(body.get('category')).toBe('internship');expect(body.get('from_date')).toBe('2026-10-10');expect(body.get('to_date')).toBe('2026-10-15');expect(body.get('document').name).toBe('offer.pdf');
});
it('student cannot submit without supporting evidence',async()=>{
  mocks.list.mockResolvedValue({data:{data:[]}});await act(async()=>{render(<MessReductionApplication/>);});
  fireEvent.change(screen.getByLabelText('Reduction category'),{target:{value:'study_holiday'}});
  fireEvent.change(screen.getByLabelText('Start date'),{target:{value:'2026-10-10'}});fireEvent.change(screen.getByLabelText('End date'),{target:{value:'2026-10-15'}});
  fireEvent.change(screen.getByLabelText('Reduction reason'),{target:{value:'Study holiday with tutor approval'}});
  fireEvent.submit(screen.getByRole('button',{name:'Submit for approval'}).closest('form'));
  expect(mocks.submit).not.toHaveBeenCalled();expect(mocks.message.error).toHaveBeenCalledWith('Upload the required supporting document.');
});
