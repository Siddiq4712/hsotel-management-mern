import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as XLSX from 'xlsx';
import { makeAttendanceTemplate } from '../../utils/monthlyAttendanceExcel';
import MonthlyAttendanceImport from './MonthlyAttendanceImport';

const api=vi.hoisted(()=>({getHostels:vi.fn(),getMonthlyAttendanceRoster:vi.fn(),getMonthlyAttendanceImports:vi.fn(),
  previewMonthlyAttendance:vi.fn(),importMonthlyAttendance:vi.fn(),file:null}));
vi.mock('../../services/api',()=>({adminAPI:api}));
vi.mock('lucide-react',()=>({Download:()=>null,FileSpreadsheet:()=>null,Upload:()=>null}));
vi.mock('antd',()=>{
  const Wrap=({children})=><div>{children}</div>;
  return {Card:Wrap,Space:Wrap,Typography:{Title:Wrap,Text:Wrap},message:{error:vi.fn(),info:vi.fn(),success:vi.fn()},
    Alert:({message,description})=><div>{message}{description}</div>,
    Button:({children,onClick,disabled})=><button onClick={onClick} disabled={disabled}>{children}</button>,
    Input:({id,value,onChange,type,disabled})=><input id={id} value={value} onChange={onChange} type={type} disabled={disabled}/>,
    Select:({id,value,onChange,options,disabled})=><select id={id} value={value??''} onChange={e=>onChange(Number(e.target.value))} disabled={disabled}>
      <option value="">Select hostel</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>,
    Upload:({children,beforeUpload,disabled})=><div>{children}<button disabled={disabled} onClick={()=>beforeUpload(api.file)}>Read file</button></div>,
    Table:({dataSource,columns})=><table><tbody>{dataSource.map((r,i)=><tr key={i}>{columns.map((c,j)=><td key={j}>{c.render?c.render(r[c.dataIndex],r):r[c.dataIndex]}</td>)}</tr>)}</tbody></table>
  };
});
beforeEach(()=>{
  vi.clearAllMocks();
  window.history.replaceState({},'','/monthly-attendance-import?month=9&year=2026');
  api.getHostels.mockResolvedValue({data:{data:[{id:2,name:'HOSTEL 2',is_active:true}]}});
  api.getMonthlyAttendanceImports.mockResolvedValue({data:{data:[]}});
  const template=makeAttendanceTemplate([{roll_number:'00123',userName:'ANISH'}]);
  template.Sheets['Monthly Attendance'].C2={t:'n',v:29};
  api.file={name:'attendance.xlsx',size:2048,arrayBuffer:async()=>XLSX.write(template,{type:'array',bookType:'xlsx'})};
  api.previewMonthlyAttendance.mockResolvedValue({data:{data:{valid:true,blockers:[],summary:{totalRows:1,invalidRows:0,totalManDays:29},
    rows:[{row:2,roll_number:'00123',student_name:'ANISH',mess_days:29,errors:[]}]}}});
  api.importMonthlyAttendance.mockResolvedValue({data:{message:'Imported',data:{importId:1,totalRows:1,totalManDays:29}}});
});
afterEach(cleanup);

async function previewFile(){
  render(<MonthlyAttendanceImport/>);
  await screen.findByText('HOSTEL 2');
  fireEvent.change(screen.getByLabelText('Hostel'),{target:{value:'2'}});
  fireEvent.click(screen.getByRole('button',{name:'Read file'}));
  return screen.findByRole('button',{name:'Confirm Import for 2026-09'});
}
it('previews the Excel without saving, then submits only on explicit confirmation',async()=>{
  const confirm=await previewFile();
  expect(api.importMonthlyAttendance).not.toHaveBeenCalled();
  fireEvent.click(confirm);
  await waitFor(()=>expect(api.importMonthlyAttendance).toHaveBeenCalledWith(expect.objectContaining({hostel_id:2,month:9,year:2026,
    rows:[{roll_number:'00123',student_name:'ANISH',mess_days:29}]})));
  await screen.findByText(/Imported 1 students · 29 man-days · Import #1/);
});
it('invalidates the preview when the selected month changes',async()=>{
  await previewFile();
  fireEvent.change(screen.getByLabelText('Month'),{target:{value:'2026-10'}});
  expect(screen.queryByRole('button',{name:/Confirm Import/})).not.toBeInTheDocument();
  expect(api.importMonthlyAttendance).not.toHaveBeenCalled();
});
