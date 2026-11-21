import WorkspaceToolbar from '../common/WorkspaceToolbar';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import { useScopeDraft, useScopeForm, useWorkspaceScope } from '../common/WorkspaceScope';
import { PermissionButton as Button, PermissionModal as Modal } from '../common/PermissionControls';
import { DatePicker } from '../common/MomentPickers';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { App as AntdApp, Descriptions, Drawer, Tag, Card, Table, Space, Typography, Row, Col, Statistic, Form, Select, InputNumber, Input, Divider, ConfigProvider, Skeleton, Badge, Tooltip } from 'antd';
import Alert from '../common/WorkspaceAlert';
import { 
  ChevronLeft, ChevronRight, Calculator, FileDown, 
  Plus, RefreshCw, User, Calendar, Users, 
  Receipt, Wallet, Info, CheckCircle2, Mail, Search
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';
import { initialBillingDate } from '../../utils/billingDate';

const { Title, Text } = Typography;
const { Option } = Select;

const studentName = row => row.name || row.userName || row.username || 'Unknown student';
const money = value => value == null || !Number.isFinite(Number(value)) ? 'Unavailable'
  : Number(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

const FeeSkeleton = () => (
  <Card className="border-none shadow-sm rounded-surface p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <Skeleton.Input active style={{ width: 300 }} />
        <div className="flex gap-2">
          <Skeleton.Button active style={{ width: 120 }} />
          <Skeleton.Button active style={{ width: 120 }} />
        </div>
      </div>
      <Row gutter={24} className="mb-8">
        {[...Array(4)].map((_, i) => (
          <Col span={6} key={i}><Skeleton active title={true} paragraph={{ rows: 1 }} /></Col>
        ))}
      </Row>
      <Skeleton active paragraph={{ rows: 10 }} />
    </div>
  </Card>
);

const MessFeeManagement = () => {
  const [form] = Form.useForm();
  const scope = useWorkspaceScope();
  const request = useRef(0);
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [finalized, setFinalized] = useState(false);
  const [ratesLocked, setRatesLocked] = useState(false);
  const [issuedCount, setIssuedCount] = useState(0);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');
  const { message } = AntdApp.useApp();
  
  // --- States ---
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({});
  const [historicalImport, setHistoricalImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingBills, setGeneratingBills] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialBillingDate);
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const unissued = reportData.filter(row => !row.issued);
  const unissuedTotal = unissued.reduce((total, row) => total + Number(row.finalAmount), 0);

  const filteredReportData = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return reportData;
    return reportData.filter(row => [
      row.name, row.userName, row.username,
      row.regNo, row.roll_number, row.registerNumber
    ].some(value => String(value ?? '').toLowerCase().includes(query)));
  }, [reportData, searchText]);

  useEffect(() => { setCurrentPage(1); }, [searchText, selectedCollege, selectedDate]);

  // --- Navigation Controls ---
  const changeMonth = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'month'));
  const changeYear = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'year'));
  const handleToday = () => setSelectedDate(moment());

  useScopeForm(form, isModalVisible, manualSaving);
  useScopeDraft(false, generatingBills);
  const fetchReportData = useCallback(async () => {
    const sequence = ++request.current;
    setLoading(true);
    setError('');
    setSelectedBill(null);
    try {
      const month = selectedDate.format('M');
      const year = selectedDate.format('YYYY');
      const { data } = await messAPI.generateMonthlyMessReport({ month, year, college: selectedCollege });
      if (sequence !== request.current) return;
      setReportData(data.data || []);
      setHistoricalImport(Boolean(data.historicalImport || data.legacyFinalized || data.data?.some(row => row.historicalImport || row.legacyFinalized)));
      setFinalized(Boolean(data.finalized || data.legacyFinalized || data.historicalImport));
      setIssuedCount(data.issuedCount || 0);
      setRatesLocked(Boolean(data.ratesLocked || data.finalized));
      setSummary(data.summary || {});
    } catch (failure) {
      if (sequence !== request.current) return;
      setReportData([]);
      setSummary({});
      setFinalized(false);
      setRatesLocked(false);
      setIssuedCount(0);
      setHistoricalImport(false);
      setError(failure.message || 'Could not load monthly bills.');
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, [selectedDate, selectedCollege]);

  useEffect(() => {
    fetchReportData();
    return () => { request.current += 1; };
  }, [fetchReportData]);

  async function openManualFee() {
    form.resetFields();
    form.setFieldsValue({ month_year: selectedDate });
    setStudents([]);
    setManualError('');
    setIsModalVisible(true);
    try {
      const { data } = await messAPI.getStudents();
      setStudents(data.data || []);
    } catch (failure) {
      setManualError(failure.message || 'Could not load students.');
    }
  }

  /**
   * Triggers the Finalize & Email process with a Confirmation Dialog
   */
  const handleFinalizeBills = () => {
    if (loading || error || finalized || historicalImport || !unissued.length) return;
    const monthName = selectedDate.format('MMMM YYYY');
    
    Modal.confirm({
      title: <span className="text-blue-600 flex items-center gap-2"><Mail size={20} /> Finalize & Dispatch Bills?</span>,
      icon: null,
      content: (
        <div className="mt-4">
          <p>You are about to finalize the mess bills for <strong>{monthName}</strong>{scope?.name && <> · <strong>{scope.name}</strong></>}.</p>
          <p>{unissued.length} remaining students · {money(unissuedTotal)} total payable</p>
          <ul className="bg-blue-50 p-4 rounded-surface border border-blue-100 text-blue-700 text-sm list-disc pl-6 space-y-1">
            <li>Finalized bills will be saved to the database.</li>
            <li><strong>Emails</strong> are queued for new bills with an email address.</li>
            <li>The email will include the detailed cost breakdown.</li>
          </ul>
          <p className="mt-4 text-slate-500 text-xs italic">This action will appear in the system audit logs.</p>
        </div>
      ),
      okText: 'Yes, Finalize & Email All',
      cancelText: 'Cancel',
      okButtonProps: { size: 'large', className: 'rounded-control px-6 font-bold' },
      cancelButtonProps: { size: 'large', className: 'rounded-control' },
      // src/pages/mess/MessFeeManagement.jsx

  onOk: async () => {
    setGeneratingBills(true);
    const hide = message.loading(`Finalizing bills for ${monthName}...`, 0);
    try {
      // Ensure the object is the FIRST argument (the 'data' argument for POST)
      const res = await messAPI.generateMessBills({ 
        month: selectedDate.format('M'), 
        year: selectedDate.format('YYYY'), 
        college: selectedCollege 
      });
      
      message.success(res.data.message || `Bills generated and emails sent successfully!`);
      fetchReportData();
    } catch (error) {
      // The error you saw comes from here
      message.error(error.message || 'Failed to generate bills'); 
    } finally {
      hide();
      setGeneratingBills(false);
    }
  }
    });
  };

  const handleManualFeeSubmit = async (values) => {
    if (manualSaving) return;
    setManualSaving(true);
    setManualError('');
    try {
      const payload = { 
        ...values, 
        month: values.month_year.format('M'), 
        year: values.month_year.format('YYYY') 
      };
      await messAPI.createStudentFee(payload);
      message.success('Fee record successfully added');
      setIsModalVisible(false);
      form.resetFields();
      fetchReportData();
    } catch (error) {
      setManualError(error.message || 'Could not record the charge.');
    } finally { setManualSaving(false); }
  };

  const columns = [
    { title: 'Breakdown', key: 'breakdown', width: 120, render: (_, row) => (
      <Button onClick={() => setSelectedBill(row)} aria-label={`View bill for ${studentName(row)}`}>View</Button>
    ) },
    { title: 'S.No.', key: 'sno', render: (_, __, i) => (currentPage - 1) * pageSize + i + 1, width: 70, fixed: 'left' },
    { 
      title: 'Student Name', 
      key: 'name', 
      sorter: (a, b) => String(a.name || a.userName || a.username || '').localeCompare(String(b.name || b.userName || b.username || ''), undefined, { sensitivity: 'base', numeric: true }),
      width: 220, 
      fixed: 'left', 
      render: (_, r) => <Text strong className="text-slate-700 uppercase">{r.name || r.userName || r.username || 'N/A'}</Text> 
    },
    { 
      title: 'Reg No', 
      key: 'regNo', 
      sorter: (a, b) => String(a.regNo || a.roll_number || a.registerNumber || '').localeCompare(String(b.regNo || b.roll_number || b.registerNumber || ''), undefined, { sensitivity: 'base', numeric: true }),
      width: 120, 
      render: (_, r) => <span className="font-mono font-bold text-xs">{r.regNo || r.roll_number || r.registerNumber || 'N/A'}</span> 
    },
    { title: 'Base days', dataIndex: 'baseDays', align: 'center', width: 130, render: v => v ?? 'Legacy' },
    { title: 'Approved reduction', dataIndex: 'approvedReductionDays', align: 'center', width: 200, render: v => v ?? 'Legacy' },
    { title: 'Billable days', dataIndex: 'messDays', align: 'center', width: 145, render: (d) => <Badge count={d} showZero color="#2563eb" overflowCount={31} /> },
    { title: 'Daily Rate', dataIndex: 'dailyRate', align: 'right', width: 140, render: (v) => <Text type="secondary">{money(v)}</Text> },
    
    // --- ADDED COLUMNS START ---
    { 
      title: 'Bed Fee', 
      dataIndex: 'bedCharges', 
      width: 130,
      align: 'right', 
      render: (v) => v > 0 ? <Text className="text-orange-600">₹{v}</Text> : <Text type="secondary" className="text-[10px]">NA</Text> 
    },
    { 
      title: 'Newspaper', 
      dataIndex: 'hinduIndianExpress', 
      width: 150,
      align: 'right', 
      render: (v) => v > 0 ? <Text className="text-purple-600">₹{v}</Text> : <Text type="secondary" className="text-[10px]">NA</Text> 
    },
    // --- ADDED COLUMNS END ---

    { title: 'Extra Charges', dataIndex: 'additionalAmount', align: 'right', width: 170, render: (v) => v > 0 ? <Text type="danger">+₹{v}</Text> : '—' },
    { title: 'Total', dataIndex: 'total', align: 'right', width: 130, className: 'bg-slate-50/50', render: (v) => <Text strong>₹{v}</Text> },
    { 
      title: 'Payable Amount', 
      dataIndex: 'finalAmount', 
      align: 'right', 
      fixed: 'right', 
      width: 180,
      render: (v) => (
        <div className="bg-blue-50 px-3 py-1 rounded-control border border-blue-100 text-right">
          <Text strong className="text-blue-600 text-base">₹{v}</Text>
        </div>
      )
    },
  ];

  return (
    <ConfigProvider>
      <div className="module-page p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <WorkspacePageHeader title="Mess Fee Management" icon={Calculator} description={scope?.name || 'Monthly student bills'} />
        <Card className="mb-4">
          <WorkspaceToolbar>
            <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-control border border-slate-200">
              <Button aria-label="Previous billing month" disabled={generatingBills} type="text" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
              <div className="px-6 text-center min-w-[140px]">
                <Text strong>{selectedDate.format('MMMM YYYY')}</Text>
              </div>
              <Button aria-label="Next billing month" disabled={generatingBills} type="text" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
            </div>
            <Button disabled={generatingBills} onClick={handleToday} className="rounded-control h-11 border-slate-200 text-slate-500 font-medium">Current Month</Button>
          </div>

          <div className="workspace-toolbar-actions">
            <Button permissionAction="create" disabled={historicalImport || ratesLocked || loading || Boolean(error) || generatingBills} icon={<Plus size={18}/>} onClick={openManualFee} className="rounded-control h-12">Add Manual Fee</Button>
            <Button permissionAction="generate" 
              type="primary" 
              icon={<CheckCircle2 size={18} />} 
              onClick={handleFinalizeBills}
              disabled={historicalImport || finalized || loading || Boolean(error) || !reportData.length}
              loading={generatingBills}
            >
              {finalized || historicalImport ? 'Bills finalized' : 'Finalize & Send Emails'}
            </Button>
          </div>
          </WorkspaceToolbar>
        </Card>

        {error && <Alert className="mb-6" type="error" showIcon title="Could not load monthly bills"
          description={error} action={<Button onClick={fetchReportData}>Retry</Button>} />}
        {!loading && !error && <div className="mb-4">
          <Tag color={finalized || historicalImport ? 'green' : 'gold'}>
            {finalized || historicalImport ? 'Finalized' : issuedCount ? `${issuedCount} of ${reportData.length} bills issued` : 'Provisional'}
          </Tag>
          {ratesLocked && !finalized && <Text type="secondary">Remaining bills use the saved rates.</Text>}
        </div>}

        {!loading && !error && (
        <Row gutter={[24, 24]} className="mb-8">
          {[
            { label: 'Daily rate', value: summary.dailyRate, color: '#059669', icon: <Receipt size={18}/>, suffix: '/ day' },
            { label: 'Net Mess Cost', value: summary.foodExpenses, color: '#0f172a', icon: <Wallet size={18}/> },
            { label: 'Total Students', value: reportData.length, color: '#0f172a', icon: <Users size={18}/> },
            { label: 'Total Man-Days', value: summary.messDays, color: '#0f172a', icon: <Calendar size={18}/> },
          ].map((stat, idx) => (
            <Col xs={24} sm={12} lg={6} key={idx}>
              <Card className="border-none shadow-sm rounded-surface">
                <Statistic 
                  title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{stat.label}</span>}
                  value={stat.value ?? 'Unavailable'}
                  prefix={<div style={{ color: stat.color }} className="mr-2 opacity-70">{stat.icon}</div>}
                  suffix={stat.suffix && <Text className="text-xs text-slate-400 ml-1">{stat.suffix}</Text>}
                  precision={idx < 2 ? 2 : 0}
                  valueStyle={{ color: stat.color, fontWeight: 800 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        )}
        {/* Filter Toolbar */}
        <Card className="border-none shadow-sm rounded-surface mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <Space size="large" wrap>
              <Input
                aria-label="Search students by name or roll number"
                placeholder="Search name or roll number"
                prefix={<Search size={16} className="text-slate-400" />}
                allowClear
                value={searchText}
                onChange={event => setSearchText(event.target.value)}
                style={{ width: 280, maxWidth: '100%' }}
                className="h-10"
              />
              <Select aria-label="Institution" disabled={generatingBills} value={selectedCollege} className="w-56 h-10" onChange={setSelectedCollege}>
                <Option value="all">All Institutions</Option>
                <Option value="nec">National Engineering College</Option>
                <Option value="lapc">Lakshmi Ammal Polytech</Option>
              </Select>
              <Button type="primary" ghost icon={<RefreshCw size={16}/>} onClick={fetchReportData} className="rounded-control h-10">Refresh Data</Button>
              <Text type="secondary">Showing {filteredReportData.length} of {reportData.length} students</Text>
            </Space>
            <div className="flex items-center gap-2 text-slate-400">
              <Info size={14} />
              <Text style={{ fontSize: '12px' }}>{historicalImport ? 'Recorded amounts and rounding are preserved. Legacy breakdowns are not reconstructed.' : 'Review a student’s bill to see the recorded amounts and rounding.'}</Text>
            </div>
          </div>
        </Card>

        {/* Table Section */}
        {loading ? <FeeSkeleton /> : !error && (
          <Card className="border-none shadow-sm rounded-surface overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table 
              columns={columns.map(column => ({ ...column,
                onHeaderCell: () => ({ style: { whiteSpace: 'normal', overflowWrap: 'break-word' } }),
                ...(column.dataIndex ? { sorter: (a, b) => {
                  const numericValue = row => {
                    if (row.breakdownUnavailable && ['messDays', 'dailyRate', 'bedCharges', 'hinduIndianExpress', 'additionalAmount'].includes(column.dataIndex)) return -Infinity;
                    const value = row[column.dataIndex];
                    return value == null || !Number.isFinite(Number(value)) ? -Infinity : Number(value);
                  };
                  const left = numericValue(a);
                  const right = numericValue(b);
                  return left === right ? 0 : left < right ? -1 : 1;
                } } : {}),
                render: (value, row, index) => row.breakdownUnavailable && ['messDays', 'dailyRate', 'bedCharges', 'hinduIndianExpress', 'additionalAmount'].includes(column.dataIndex)
                ? <Text type="secondary">Unavailable</Text> : column.render ? column.render(value, row, index) : value }))}
              dataSource={filteredReportData}
              onChange={(pagination, filters, sorter, extra) => {
                if (extra.action === 'sort') setCurrentPage(1);
              }}
              locale={{ emptyText: searchText.trim() ? 'No students match your search' : 'No students available for this month' }}
              rowKey="studentId" 
              tableLayout="fixed"
              scroll={{ x: columns.reduce((total, column) => total + column.width, 0) }}
              pagination={{ 
                current: currentPage, pageSize: pageSize,
                onChange: (p, s) => { setCurrentPage(p); setPageSize(s); },
                showSizeChanger: true,
                showTotal: total => `${total} students`,
                className: "p-6"
              }}
            />
          </Card>
        )}

        <Drawer title={selectedBill && studentName(selectedBill)} open={Boolean(selectedBill)} onClose={() => setSelectedBill(null)}>
          {selectedBill && <>
            <Typography.Paragraph>{[selectedBill.hostel_name || scope?.name, selectedDate.format('MMMM YYYY'), selectedBill.regNo].filter(Boolean).join(' · ')}</Typography.Paragraph>
            {selectedBill.breakdownUnavailable ? (
              <Alert type="info" showIcon title="The recorded bill contains the payable total." />
            ) : (
              <Descriptions column={1} items={[
                ['Eligible days before reductions', selectedBill.baseDays ?? 'Unavailable'],
                ['Approved reduction days', selectedBill.approvedReductionDays ?? 'Unavailable'],
                ['Billable days', selectedBill.messDays ?? 'Unavailable'],
                ['Daily food rate', money(selectedBill.dailyRate)],
                ['Food charge', money(selectedBill.messAmount)],
                ['Water charge', money(selectedBill.waterCharges)],
                ['Other charges', selectedBill.additionalAmount == null || selectedBill.waterCharges == null ? 'Unavailable' : money(Number(selectedBill.additionalAmount) - Number(selectedBill.waterCharges))],
                ['Bed charge', money(selectedBill.bedCharges)],
                ['Newspaper charge', money(selectedBill.hinduIndianExpress)],
                ['Before rounding', money(selectedBill.total)],
                ['Rounding adjustment', money(selectedBill.roundingUp)],
              ].map(([label, children]) => ({ key: label, label, children }))} />
            )}
            <Typography.Title level={5}>Payable amount · {money(selectedBill.finalAmount)}</Typography.Title>
          </>}
        </Drawer>

        {/* Manual Fee Modal */}
        <Modal permissionAction="create" 
          title={<div className="flex items-center gap-2 text-blue-600"><Plus size={18}/> Manual Fee Recording</div>} 
          open={isModalVisible} 
          onCancel={() => !manualSaving && setIsModalVisible(false)}
          confirmLoading={manualSaving}
          onOk={() => form.submit()}
          okText="Record Charge"
          className="rounded-surface"
        >
          {manualError && <Alert type="error" showIcon title={manualError} />}
          <Form form={form} layout="vertical" disabled={manualSaving} onFinish={handleManualFeeSubmit} className="mt-4">
            <Form.Item name="student_id" label="Student Beneficiary" rules={[{ required: true }]}>
              <Select showSearch placeholder="Search student name or roll..." optionFilterProp="children">
                {students.map(s => <Option key={s.id} value={s.id}>{s.userName} ({s.roll_number})</Option>)}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fee_type" label="Charge Type" rules={[{ required: true }]}>
                  <Select placeholder="Select Type">
                    <Option value="bed_charge">Bed Charge</Option>
                    <Option value="water_bill">Water Bill</Option>
                    <Option value="fine">Disciplinary Fine</Option>
                    <Option value="newspaper">Newspaper Bill</Option>
                    <Option value="other_expense">Other Expenses</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
                  <InputNumber className="w-full h-11 flex items-center rounded-control" prefix="₹" precision={2} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="month_year" label="Target Month" rules={[{ required: true }]} initialValue={selectedDate}>
              <DatePicker picker="month" className="w-full rounded-control h-11" />
            </Form.Item>
            <Form.Item name="description" label="Remarks / Description">
              <Input.TextArea rows={2} placeholder="Brief reason for this charge..." className="rounded-control" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default MessFeeManagement;
