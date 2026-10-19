import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Modal, Select, Space, Table, Typography, message } from 'antd';
import { DatePicker } from '../common/MomentPickers';
import moment from 'moment';
import * as XLSX from 'xlsx';
import { messAPI } from '../../services/api';
import { requestReportFormat } from '../../services/reportFormat';
import { exportWorkbook, printTables } from '../../utils/reportExport';
import { studentFoodMatrix } from '../../utils/studentFoodMatrix';

const studentColumns = [
  { title: 'Name', dataIndex: 'name' }, { title: 'Roll No', dataIndex: 'roll_number', render: value => value || 'Not recorded' },
  { title: 'Room No', dataIndex: 'room_number', render: value => value || 'Not allotted' },
];
const roomSort = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const sortRows = rows => [...(rows || [])].sort((a, b) => Number(!a.room_number) - Number(!b.room_number) || roomSort.compare(a.room_number || '', b.room_number || '') || roomSort.compare(a.roll_number || '', b.roll_number || ''));
export default function AdditionalFoodStudentReport() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(moment().utcOffset(330));
  const [meal, setMeal] = useState('all');
  const [includeStaff, setIncludeStaff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const tables = useMemo(() => report ? [['Veg', report.veg], ['Non-Veg', report.nonVeg], ...(report.unclassified.length ? [['Unclassified — set food category', report.unclassified]] : [])]
    .map(([name, entries]) => ({ name, ...studentFoodMatrix(entries) })) : [], [report]);
  const loadPreview = useCallback(async () => {
    if (!date) return;
    setBusy(true);
    try {
      const response = await messAPI.getAdditionalFoodStudentReport({ date: date.format('YYYY-MM-DD'), meal_type: meal, include_staff: String(includeStaff) });
      const result = response.data.data;
      setReport({ ...result, veg: sortRows(result.veg), nonVeg: sortRows(result.nonVeg), unclassified: sortRows(result.unclassified) });
    } catch (error) { setReport(null); message.error(error.response?.data?.message || 'Unable to load the student food report.'); }
    finally { setBusy(false); }
  }, [date, meal, includeStaff]);
  useEffect(() => { if (open) loadPreview(); }, [open, loadPreview]);
  const exportReport = async () => {
    if (!report || busy) return;
    const format = await requestReportFormat({ title: 'Export student food report', formats: ['pdf', 'xlsx', 'csv'] });
    if (!format) return;
    setBusy(true);
    try {
      const data = report;
      if (format === 'pdf') {
        printTables(tables.map(table => ({ name: table.name, rows: [table.headers, ...table.values] })), `Additional Food Students — ${data.date} — ${data.meal_type === 'all' ? 'All meals' : data.meal_type} — ${data.include_staff ? 'Including supervisor extras' : 'Student selections'}`);
        return;
      }
      const workbook = XLSX.utils.book_new();
      for (const table of tables) {
        const name = table.name.startsWith('Unclassified') ? 'Unclassified' : table.name;
        const sheet = XLSX.utils.aoa_to_sheet([[`${name} — Additional Food Student Report`], ['Serving date', data.date], ['Meal', data.meal_type],
          ['Scope', data.include_staff ? 'Student selections and supervisor extras' : 'Student selections'], [],
          table.headers, ...table.values]);
        sheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 15 }, ...table.foods.map(food => ({ wch: Math.max(14, Math.min(30, food.label.length + 2)) }))];
        XLSX.utils.book_append_sheet(workbook, sheet, name);
      }
      await exportWorkbook(workbook, `Additional_Food_Students_${data.date}_${data.meal_type}.xlsx`, format);
    } catch (error) { message.error(error.response?.data?.message || 'Unable to generate the student food report.'); }
    finally { setBusy(false); }
  };
  return <>
    <Button onClick={() => setOpen(true)}>Student Food Report</Button>
    <Modal title="Additional Food — Student Report" open={open} onCancel={() => !busy && setOpen(false)} footer={null} width="calc(100vw - 32px)" style={{ top: 16, paddingBottom: 0 }} styles={{ body: { height: 'calc(100dvh - 130px)', overflowY: 'auto' } }}>
      <Space wrap className="mb-4">
        <Typography.Text strong>Serving date</Typography.Text>
        <DatePicker disabled={busy} aria-label="Report serving date" value={date} allowClear={false} onChange={value => { setDate(value); setReport(null); }} format="DD MMM YYYY" />
        <Select disabled={busy} aria-label="Report meal" value={meal} onChange={value => { setMeal(value); setReport(null); }} style={{ minWidth: 150 }} options={['all', 'Breakfast', 'Lunch', 'Dinner'].map(value => ({ value, label: value === 'all' ? 'All meals' : value }))} />
        <Checkbox disabled={busy} checked={includeStaff} onChange={event => { setIncludeStaff(event.target.checked); setReport(null); }}>Include supervisor extras</Checkbox>
        <Button loading={busy} onClick={loadPreview}>Refresh Preview</Button>
        <Button type="primary" disabled={!report || busy} onClick={exportReport}>Export Report</Button>
      </Space>
      <Typography.Paragraph type="secondary">The preview loads automatically for the selected serving date, which may be different from the date the student placed the order.</Typography.Paragraph>
      {report && <>
        <Typography.Paragraph>{report.date} · {report.meal_type === 'all' ? 'All meals' : report.meal_type} · {report.total_students} students · {report.total_quantity} portions. Sorted by room number; cancelled orders excluded.</Typography.Paragraph>
        {report.legacy_order_count > 0 && <Alert className="mb-4" type="info" message="Legacy orders without a recorded source are included. Their category uses the available food record." />}
        {tables.map(table => <section key={table.name}>
          <Typography.Title level={4}>{table.name}</Typography.Title>
          <Table rowKey="key" dataSource={table.rows} columns={[...studentColumns, ...table.foods.map(food => ({ title: food.label, dataIndex: food.key, key: food.key, align: 'center', width: 140 }))]} pagination={false} scroll={{ x: Math.max(650, 520 + table.foods.length * 140) }} size="small" />
        </section>)}
      </>}
    </Modal>
  </>;
}
