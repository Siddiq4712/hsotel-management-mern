import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { makeAttendanceTemplate, parseAttendanceWorkbook } from './monthlyAttendanceExcel';

describe('monthly attendance fixed Excel format', () => {
  it('preserves text roll numbers through an Excel round trip and requires entering days', () => {
    const template = makeAttendanceTemplate([{roll_number:'00123',userName:'ANISH'}]);
    expect(parseAttendanceWorkbook(template)[0]).toEqual({roll_number:'00123',student_name:'ANISH',mess_days:''});
    template.Sheets['Monthly Attendance'].C2={t:'n',v:0};
    const loaded=XLSX.read(XLSX.write(template,{type:'array',bookType:'xlsx'}),{type:'array'});
    expect(parseAttendanceWorkbook(loaded)[0].mess_days).toBe(0);
    expect(parseAttendanceWorkbook(loaded)[0].roll_number).toBe('00123');
  });
  it('rejects changed headers and formulas rather than using cached formula values', () => {
    const template=makeAttendanceTemplate([{roll_number:'1',userName:'ANISH'}]);
    template.Sheets['Monthly Attendance'].A1={t:'s',v:'Student ID'};
    expect(()=>parseAttendanceWorkbook(template)).toThrow('Required headers');
    template.Sheets['Monthly Attendance'].A1={t:'s',v:'Roll Number'};
    template.Sheets['Monthly Attendance'].C2={t:'n',v:29,f:'30-1'};
    expect(()=>parseAttendanceWorkbook(template)).toThrow('Formulas are not allowed');
  });
  it('retains blank lines so preview errors use the actual Excel row numbers', () => {
    const template=makeAttendanceTemplate([{roll_number:'1',userName:'ANISH'},{roll_number:'2',userName:'RAM'},{roll_number:'3',userName:'RAJ'}]);
    for(const key of ['A3','B3','C3']) delete template.Sheets['Monthly Attendance'][key];
    const rows=parseAttendanceWorkbook(template);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({roll_number:'',student_name:'',mess_days:''});
    expect(rows[2].roll_number).toBe('3');
  });
});
