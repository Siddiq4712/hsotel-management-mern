import React,{useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import StudentMealSelection from './StudentMealSelection';

vi.mock('lucide-react',()=>({Filter:()=>null,Search:()=>null}));
vi.mock('antd',()=>({
  Typography:{Text:({children})=><span>{children}</span>},Space:({children})=><div>{children}</div>,
  Input:({value,onChange,placeholder})=><input value={value} onChange={onChange} placeholder={placeholder}/>,
  Button:({children,onClick,disabled})=><button onClick={onClick} disabled={disabled}>{children}</button>,
  Select:({value,onChange,options,'aria-label':label})=><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>,
  Table:({dataSource,onRow,rowSelection})=><table><tbody>{dataSource.map(row=><tr key={row.id} {...onRow(row)}>
    <td><input aria-label={`Select ${row.userName}`} type="checkbox" checked={rowSelection.selectedRowKeys.includes(row.id)} disabled={rowSelection.getCheckboxProps(row).disabled}
      onChange={()=>rowSelection.onChange(rowSelection.selectedRowKeys.includes(row.id)?rowSelection.selectedRowKeys.filter(id=>id!==row.id):[...rowSelection.selectedRowKeys,row.id])}/></td>
    <td>{row.userName}</td><td>{row.roll_number}</td></tr>)}</tbody></table>
}));
afterEach(cleanup);
const students=[{id:8,userName:'ANISH',roll_number:'00123',college:'nec'},{id:9,userName:'RAM',roll_number:'999',college:'lapc'},{id:10,userName:'RAJ',roll_number:'445',college:'nec'}];
function Wrapper({disabled=false}){const [ids,setIds]=useState([]);return <><StudentMealSelection students={students} selectedIds={ids} onChange={setIds} disabled={disabled}/><output data-testid="ids">{ids.join(',')}</output></>;}

it('keeps click selections while searching by name and roll, then filtering by college',()=>{
  render(<Wrapper/>);
  fireEvent.click(screen.getByText('ANISH'));
  const search=screen.getByPlaceholderText('Search by roll number or name');
  fireEvent.change(search,{target:{value:'999'}});
  expect(screen.queryByText('ANISH')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('RAM'));
  expect(screen.getByTestId('ids')).toHaveTextContent('8,9');
  fireEvent.change(search,{target:{value:'raj'}});
  expect(screen.getByText('RAJ')).toBeInTheDocument();
  fireEvent.change(search,{target:{value:''}});
  fireEvent.click(screen.getByRole('button',{name:'Add Filter'}));
  fireEvent.change(screen.getByLabelText('College filter'),{target:{value:'nec'}});
  expect(screen.queryByText('RAM')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Select all filtered (2)'}));
  expect(screen.getByTestId('ids')).toHaveTextContent('8,9,10');
  fireEvent.click(screen.getByRole('button',{name:'Clear Selection'}));
  expect(screen.getByTestId('ids')).toBeEmptyDOMElement();
});
it('checkbox clicks select once, and disabled rows cannot be selected',()=>{
  const {unmount}=render(<Wrapper/>);
  fireEvent.click(screen.getByLabelText('Select ANISH'));
  expect(screen.getByTestId('ids')).toHaveTextContent('8');
  unmount();render(<Wrapper disabled/>);
  fireEvent.click(screen.getByText('ANISH'));
  expect(screen.getByTestId('ids')).toBeEmptyDOMElement();
});
