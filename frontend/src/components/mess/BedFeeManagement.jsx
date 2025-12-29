import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, message, Popconfirm, 
  Space, Typography, Tabs, Checkbox, Row, Col, ConfigProvider, 
  theme, Skeleton, Divider, Tag, Tooltip, InputNumber
} from 'antd';
import { 
  Bed, Plus, Trash2, ChevronLeft, ChevronRight, LayoutGrid, 
  Users, RefreshCw, FilePlus, ClipboardCheck, Info, Search 
} from 'lucide-react';
import moment from 'moment';
import { messAPI } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

// --- Specialized Skeleton for Bed Fee Management ---
const BedFeeSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton.Input active style={{ width: 250 }} />
        <div className="flex gap-2">
          <Skeleton.Button active />
          <Skeleton.Button active />
        </div>
      </div>
      <div className="flex gap-4 border-b border-slate-100 pb-4">
        {[...Array(3)].map((_, i) => <Skeleton.Input key={i} active style={{ width: 150 }} />)}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="square" size="large" />
          <div className="flex-1"><Skeleton active paragraph={{ rows: 1 }} /></div>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
      ))}
    </div>
  </Card>
);

const BedFeeManagement = () => {
  const [loading, setLoading] = useState(true);
  const [bedFees, setBedFees] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [studentsForSelection, setStudentsForSelection] = useState([]);
  const [isGenerateFeeModalVisible, setIsGenerateFeeModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [generateFeeForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(moment());
  const [selectedSessionId, setSelectedSessionId] = useState(undefined);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [sessionForModalFilter, setSessionForModalFilter] = useState(undefined);

  // --- NAVIGATION CONTROLS ---
  const changeMonth = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'month'));
  const changeYear = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'year'));
  const handleToday = () => setSelectedDate(moment());

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [feesRes, sessionsRes] = await Promise.all([
        messAPI.getStudentFees({
          month: selectedDate.month() + 1,
          year: selectedDate.year(),
          session_id: selectedSessionId,
          fee_type: 'bed_charge'
        }),
        messAPI.getSessions()
      ]);
      setBedFees(feesRes.data.data || []);
      setSessions(sessionsRes.data.data || []);
    } catch (error) {
      message.error('Failed to sync bed fee records');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [selectedDate, selectedSessionId]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  useEffect(() => {
    if (isGenerateFeeModalVisible && sessionForModalFilter) {
      fetchStudentsForModalSelection(sessionForModalFilter);
    }
  }, [isGenerateFeeModalVisible, sessionForModalFilter]);

  const fetchStudentsForModalSelection = async (sessionId) => {
    try {
      const response = await messAPI.getStudents({ requires_bed: true, session_id: sessionId });
      setStudentsForSelection(response.data.data || []);
    } catch (error) {
      message.error('Failed to load eligible students');
    }
  };

  const handleGenerateBedFees = async (values) => {
    if (selectedStudentIds.length === 0) return message.warning('Select at least one student');
    try {
      setLoading(true);
      await messAPI.createBulkStudentFee({
        ...values,
        fee_type: 'bed_charge',
        student_ids: selectedStudentIds,
        description: values.description || `Bed fee for ${selectedDate.format('MMMM YYYY')}`
      });
      message.success('Fees generated successfully');
      setIsGenerateFeeModalVisible(false);
      fetchInitialData();
    } finally { setLoading(false); }
  };

  const columns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{r.Student?.username}</Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.Student?.roll_number}</Text>
        </Space>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (val) => <Text className="text-blue-600 font-bold">₹{parseFloat(val).toFixed(2)}</Text>
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, r) => <Tag bordered={false} className="rounded-full px-3 bg-slate-100 font-medium">{moment().month(r.month - 1).format('MMM')} {r.year}</Tag>
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, r) => (
        <Popconfirm title="Delete this fee record?" onConfirm={() => messAPI.deleteStudentFee(r.id).then(fetchInitialData)}>
          <Button type="text" danger icon={<Trash2 size={16} />} className="flex items-center justify-center hover:bg-rose-50 rounded-lg" />
        </Popconfirm>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Bed className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Bed Fee Management</Title>
              <Text type="secondary">Manage housing charges and bulk fee processing</Text>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Year Navigator */}
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeYear(-1)} />
              <div className="px-4 text-center min-w-[70px]"><Text strong className="text-slate-700">{selectedDate.format('YYYY')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeYear(1)} />
            </div>

            {/* Month Navigator */}
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
              <div className="px-6 text-center min-w-[120px]"><Text strong className="text-blue-600 uppercase tracking-wide">{selectedDate.format('MMMM')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
            </div>

            <Button onClick={handleToday} className="rounded-2xl h-11 border-slate-200 text-slate-500 font-medium hover:text-blue-600">Today</Button>
          </div>

          <Space>
            <Button icon={<LayoutGrid size={18}/>} onClick={() => setIsBulkModalVisible(true)} className="rounded-xl h-12">Session Bulk</Button>
            <Button type="primary" icon={<FilePlus size={18}/>} onClick={() => setIsGenerateFeeModalVisible(true)} className="rounded-xl h-12 shadow-lg shadow-blue-100 font-semibold px-6">Generate New Fees</Button>
          </Space>
        </div>

        {/* Filters & Content */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 p-2 rounded-xl flex items-center gap-3 border border-slate-100 flex-1 max-w-md">
                <Search size={18} className="text-slate-400" />
                <Select
                  placeholder="Filter by Session"
                  className="w-full"
                  bordered={false}
                  allowClear
                  value={selectedSessionId}
                  onChange={setSelectedSessionId}
                >
                  {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </div>
              <Button icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} onClick={fetchInitialData} className="rounded-xl h-10">Sync</Button>
            </div>
          </Card>

          {loading ? <BedFeeSkeleton /> : (
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              <Table 
                columns={columns} 
                dataSource={bedFees} 
                rowKey="id" 
                pagination={{ pageSize: 10 }}
                summary={(pageData) => {
                  const total = pageData.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
                  return (
                    <Table.Summary.Row className="bg-slate-50 font-bold">
                      <Table.Summary.Cell index={0} align="right">Total Bed Charges</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text className="text-blue-600">₹{total.toFixed(2)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} colSpan={2} />
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>
          )}
        </div>

        {/* Modal: Generate Fees (Multi-Select) */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><ClipboardCheck size={18}/> Selective Fee Generation</div>}
          open={isGenerateFeeModalVisible}
          onCancel={() => setIsGenerateFeeModalVisible(false)}
          onOk={() => generateFeeForm.submit()}
          width={700}
          className="rounded-2xl"
          okText="Generate Fees"
        >
          <Form form={generateFeeForm} layout="vertical" onFinish={handleGenerateBedFees} className="mt-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="session_id_for_modal" label="Source Session" rules={[{ required: true }]}>
                  <Select placeholder="Filter Students" onChange={setSessionForModalFilter}>
                    {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="amount" label="Fee Amount (₹)" rules={[{ required: true }]}>
                  <InputNumber className="w-full h-10 rounded-xl flex items-center" prefix="₹" precision={2} />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left" className="m-0 mb-4"><Text className="text-[10px] font-bold uppercase text-slate-400">Target Beneficiaries</Text></Divider>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <Checkbox
                  indeterminate={selectedStudentIds.length > 0 && selectedStudentIds.length < studentsForSelection.length}
                  onChange={(e) => setSelectedStudentIds(e.target.checked ? studentsForSelection.map(s => s.id) : [])}
                  checked={selectedStudentIds.length === studentsForSelection.length && studentsForSelection.length > 0}
                >
                  Select All Students ({studentsForSelection.length})
                </Checkbox>
                <div className="max-h-48 overflow-y-auto mt-4 pr-2 custom-scrollbar">
                  <Checkbox.Group 
                    className="w-full" 
                    value={selectedStudentIds} 
                    onChange={setSelectedStudentIds}
                  >
                    <Row gutter={[0, 8]}>
                      {studentsForSelection.map(s => (
                        <Col span={12} key={s.id}><Checkbox value={s.id}>{s.username}</Checkbox></Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                </div>
            </div>
            
            <Form.Item name="description" label="Remarks" className="mt-6">
              <Input.TextArea placeholder="e.g., Standard monthly housing fee" className="rounded-xl" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal: Bulk Session Create */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><LayoutGrid size={18}/> Session Bulk Creation</div>}
          open={isBulkModalVisible}
          onCancel={() => setIsBulkModalVisible(false)}
          onOk={() => bulkForm.submit()}
          className="rounded-2xl"
        >
           <Form form={bulkForm} layout="vertical" onFinish={(v) => messAPI.createBulkStudentFee({...v, fee_type: 'bed_charge', requires_bed: true}).then(() => { fetchInitialData(); setIsBulkModalVisible(false); })}>
              <Form.Item name="session_id" label="Target Session" rules={[{ required: true }]}>
                <Select placeholder="Select Session">
                  {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="amount" label="Amount for All Students (₹)" rules={[{ required: true }]}>
                <InputNumber className="w-full h-10 rounded-xl flex items-center" prefix="₹" />
              </Form.Item>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                  <Info size={18} className="text-blue-500 shrink-0" />
                  <Text className="text-[11px] text-blue-700">This will generate bed fees for <b>every student</b> in the selected session who is marked as requiring a bed.</Text>
              </div>
           </Form>
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default BedFeeManagement;