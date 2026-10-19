import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, message, Popconfirm, 
  Space, Typography, Checkbox, Row, Col, ConfigProvider, 
  theme, Skeleton, Divider, Tag, InputNumber
} from 'antd';
import { 
  Bed, Plus, Trash2, ChevronLeft, ChevronRight, LayoutGrid, 
  RefreshCw, FilePlus, ClipboardCheck, Info, Search, Download 
} from 'lucide-react';
import moment from 'moment';
import { messAPI } from '../../services/api';
import { downloadStudentBulkImportTemplate, getRequiredImportColumns } from '../../utils/bulkImportUtils';

const { Title, Text } = Typography;
const { Option } = Select;

// --- Specialized Skeleton for Loading State ---
const BedFeeSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton.Input active style={{ width: 250 }} />
        <div className="flex gap-2"><Skeleton.Button active /><Skeleton.Button active /></div>
      </div>
      {[...Array(4)].map((_, i) => (
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
  const [modalLoading, setModalLoading] = useState(false);
  const [bedFees, setBedFees] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [studentsForSelection, setStudentsForSelection] = useState([]);
  
  // Modals & Forms
  const [isGenerateFeeModalVisible, setIsGenerateFeeModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [generateFeeForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [addStudentForm] = Form.useForm();
  const [isAddStudentVisible, setIsAddStudentVisible] = useState(false);
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState('');
  const [availableStudents, setAvailableStudents] = useState([]);
  const [existingBedStudentIds, setExistingBedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSession, setStudentSession] = useState(undefined);
  const [studentCollege, setStudentCollege] = useState(undefined);
  const [studentToAdd, setStudentToAdd] = useState(null);

  // State for Filters
  const [selectedDate, setSelectedDate] = useState(moment());
  const [selectedSessionId, setSelectedSessionId] = useState(undefined);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [sessionForModalFilter, setSessionForModalFilter] = useState(undefined);
  const requiredImportColumns = getRequiredImportColumns();

  // --- 1. FETCH MAIN DATA (Existing Fees) ---
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
      setLoading(false);
    }
  }, [selectedDate, selectedSessionId]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return availableStudents.filter(student =>
      (!studentSession || String(student.session_id) === String(studentSession)) &&
      (!studentCollege || student.college?.toLowerCase() === studentCollege) &&
      [student.userName, student.name, student.username, student.roll_number, student.registerNumber]
        .some(value => String(value ?? '').toLowerCase().includes(query))
    );
  }, [availableStudents, studentSearch, studentSession, studentCollege]);

  const openAddStudent = async () => {
    setStudentSearch('');
    setStudentSession(selectedSessionId);
    setStudentCollege(undefined);
    setStudentToAdd(null);
    setAvailableStudents([]);
    setExistingBedStudentIds([]);
    setAddStudentError('');
    addStudentForm.resetFields();
    setIsAddStudentVisible(true);
    setAddStudentLoading(true);
    try {
      const [studentsRes, feesRes] = await Promise.all([
        messAPI.getStudents({ requires_bed: 'true' }),
        messAPI.getStudentFees({ month: selectedDate.month() + 1, year: selectedDate.year(), fee_type: 'bed_charge' })
      ]);
      setAvailableStudents(studentsRes.data.data || []);
      setExistingBedStudentIds((feesRes.data.data || []).map(fee => String(fee.student_id)));
    } catch (error) {
      setAddStudentError('Unable to load students and existing fees. Close this window and try again.');
      message.error('Failed to load students for bed fees');
    } finally {
      setAddStudentLoading(false);
    }
  };

  const handleAddStudent = async values => {
    if (!studentToAdd) return message.warning('Select a student from the list');
    setAddingStudent(true);
    try {
      await messAPI.createBedFee({
        student_id: studentToAdd.id,
        ...(studentToAdd.hostel_id ? { hostel_id: studentToAdd.hostel_id } : {}),
        amount: values.amount,
        month: selectedDate.month() + 1,
        year: selectedDate.year(),
        description: values.description || `Bed fee for ${selectedDate.format('MMMM YYYY')}`
      });
      message.success('Student added to bed fees');
      setIsAddStudentVisible(false);
      if (selectedSessionId !== undefined) setSelectedSessionId(undefined);
      else await fetchInitialData();
    } catch (error) {
      message.error(error.response?.data?.message || error.message || 'Failed to add bed fee');
    } finally {
      setAddingStudent(false);
    }
  };

  // --- 2. FETCH ELIGIBLE STUDENTS (Requires Bed = 1) ---
  // This is triggered when the Generate Modal opens or the Session dropdown inside it changes
  const fetchStudentsForModalSelection = async (sessionId) => {
    if (!sessionId) return;
    setModalLoading(true);
    try {
      // Fetch students from backend where Enrollment.requires_bed = 1
      const response = await messAPI.getStudents({ 
        requires_bed: 'true',
        session_id: sessionId 
      });
      const data = response.data?.data || [];
      setStudentsForSelection(data);
      setSelectedStudentIds(data.map(s => s.id)); // Pre-select all eligible students
    } catch (error) {
      console.error('Fetch Students for Bed Fee Error:', error);
      message.error('Failed to load students who require beds');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (isGenerateFeeModalVisible && sessionForModalFilter) {
      fetchStudentsForModalSelection(sessionForModalFilter);
    }
  }, [isGenerateFeeModalVisible, sessionForModalFilter]);

  // --- 3. SUBMIT SELECTIVE GENERATION ---
  const handleGenerateBedFees = async (values) => {
    if (selectedStudentIds.length === 0) return message.warning('Select at least one student');
    try {
      setLoading(true);
      await messAPI.createBulkStudentFee({
        ...values,
        fee_type: 'bed_charge',
        student_ids: selectedStudentIds, // Specifically selected student IDs
        month: selectedDate.month() + 1,
        year: selectedDate.year(),
        description: values.description || `Bed fee for ${selectedDate.format('MMMM YYYY')}`
      });
      message.success(`Generated fees for ${selectedStudentIds.length} students`);
      setIsGenerateFeeModalVisible(false);
      generateFeeForm.resetFields();
      fetchInitialData();
    } catch (err) {
        message.error(err.message);
    } finally { setLoading(false); }
  };

  // --- 4. SUBMIT SESSION BULK GENERATION ---
  const handleBulkSessionGenerate = async (values) => {
    try {
      setLoading(true);
      await messAPI.createBulkStudentFee({
        ...values,
        fee_type: 'bed_charge',
        requires_bed: true, // Tells backend to filter tbl_enrollment by requires_bed = 1
        month: selectedDate.month() + 1,
        year: selectedDate.year()
      });
      message.success('Bulk bed fees generated for the session');
      setIsBulkModalVisible(false);
      bulkForm.resetFields();
      fetchInitialData();
    } catch (err) {
        message.error(err.message);
    } finally { setLoading(false); }
  };

  // --- TABLE COLUMNS ---
  const columns = [
    {
      title: 'Student Details',
      key: 'student',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.Student?.userName || r.userName || r.name || `Student #${r.student_id}`}</Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase">{r.Student?.roll_number || r.roll_number || r.registerNumber || `#${r.student_id}`}</Text>
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
      render: (_, r) => <Tag color="blue">{moment().month(r.month - 1).format('MMMM')} {r.year}</Tag>
    },
    {
      title: 'Action',
      align: 'right',
      render: (_, r) => (
        <Popconfirm title="Remove this record?" onConfirm={() => messAPI.deleteStudentFee(r.id).then(fetchInitialData)}>
          <Button type="text" danger icon={<Trash2 size={16} />} />
        </Popconfirm>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="module-page p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="module-page-header flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100"><Bed className="text-white" size={24} /></div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Bed Fee Management</Title>
              <Text type="secondary">Managing housing charges for eligible residents</Text>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl shadow-sm border flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => setSelectedDate(prev => prev.clone().subtract(1, 'month'))} />
              <div className="px-4 text-center min-w-[140px]"><Text strong className="text-blue-600 uppercase">{selectedDate.format('MMMM YYYY')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => setSelectedDate(prev => prev.clone().add(1, 'month'))} />
            </div>
            <Space>
              <Button icon={<Plus size={18}/>} onClick={openAddStudent}>Add Student</Button>
              <Button icon={<LayoutGrid size={18}/>} onClick={() => setIsBulkModalVisible(true)}>Session Bulk</Button>
              <Button icon={<Download size={18} />} onClick={() => downloadStudentBulkImportTemplate()}>Excel Template</Button>
              <Button type="primary" icon={<FilePlus size={18}/>} onClick={() => setIsGenerateFeeModalVisible(true)}>Generate New Fees</Button>
            </Space>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm rounded-xl mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <Select
              placeholder="Filter List by Session"
              className="w-64"
              allowClear
              value={selectedSessionId}
              onChange={setSelectedSessionId}
            >
              {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
            <Button icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} onClick={fetchInitialData}>Refresh</Button>
          </div>
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <Text className="text-xs text-blue-700">Excel reference for student bulk sheets: {requiredImportColumns.map((column) => column.label).join(', ')}</Text>
            <div className="flex flex-wrap gap-2 mt-2">
              {requiredImportColumns.map((column) => (
                <Tag key={column.key} color="blue">{column.label}</Tag>
              ))}
            </div>
          </div>
        </Card>

        {/* Table */}
        {loading ? <BedFeeSkeleton /> : (
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table 
              columns={columns} 
              dataSource={bedFees} 
              rowKey="id" 
              pagination={{ pageSize: 15 }}
              summary={(pageData) => {
                const total = pageData.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
                return (
                  <Table.Summary.Row className="bg-slate-50 font-bold">
                    <Table.Summary.Cell index={0} align="right">Total Monthly Bed Collections:</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right"><Text className="text-blue-600">₹{total.toFixed(2)}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={2} colSpan={2} />
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>
        )}

        <Modal
          title={`Add Student to Bed Fees — ${selectedDate.format('MMMM YYYY')}`}
          open={isAddStudentVisible}
          width={850}
          onCancel={() => { if (!addingStudent) setIsAddStudentVisible(false); }}
          onOk={() => addStudentForm.submit()}
          okText="Add Bed Fee"
          confirmLoading={addingStudent}
          okButtonProps={{ disabled: addStudentLoading || Boolean(addStudentError) || !studentToAdd }}
          cancelButtonProps={{ disabled: addingStudent }}
          closable={!addingStudent}
          mask={{ closable: !addingStudent }}
        >
          <Text type="secondary">Choose an active student who requires a bed, then enter their fee for this month.</Text>
          <Space wrap className="mt-4 mb-4">
            <Input
              aria-label="Search bed fee students"
              placeholder="Search name or roll number"
              prefix={<Search size={16} />}
              allowClear
              value={studentSearch}
              onChange={event => { setStudentSearch(event.target.value); setStudentToAdd(null); }}
              style={{ width: 260 }}
              disabled={addingStudent}
            />
            <Select
              aria-label="Filter students by session"
              placeholder="All sessions"
              allowClear
              value={studentSession}
              onChange={value => { setStudentSession(value); setStudentToAdd(null); }}
              style={{ width: 180 }}
              disabled={addingStudent}
              options={sessions.map(session => ({ value: session.id, label: session.name }))}
            />
            <Select
              aria-label="Filter students by college"
              placeholder="All colleges"
              allowClear
              value={studentCollege}
              onChange={value => { setStudentCollege(value); setStudentToAdd(null); }}
              style={{ width: 160 }}
              disabled={addingStudent}
              options={[{ value: 'nec', label: 'NEC' }, { value: 'lapc', label: 'LAPC' }]}
            />
          </Space>
          {addStudentError && <div role="alert"><Text type="danger">{addStudentError}</Text></div>}
          <Table
            size="small"
            loading={addStudentLoading}
            rowKey="id"
            dataSource={filteredStudents}
            scroll={{ x: 650, y: 260 }}
            pagination={{ pageSize: 8, showSizeChanger: false, showTotal: total => `${total} students` }}
            rowSelection={{
              type: 'radio',
              selectedRowKeys: studentToAdd ? [studentToAdd.id] : [],
              onChange: (keys, rows) => setStudentToAdd(rows[0] || null),
              getCheckboxProps: student => ({ disabled: addingStudent || existingBedStudentIds.includes(String(student.id)) })
            }}
            columns={[
              { title: 'Student', key: 'name', render: (_, student) => student.userName || student.name || student.username },
              { title: 'Roll Number', key: 'roll', render: (_, student) => student.roll_number || student.registerNumber },
              { title: 'College', dataIndex: 'college', render: value => value?.toUpperCase() },
              { title: 'Session', dataIndex: 'session_name' },
              { title: 'Bed Fee', key: 'status', render: (_, student) => existingBedStudentIds.includes(String(student.id)) ? <Tag>Already added</Tag> : <Tag color="green">Available</Tag> }
            ]}
            locale={{ emptyText: addStudentError || 'No eligible students match these filters' }}
          />
          <Form form={addStudentForm} layout="vertical" onFinish={handleAddStudent} disabled={addingStudent} className="mt-4">
            {studentToAdd && <Text strong>Selected: {studentToAdd.userName || studentToAdd.name} ({studentToAdd.roll_number || studentToAdd.registerNumber})</Text>}
            <Form.Item name="amount" label="Bed Fee Amount (₹)" rules={[{ required: true, message: 'Enter the bed fee amount' }, { type: 'number', min: 0.01, message: 'Amount must be greater than zero' }]}>
              <InputNumber prefix="₹" min={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input placeholder="Optional remark" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal: Selective Generation */}
        <Modal
          title={<div className="flex items-center gap-2"><ClipboardCheck size={18}/> Selective Bed Fee Generation</div>}
          open={isGenerateFeeModalVisible}
          onCancel={() => { setIsGenerateFeeModalVisible(false); generateFeeForm.resetFields(); setStudentsForSelection([]); }}
          onOk={() => generateFeeForm.submit()}
          width={650}
          okText="Generate Fees"
          confirmLoading={loading}
        >
          <Form form={generateFeeForm} layout="vertical" onFinish={handleGenerateBedFees} className="mt-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="session_id_for_modal" label="Filter Students by Session" rules={[{ required: true, message: 'Select session to see students' }]}>
                  <Select placeholder="Select Session" onChange={setSessionForModalFilter}>
                    {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
                  <InputNumber className="w-full" prefix="₹" precision={2} />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left"><Text className="text-[10px] font-bold uppercase text-slate-400">Eligible Students (requires_bed = 1)</Text></Divider>
            
            <div className="bg-slate-50 p-4 rounded-xl border">
               {modalLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : (
                 <>
                  <Checkbox
                    indeterminate={selectedStudentIds.length > 0 && selectedStudentIds.length < studentsForSelection.length}
                    onChange={(e) => setSelectedStudentIds(e.target.checked ? studentsForSelection.map(s => s.id) : [])}
                    checked={selectedStudentIds.length === studentsForSelection.length && studentsForSelection.length > 0}
                    disabled={studentsForSelection.length === 0}
                  >
                    Select All Eligible ({studentsForSelection.length})
                  </Checkbox>
                  <div className="max-h-48 overflow-y-auto mt-4 pr-2">
                    {studentsForSelection.length === 0 && <Text type="secondary" className="block text-center py-4">No students found in this session with 'Requires Bed' status.</Text>}
                    <Checkbox.Group className="w-full" value={selectedStudentIds} onChange={setSelectedStudentIds}>
                      <Row gutter={[0, 8]}>
                        {studentsForSelection.map(s => (
                          <Col span={12} key={s.id}>
                            <Checkbox value={s.id}>
                              <span className="font-semibold">{s.userName || s.name || s.username || `Student #${s.id}`}</span>
                              <span className="text-xs text-slate-400 ml-1">({s.roll_number || s.registerNumber || `#${s.id}`})</span>
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </div>
                 </>
               )}
            </div>
            
            <Form.Item name="description" label="Description" className="mt-4">
              <Input placeholder="Optional remark" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal: Bulk Session Create */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><LayoutGrid size={18}/> Session Bulk Creation</div>}
          open={isBulkModalVisible}
          onCancel={() => setIsBulkModalVisible(false)}
          onOk={() => bulkForm.submit()}
          confirmLoading={loading}
          okText="Generate All"
        >
           <Form form={bulkForm} layout="vertical" onFinish={handleBulkSessionGenerate}>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 mb-6">
                  <Info size={18} className="text-amber-500 shrink-0" />
                  <Text className="text-[11px] text-amber-700">
                    This action will generate bed fees for <b>every active student</b> in the selected session
                    who has <b>Requires Bed = Yes</b> in their enrollment record.
                  </Text>
              </div>
              <Form.Item name="session_id" label="Target Session" rules={[{ required: true }]}>
                <Select placeholder="Select Session">
                  {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="amount" label="Monthly Amount (₹)" rules={[{ required: true }]}>
                <InputNumber className="w-full" prefix="₹" />
              </Form.Item>
           </Form>
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default BedFeeManagement;
