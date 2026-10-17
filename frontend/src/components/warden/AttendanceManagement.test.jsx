import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import AttendanceManagement from './AttendanceManagement';
const api=vi.hoisted(()=>({getAttendanceRoster:vi.fn(),getAttendance:vi.fn(),bulkMarkAttendance:vi.fn(),message:{error:vi.fn(),success:vi.fn()}}));
vi.mock('../../services/api',()=>({wardenAPI:api}));
vi.mock('antd',()=>{
 const Wrap=({children})=><div>{children}</div>;
 return {App:{useApp:()=>({message:api.message})},Card:Wrap,Tag:Wrap,Space:Wrap,Typography:{Title:Wrap,Text:Wrap,Paragraph:Wrap},
 Alert:({message,description})=><div>{message}{description}</div>,
 Input:props=><input {...props}/>,
 Button:({children,onClick,disabled})=><button onClick={onClick} disabled={disabled}>{children}</button>,
 Select:({value,onChange,options,'aria-label':label})=><select aria-label={label} value={value||''} onChange={e=>onChange(e.target.value)}><option value="">Select</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>,
 Table:({dataSource,columns})=><table><tbody>{dataSource.map((r,i)=><tr key={r.key||r.id||i}>{columns.map(c=><td key={c.key}>{c.render?c.render(null,r):r[c.dataIndex]}</td>)}</tr>)}</tbody></table>};
});
beforeEach(()=>{
 vi.clearAllMocks();window.history.replaceState({},'','/attendance');
 api.getAttendanceRoster.mockResolvedValue({data:{data:[{id:8,userName:'ANISH',roll_number:'2310001'},{id:9,userName:'RANJITH',roll_number:'2316028'}]}});
 api.getAttendance.mockResolvedValue({data:{data:[{id:1,student_id:8,status:'OD',reduction_request_id:12,ReductionRequest:{category:'internship'},MarkedBy:{userName:'Warden'}}]}});
 api.bulkMarkAttendance.mockResolvedValue({data:{success:true}});
});
afterEach(cleanup);
it('shows approval-linked attendance and prevents manual editing of that entry',async()=>{
 render(<AttendanceManagement/>);await screen.findByText('ANISH');
 expect(screen.getByText('Approved reduction #12')).toBeInTheDocument();
 expect(screen.queryByLabelText('Attendance for ANISH')).not.toBeInTheDocument();
 expect(screen.queryByText('Month-End Bulk Man-Days')).not.toBeInTheDocument();
});
it('ordinary attendance saves presence only without reduction days',async()=>{
 render(<AttendanceManagement/>);await screen.findByText('RANJITH');
 expect(screen.getByRole('radiogroup',{name:'Attendance for RANJITH'})).toBeInTheDocument();
 expect(screen.queryByRole('combobox',{name:'Attendance for RANJITH'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('radio',{name:'Absent for RANJITH'}));
 expect(screen.getByRole('radio',{name:'Absent for RANJITH'})).toBeChecked();
 fireEvent.click(screen.getByRole('radio',{name:'Present for RANJITH'}));
 expect(screen.getByRole('radio',{name:'Absent for RANJITH'})).not.toBeChecked();
 fireEvent.click(screen.getByRole('radio',{name:'Absent for RANJITH'}));
 fireEvent.click(screen.getByRole('button',{name:'Save attendance (1)'}));
 await waitFor(()=>expect(api.bulkMarkAttendance).toHaveBeenCalledWith({date:expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),attendanceData:[{student_id:9,status:'A'}]}));
});
it.each([['Present all','P'],['Absent all','A']])('%s stages the entire editable roster until Save attendance confirms it',async(label,status)=>{
 api.getAttendanceRoster.mockResolvedValue({data:{data:[{id:8,userName:'ANISH'},{id:9,userName:'RANJITH'},{id:10,userName:'KUMAR'}]}});
 render(<AttendanceManagement/>);await screen.findByText('RANJITH');
 fireEvent.change(screen.getByLabelText('Search attendance'),{target:{value:'ANISH'}});
 expect(screen.queryByText('RANJITH')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:label}));
 expect(api.bulkMarkAttendance).not.toHaveBeenCalled();
 expect(api.getAttendance).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Save attendance (2)'}));
 await waitFor(()=>expect(api.bulkMarkAttendance).toHaveBeenCalledWith({date:expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),attendanceData:[{student_id:9,status},{student_id:10,status}]}));
 await waitFor(()=>expect(api.message.success).toHaveBeenCalled());
});
it('does not enable bulk actions when the attendance records could not be loaded',async()=>{
 api.getAttendance.mockRejectedValue(new Error('Connection failed'));
 render(<AttendanceManagement/>);await screen.findByText(/Unable to load attendance/);
 expect(screen.getByRole('button',{name:'Present all'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Absent all'})).toBeDisabled();
 expect(api.bulkMarkAttendance).not.toHaveBeenCalled();
});
it('monthly attendance requests actual dated records and keeps legacy totals separate',async()=>{
 api.getAttendance.mockResolvedValue({data:{data:[],legacyMonthlySummaries:[{id:2,student_id:8,Student:{userName:'ANISH'},totalManDays:29}]}});
 render(<AttendanceManagement/>);await screen.findByText('ANISH');
 fireEvent.change(screen.getByLabelText('Attendance view'),{target:{value:'monthly'}});
 await screen.findByText('These imported totals do not identify individual attendance dates and do not grant reductions.');
 expect(api.getAttendance).toHaveBeenCalledWith(expect.objectContaining({view:'monthly'}));
 expect(screen.queryByRole('button',{name:'Present all'})).not.toBeInTheDocument();
});

it('allows a searched student to be absent after selecting present all, then saves once',async()=>{
 api.getAttendanceRoster.mockResolvedValue({data:{data:[{id:8,userName:'ANISH'},{id:9,userName:'RANJITH'},{id:10,userName:'KUMAR'}]}});
 render(<AttendanceManagement/>);await screen.findByText('RANJITH');
 fireEvent.click(screen.getByRole('button',{name:'Present all'}));
 fireEvent.change(screen.getByLabelText('Search attendance'),{target:{value:'KUMAR'}});
 expect(screen.getByRole('radio',{name:'Present for KUMAR'})).toBeChecked();
 fireEvent.click(screen.getByRole('radio',{name:'Absent for KUMAR'}));
 expect(api.bulkMarkAttendance).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Search attendance'),{target:{value:''}});
 expect(screen.getByRole('radio',{name:'Present for RANJITH'})).toBeChecked();
 expect(screen.getByRole('radio',{name:'Absent for KUMAR'})).toBeChecked();
 fireEvent.click(screen.getByRole('button',{name:'Save attendance (2)'}));
 await waitFor(()=>expect(api.bulkMarkAttendance).toHaveBeenCalledExactlyOnceWith({date:expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),attendanceData:[{student_id:9,status:'P'},{student_id:10,status:'A'}]}));
});
