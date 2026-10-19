import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import ActivityLogs from './ActivityLogs';

const api=vi.hoisted(()=>({getActivities:vi.fn(),getActivity:vi.fn(),previewActivityReversal:vi.fn(),revertActivity:vi.fn(),correctActivityRecord:vi.fn(),deleteActivityRecord:vi.fn()}));
vi.mock('../../services/api',()=>({adminAPI:api}));
vi.mock('antd',()=>{
  const Wrap=({children})=><div>{children}</div>;
  const message={error:vi.fn(),success:vi.fn()};
  const App=Wrap;App.useApp=()=>({message});
  const form={values:{},resetFields(){this.values={};},setFieldsValue(value){this.values=value;},async validateFields(){return this.values;}};
  const Form=Wrap;Form.useForm=()=>[form];
  Form.Item=({name,label,children})=><label>{label}{React.cloneElement(children,{id:name,onChange:event=>{form.values[name]=event.target.value;}})}</label>;
  const Input=({id,value,onChange,...props})=><input id={id} aria-label={props['aria-label']} value={value} onChange={onChange}/>;
  Input.Search=({value,onChange,onSearch,...props})=><input aria-label={props['aria-label']} value={value} onChange={onChange} onKeyDown={event=>{if(event.key==='Enter')onSearch(event.target.value);}}/>;
  Input.TextArea=({id,value,onChange,...props})=><textarea id={id} aria-label={props['aria-label']} value={value} onChange={onChange}/>;
  return {App,Card:Wrap,Space:Wrap,Typography:{Title:Wrap,Text:Wrap},Form,Input,InputNumber:Input,
    Alert:({title,description})=><div><div>{title}</div><div>{description}</div></div>,
    Button:({children,onClick,disabled})=><button onClick={onClick} disabled={disabled}>{children}</button>,
    Select:props=><select aria-label={props['aria-label']} onChange={event=>props.onChange?.(event.target.value)}><option value="">All</option>{props.options?.map(option=><option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}</select>,
    DatePicker:{RangePicker:()=>null},Tag:Wrap,
    Descriptions:({items})=><div>{items.map(item=><div key={item.key}><span>{item.label}: </span><span>{item.children}</span></div>)}</div>,
    Drawer:({open,children})=>open?<section aria-label="Activity details">{children}</section>:null,
    Modal:({open,children,title,onOk,okText,okButtonProps})=>open?<section role="dialog" aria-label={typeof title==='string'?title:'Reversal preview'}>{title}{children}<button onClick={onOk} disabled={okButtonProps?.disabled}>{okText}</button></section>:null,
    Table:({dataSource,columns})=><table><tbody>{dataSource.map((row,index)=><tr key={row.id||index}>{columns.map((column,index)=><td key={column.key||column.dataIndex||index}>{column.render?column.render(row[column.dataIndex],row):row[column.dataIndex]}</td>)}</tr>)}</tbody></table>,
  };
});
const operation={id:'operation-1',actor_name:'warden_1',actor_role:'warden',workspace:'warden',path:'/api/warden/attendance/bulk',method:'POST',kind:'activity',status:'completed',change_count:2,createdAt:'2026-10-15T10:00:00Z'};
const change={id:1,model_name:'Attendance',record_key:'{"id":12}',hostel_id:2,action:'update',changed_fields:['status'],before_values:{status:'A'},after_values:{status:'P'},current_values:{status:'P'},edit_fields:[],record_token:'record-token'};
beforeEach(()=>{
  vi.clearAllMocks();
  api.getActivities.mockResolvedValue({data:{data:[operation],total:1}});
  api.getActivity.mockResolvedValue({data:{data:{operation,changes:[change],total:1,nextAfter:null,related:[],deliveries:[],reversal:null}}});
  api.previewActivityReversal.mockResolvedValue({data:{data:{operation,changes:[{...change,reversal_action:'update'}],allowed:true,blockers:[],token:'preview-token'}}});
  api.revertActivity.mockResolvedValue({data:{success:true}});
  api.deleteActivityRecord.mockResolvedValue({data:{success:true}});
});
afterEach(cleanup);
const mount=()=>render(<App><MemoryRouter><ActivityLogs/></MemoryRouter></App>);

it('shows staff identity, opens history and sends a search filter',async()=>{
  mount();await screen.findByText('warden_1');
  const search=screen.getByRole('textbox',{name:'Search activity'});
  fireEvent.change(search,{target:{value:'2310001'}});fireEvent.keyDown(search,{key:'Enter',code:'Enter',keyCode:13});
  await waitFor(()=>expect(api.getActivities).toHaveBeenCalledWith(expect.objectContaining({search:'2310001',page:1})));
  fireEvent.click(screen.getByRole('button',{name:'View'}));
  await screen.findByText('warden_1 (warden)');
  expect(api.getActivity).toHaveBeenCalledWith('operation-1',{});
  expect(screen.getByRole('button',{name:'Correct'})).toBeDisabled();
});
it('requires a preview and reason before submitting a reversal',async()=>{
  mount();await screen.findByText('warden_1');
  fireEvent.click(screen.getByRole('button',{name:'Revert'}));
  const confirm=await screen.findByRole('button',{name:'Confirm reversal'});
  expect(confirm).toBeDisabled();expect(api.revertActivity).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox',{name:'Reason for reversal'}),{target:{value:'Attendance marked incorrectly'}});
  fireEvent.click(confirm);
  await waitFor(()=>expect(api.revertActivity).toHaveBeenCalledWith('operation-1',{reason:'Attendance marked incorrectly',token:'preview-token'}));
});
it('shows server blockers and does not submit a blocked reversal',async()=>{
  api.previewActivityReversal.mockResolvedValue({data:{data:{operation,changes:[],allowed:false,blockers:['A later action changed this record.'],token:'blocked'}}});
  mount();await screen.findByText('warden_1');fireEvent.click(screen.getByRole('button',{name:'Revert'}));
  await screen.findByText('A later action changed this record.');
  expect(screen.getByRole('button',{name:'Confirm reversal'})).toBeDisabled();expect(api.revertActivity).not.toHaveBeenCalled();
});
it('deletes an editable business record only with a reason and record fingerprint',async()=>{
  const expense={...change,model_name:'MessDailyExpense',can_delete:true,edit_fields:[{key:'amount',type:'DECIMAL',nullable:false}],current_values:{amount:10}};
  api.getActivity.mockResolvedValue({data:{data:{operation,changes:[expense],total:1,related:[],deliveries:[]}}});
  mount();await screen.findByText('warden_1');fireEvent.click(screen.getByRole('button',{name:'View'}));
  fireEvent.click(await screen.findByRole('button',{name:'Delete record'}));
  const dialog=screen.getByRole('dialog',{name:'Delete business record'});
  expect(api.deleteActivityRecord).not.toHaveBeenCalled();
  fireEvent.change(within(dialog).getByLabelText('Reason'),{target:{value:'Duplicate expense entered'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Delete record'}));
  await waitFor(()=>expect(api.deleteActivityRecord).toHaveBeenCalledWith('operation-1',1,{reason:'Duplicate expense entered',token:'record-token'}));
});
