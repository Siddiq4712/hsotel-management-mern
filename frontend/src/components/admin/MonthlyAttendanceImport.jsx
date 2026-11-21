import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Select, Space, Table, Typography, Upload, message } from 'antd';
import Alert from '../common/WorkspaceAlert';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import WorkspaceToolbar from '../common/WorkspaceToolbar';
import { Download, FileSpreadsheet, Upload as UploadIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminAPI } from '../../services/api';
import { initialBillingDate } from '../../utils/billingDate';
import { makeAttendanceTemplate, parseAttendanceWorkbook } from '../../utils/monthlyAttendanceExcel';

const { Text } = Typography;

export default function MonthlyAttendanceImport() {
  const [hostels, setHostels] = useState([]);
  const [hostelId, setHostelId] = useState();
  const [month, setMonth] = useState(() => initialBillingDate().format('YYYY-MM'));
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    adminAPI.getHostels().then(res => setHostels((res.data.data || []).filter(h => h.is_active)))
      .catch(error => message.error(error.message));
  }, []);
  useEffect(() => {
    let active = true;
    setHistory([]);
    if (hostelId) adminAPI.getMonthlyAttendanceImports({ hostel_id: hostelId })
      .then(res => { if (active) setHistory(res.data.data || []); }).catch(error => message.error(error.message));
    return () => { active = false; };
  }, [hostelId, saved]);

  const reset = () => { setShowInvalidOnly(false); setRows([]); setFileName(''); setPreview(null); setSaved(null); };
  const payload = (data = rows, name = fileName) => ({ hostel_id: hostelId,
    month: Number(month.slice(5, 7)), year: Number(month.slice(0, 4)), rows: data, file_name: name });

  const download = async () => {
    setBusy(true);
    try {
      const response = await adminAPI.getMonthlyAttendanceRoster({ hostel_id: hostelId });
      const roster = response.data.data || [];
      // Large hostels can download a headers-only template and import in batches.
      XLSX.writeFile(makeAttendanceTemplate(roster.length <= 1000 ? roster : []), `Monthly_Attendance_${hostelId}_${month}.xlsx`);
      if (roster.some(s => !s.roll_number)) message.info('Some students have no roll number. Complete their student records before importing those rows.');
    } catch (error) { message.error(error.message); }
    finally { setBusy(false); }
  };

  const upload = async file => {
    reset();
    if (!hostelId || !/^\d{4}-\d{2}$/.test(month)) { message.error('Select a hostel and month first.'); return false; }
    if (!/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024) {
      message.error('Upload an .xlsx file no larger than 2 MB.'); return false;
    }
    setBusy(true);
    try {
      const data = parseAttendanceWorkbook(XLSX.read(await file.arrayBuffer(), { type: 'array' }));
      setRows(data); setFileName(file.name);
      const response = await adminAPI.previewMonthlyAttendance(payload(data, file.name));
      setPreview(response.data.data);
    } catch (error) { message.error(error.message); }
    finally { setBusy(false); }
    return false;
  };

  const save = async () => {
    if (!preview?.valid || busy) return;
    setBusy(true);
    try {
      const response = await adminAPI.importMonthlyAttendance(payload());
      setSaved(response.data.data); setPreview(null); setRows([]);
      message.success(response.data.message);
    } catch (error) {
      setPreview(null); // A stale preview must never leave the save button enabled.
      message.error(`${error.message} Upload the file again to refresh the preview.`);
    } finally { setBusy(false); }
  };

  return <section className="module-page" aria-labelledby="attendance-import-title">
    <WorkspacePageHeader id="attendance-import-title" title="Monthly Attendance Import" icon={FileSpreadsheet}
      description="Import monthly mess attendance totals for one hostel and month." />
    <Card className="mb-6">
      <WorkspaceToolbar className="workspace-toolbar-labeled">
        <div className="flex flex-col gap-1"><label htmlFor="attendance-hostel">Hostel</label>
          <Select id="attendance-hostel" aria-label="Hostel" placeholder="Select hostel" value={hostelId} disabled={busy}
            className="workspace-toolbar-filter" onChange={id => { setHostelId(id); reset(); }}
            options={hostels.map(h => ({ label: h.name, value: h.id }))} /></div>
        <div className="flex flex-col gap-1"><label htmlFor="attendance-month">Month</label>
          <Input id="attendance-month" type="month" value={month} disabled={busy} min="2000-01" max="2100-12"
            onChange={e => { setMonth(e.target.value); reset(); }} /></div>
        <div className="workspace-toolbar-actions">
          <Button icon={<Download size={16} />} disabled={!hostelId || !month || busy} onClick={download}>Download Template</Button>
          <Upload beforeUpload={upload} accept=".xlsx" showUploadList={false} disabled={!hostelId || !month || busy}>
            <Button type="primary" loading={busy} icon={<UploadIcon size={16} />} disabled={!hostelId || !month || busy}>Upload & Preview</Button>
          </Upload>
        </div>
      </WorkspaceToolbar>
      <Alert className="mt-5" type="info" showIcon message="Fixed format: Roll Number | Student Name | Mess Days"
        description="The legacy Mess Days column stores monthly attendance totals only. It does not grant reductions or change billing. Use 0 explicitly for zero recorded days, keep roll numbers as text, and remove rows you are not importing. Maximum 1000 rows. Individual attendance dates are not inferred." />
    </Card>
    {saved && <Alert className="mb-6" type="success" showIcon message={`Imported ${saved.totalRows} students · ${saved.totalManDays} man-days · Import #${saved.importId}`}
      description="Records are now available under Warden → Attendance → Monthly attendance → Legacy monthly totals. No reductions, bills, or emails were generated." />}
    {preview && <Card title={`Preview: ${fileName}`} className="mb-6">
      <Space wrap className="mb-4"><Text strong>{hostels.find(hostel => hostel.id === hostelId)?.name} · {month}</Text><Text>{preview.summary.totalRows} rows</Text>
        <Text>{preview.summary.invalidRows} invalid rows</Text><Text>{preview.summary.totalManDays} valid man-days</Text></Space>
      {preview.blockers.map(text => <Alert className="mb-3" key={text} type="error" showIcon message={text} />)}
      {!preview.valid && <Alert className="mb-3" type="warning" message="Nothing will be saved until all row errors and month conflicts are resolved." />}
      <WorkspaceToolbar className="mb-4">
        {!!preview.summary.invalidRows && <label className="flex items-center gap-2">
          <input type="checkbox" checked={showInvalidOnly} onChange={event => setShowInvalidOnly(event.target.checked)} />
          Show rows that need correction
        </label>}
        <div className="workspace-toolbar-actions">
          <Button type="primary" loading={busy} disabled={!preview.valid || busy} onClick={save}>Confirm Import for {month}</Button>
        </div>
      </WorkspaceToolbar>
      <Table rowKey="row" dataSource={showInvalidOnly ? preview.rows.filter(row => row.errors.length) : preview.rows} scroll={{ x: 800 }} pagination={{ pageSize: 10 }} columns={[
        { title: 'Excel Row', dataIndex: 'row', width: 100 }, { title: 'Roll Number', dataIndex: 'roll_number' },
        { title: 'Student Name', dataIndex: 'student_name' }, { title: 'Mess Days', dataIndex: 'mess_days', width: 110 },
        { title: 'Validation', key: 'validation', render: (_, row) => row.errors.length ? <Text type="danger">{row.errors.join(' ')}</Text> : <Text type="success">Valid</Text> }
      ]} />
    </Card>}
    {hostelId && <Card title="Recent attendance imports"><Table size="small" rowKey="id" dataSource={history} scroll={{ x: 720 }} pagination={{ pageSize: 5 }} columns={[
      { title: 'Import ID', dataIndex: 'id' }, { title: 'Month', render: (_, r) => `${r.year}-${String(r.month).padStart(2, '0')}` },
      { title: 'File', dataIndex: 'file_name' }, { title: 'Students', dataIndex: 'row_count' },
      { title: 'Man-Days', dataIndex: 'total_man_days' }, { title: 'Imported At', dataIndex: 'createdAt', render: value => new Date(value).toLocaleString() }
    ]} /></Card>}
  </section>;
}
