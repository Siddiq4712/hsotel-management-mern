import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Card, Form, Input, Select, Button, Checkbox, 
  Typography, Row, Col, Divider, message, 
  ConfigProvider, Skeleton, Steps, Tag, Timeline, Descriptions, 
  Upload, Table, Tabs, Modal, Alert, Space, Tooltip, Badge
} from 'antd';
import { 
  User, Lock, CheckCircle2, AlertCircle, Bed, School, 
  Hash, Mail, Send, ArrowRight, ArrowLeft, GraduationCap,
  ShieldCheck, Info, FileSpreadsheet, Download, Trash2,
  UploadCloud, Users, Check, RefreshCw, Building2, Layers
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import { 
  downloadStudentBulkImportTemplate, 
  getRequiredImportColumns, 
  mapExcelRowToStudent, 
  validateExcelImportHeaders 
} from '../../utils/bulkImportUtils';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

// --- Specialized Skeleton Loader ---
const FormSkeleton = () => (
  <div className="p-6 space-y-8">
    <div className="flex justify-center mb-4"><Skeleton.Button active style={{ width: 300, height: 32 }} /></div>
    <Row gutter={16}>
      <Col span={18}><Skeleton.Input active block style={{ height: 48 }} /></Col>
      <Col span={6}><Skeleton.Input active block style={{ height: 48 }} /></Col>
    </Row>
    <Skeleton.Input active block style={{ height: 48 }} />
    <Skeleton.Input active block style={{ height: 48 }} />
    <div className="flex justify-between mt-10">
      <Skeleton.Button active style={{ width: 100, height: 45 }} />
      <Skeleton.Button active style={{ width: 150, height: 45 }} />
    </div>
  </div>
);

const EnrollStudent = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
  
  // Single Entry Wizard State
  const [currentStep, setCurrentStep] = useState(0);

  // Bulk Import & Preview State
  const [previewStudents, setPreviewStudents] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState('nec'); // 'nec' or 'lapc' common to preview
  const [bulkDefaultBatch, setBulkDefaultBatch] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const requiredImportColumns = getRequiredImportColumns();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await wardenAPI.getSessions();
      const sessionData = response.data?.data || [];
      setSessions(sessionData);
      if (sessionData.length > 0) {
        setBulkDefaultBatch(sessionData[0].id);
      }
    } catch (error) {
      message.error('Failed to load academic years.');
    } finally {
      setTimeout(() => setSessionsLoading(false), 600);
    }
  };

  // --- EXCEL FILE UPLOAD & PARSER ---
  const handleExcelUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        const headers = json.length > 0 ? Object.keys(json[0]) : [];
        const validation = validateExcelImportHeaders(headers);

        if (!validation.isValid) {
          message.error(`Required columns missing: ${validation.missingColumns.join(', ')}. Please use the template.`);
          return;
        }

        const defaultSession = bulkDefaultBatch || (sessions.length > 0 ? sessions[0].id : null);

        const mapped = json
          .map((row, index) => {
            const mappedStudent = mapExcelRowToStudent(row, headers);
            if (!mappedStudent) return null;
            return {
              ...mappedStudent,
              key: mappedStudent.key || `student_${index}_${Date.now()}`,
              session_id: defaultSession,
              requires_bed: false // Initially not checked
            };
          })
          .filter(Boolean);

        if (mapped.length === 0) {
          message.error('No valid student rows found in the uploaded file.');
          return;
        }

        setPreviewStudents(mapped);
        setActiveTab('bulk');
        message.success(`Successfully loaded ${mapped.length} students into Preview!`);
      } catch (err) {
        message.error('Failed to parse Excel file: ' + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
    return false; // Prevent automatic upload
  };

  // --- BULK PREVIEW ROW HANDLERS ---
  const handleStudentBedChange = (key, checked) => {
    setPreviewStudents((prev) =>
      prev.map((student) => (student.key === key ? { ...student, requires_bed: checked } : student))
    );
  };

  const handleStudentBatchChange = (key, sessionId) => {
    setPreviewStudents((prev) =>
      prev.map((student) => (student.key === key ? { ...student, session_id: sessionId } : student))
    );
  };

  const handleRemoveStudentRow = (key) => {
    setPreviewStudents((prev) => prev.filter((student) => student.key !== key));
    message.info('Student removed from preview.');
  };

  const handleApplyBatchToAll = (sessionId) => {
    setBulkDefaultBatch(sessionId);
    setPreviewStudents((prev) =>
      prev.map((student) => ({ ...student, session_id: sessionId }))
    );
    message.success('Batch applied to all students in preview.');
  };

  const handleToggleAllBeds = (status) => {
    setPreviewStudents((prev) =>
      prev.map((student) => ({ ...student, requires_bed: status }))
    );
    message.info(status ? 'All students marked as needing bed.' : 'All bed allocations unchecked.');
  };

  const handleClearPreview = () => {
    setPreviewStudents([]);
    message.info('Bulk preview cleared.');
  };

  // --- BULK SUBMIT TO BACKEND ---
  const handleBulkSubmit = async () => {
    if (previewStudents.length === 0) {
      message.warning('No students in preview to register.');
      return;
    }

    // Verify all rows have batch selected
    const missingBatch = previewStudents.some((s) => !s.session_id);
    if (missingBatch) {
      message.error('Please ensure all students have an Academic Year / Batch selected.');
      return;
    }

    setBulkSubmitting(true);
    try {
      const payload = {
        college: selectedCollege,
        session_id: bulkDefaultBatch,
        students: previewStudents.map((s) => ({
          userName: s.name || s.userName,
          roll_number: s.roll_number,
          email: s.email || `${s.roll_number}@${selectedCollege === 'lapc' ? 'lapc.edu.in' : 'nec.edu.in'}`.toLowerCase(),
          college: selectedCollege,
          session_id: s.session_id || bulkDefaultBatch,
          requires_bed: Boolean(s.requires_bed)
        }))
      };

      const response = await wardenAPI.bulkEnrollStudents(payload);
      const { successful = 0, skipped = 0, errors = [] } = response.data?.data || {};

      Modal.success({
        title: 'Bulk Enrollment Completed',
        width: 500,
        content: (
          <div className="py-2 space-y-3">
            <p className="text-slate-600">The bulk student admission process has completed.</p>
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <Text strong className="text-green-600">Successfully Enrolled:</Text>
                <Tag color="green" className="font-bold text-sm px-3">{successful}</Tag>
              </div>
              <div className="flex justify-between">
                <Text strong className="text-amber-600">Skipped (Already Enrolled):</Text>
                <Tag color="orange" className="font-bold text-sm px-3">{skipped}</Tag>
              </div>
              {errors.length > 0 && (
                <div className="flex justify-between">
                  <Text strong className="text-red-600">Errors encountered:</Text>
                  <Tag color="red" className="font-bold text-sm px-3">{errors.length}</Tag>
                </div>
              )}
            </div>
            {errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs text-red-500 bg-red-50 p-2 rounded">
                {errors.map((e, idx) => (
                  <div key={idx}>• {e.name || 'Row'}: {e.error}</div>
                ))}
              </div>
            )}
          </div>
        ),
        onOk: () => {
          setPreviewStudents([]);
        }
      });
    } catch (err) {
      message.error('Bulk registration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setBulkSubmitting(false);
    }
  };

  // --- SINGLE STUDENT MANUAL REGISTRATION (Step Wizard) ---
  const onSingleFinish = async () => {
    setLoading(true);
    const allValues = form.getFieldsValue(true);
    
    const baseName = (allValues.baseUsername || "").trim().toUpperCase();
    const init = (allValues.initial || "").trim().toUpperCase();
    const finalUsername = init ? `${baseName} ${init}` : baseName;

    const payload = {
      userName: finalUsername,
      password: allValues.password,
      email: allValues.email || `${baseName.toLowerCase()}@hostel.com`,
      session_id: parseInt(allValues.session_id),
      roll_number: allValues.roll_number || "",
      college: allValues.college || "nec",
      requires_bed: allValues.requires_bed || false
    };

    try {
      await wardenAPI.enrollStudent(payload);
      message.success('Student successfully registered!');
      form.resetFields();
      setCurrentStep(0);
    } catch (error) {
      message.error(error.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      const fields = currentStep === 0 
        ? ['baseUsername', 'initial', 'password'] 
        : ['roll_number', 'college', 'session_id'];
      
      await form.validateFields(fields);
      setCurrentStep(currentStep + 1);
    } catch (e) {
      message.warning("Please fill in all required information.");
    }
  };

  const handlePrev = () => setCurrentStep(currentStep - 1);

  // --- PREVIEW TABLE COLUMNS ---
  const previewColumns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_, __, idx) => <span className="text-slate-400 font-medium">{idx + 1}</span>
    },
    {
      title: 'Student Name',
      dataIndex: 'userName',
      key: 'userName',
      render: (text) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
            {text ? text.charAt(0) : 'S'}
          </div>
          <span className="font-semibold text-slate-800 uppercase">{text}</span>
        </div>
      )
    },
    {
      title: 'Roll Number',
      dataIndex: 'roll_number',
      key: 'roll_number',
      render: (text) => (
        <Tag color="cyan" className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs">
          {text}
        </Tag>
      )
    },
    {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
      render: (text, record) => {
        const displayEmail = text || `${record.roll_number}@${selectedCollege === 'lapc' ? 'lapc.edu.in' : 'nec.edu.in'}`.toLowerCase();
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Mail size={13} className="text-slate-400" />
            <span>{displayEmail}</span>
          </div>
        );
      }
    },
    {
      title: 'College',
      key: 'college',
      render: () => (
        <Tag 
          color={selectedCollege === 'lapc' ? 'purple' : 'blue'} 
          className="font-bold uppercase px-3 py-1 rounded-full text-xs"
        >
          {selectedCollege === 'lapc' ? 'LAPC Campus' : 'NEC'}
        </Tag>
      )
    },
    {
      title: 'Batch / Academic Year',
      key: 'session_id',
      width: 200,
      render: (_, record) => (
        <Select
          value={record.session_id}
          onChange={(val) => handleStudentBatchChange(record.key, val)}
          className="w-full h-10 rounded-xl"
          placeholder="Select Batch"
        >
          {sessions.map((s) => (
            <Option key={s.id} value={s.id}>{s.name}</Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Need Bed',
      key: 'requires_bed',
      width: 170,
      render: (_, record) => (
        <div 
          onClick={() => handleStudentBedChange(record.key, !record.requires_bed)}
          className={`cursor-pointer px-3 py-2 rounded-xl border flex items-center gap-2 transition-all ${
            record.requires_bed 
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Checkbox 
            checked={record.requires_bed}
            onChange={(e) => handleStudentBedChange(record.key, e.target.checked)}
          />
          <div className="flex items-center gap-1">
            <Bed size={15} className={record.requires_bed ? "text-blue-600" : "text-slate-400"} />
            <span className="text-xs font-semibold">
              {record.requires_bed ? "Hosteller" : "Day Scholar"}
            </span>
          </div>
        </div>
      )
    },
    {
      title: 'Action',
      key: 'action',
      width: 70,
      render: (_, record) => (
        <Tooltip title="Remove row">
          <Button
            type="text"
            danger
            icon={<Trash2 size={16} />}
            onClick={() => handleRemoveStudentRow(record.key)}
            className="hover:bg-red-50 rounded-lg p-2 flex items-center justify-center"
          />
        </Tooltip>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg text-white">
              <GraduationCap size={28} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Student Admission</Title>
              <Text type="secondary">Register new students individually or import via Excel spreadsheet</Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<Download size={16} />}
              className="h-11 rounded-xl border-blue-200 text-blue-700 hover:border-blue-400 bg-white"
              onClick={() => downloadStudentBulkImportTemplate()}
            >
              Download Excel Template
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="large"
            className="bg-transparent"
            items={[
              {
                key: 'single',
                label: (
                  <div className="flex items-center gap-2 px-2 py-1 font-semibold">
                    <User size={18} />
                    <span>Single Student Entry</span>
                  </div>
                )
              },
              {
                key: 'bulk',
                label: (
                  <div className="flex items-center gap-2 px-2 py-1 font-semibold">
                    <FileSpreadsheet size={18} />
                    <span>Bulk Import & Preview</span>
                    {previewStudents.length > 0 && (
                      <Badge count={previewStudents.length} className="site-badge-count-4" style={{ backgroundColor: '#2563eb' }} />
                    )}
                  </div>
                )
              }
            ]}
          />
        </div>

        {/* TAB 1: SINGLE ENTRY */}
        {activeTab === 'single' && (
          <Row gutter={[24, 24]}>
            <Col lg={16} xs={24}>
              <Card className="border-none shadow-sm rounded-[32px] overflow-hidden min-h-[550px]">
                {sessionsLoading ? <FormSkeleton /> : (
                  <>
                    <div className="px-8 pt-8">
                      <Steps
                        current={currentStep}
                        items={[
                          { title: 'Student Info', icon: <User size={18}/> },
                          { title: 'College Info', icon: <School size={18}/> },
                          { title: 'Final Check', icon: <ShieldCheck size={18}/> }
                        ]}
                      />
                    </div>
                    
                    <Divider className="my-8" />

                    <Form 
                      form={form} 
                      layout="vertical" 
                      onFinish={onSingleFinish} 
                      className="px-8 pb-8"
                      preserve={true}
                    >
                      {/* STEP 0: PERSONAL */}
                      <div className={currentStep === 0 ? "block animate-in fade-in duration-500" : "hidden"}>
                        <Row gutter={16}>
                          <Col span={18}>
                            <Form.Item name="baseUsername" label={<Text strong>Student Name</Text>} rules={[{ required: true, message: 'Please enter student name' }]}>
                              <Input prefix={<User size={16} className="text-slate-400"/>} placeholder="Full Name (without initial)" className="h-12 rounded-xl" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item name="initial" label={<Text strong>Initial</Text>} rules={[{ required: true, message: 'Initial required' }]}>
                              <Input placeholder="K" className="h-12 text-center uppercase font-bold rounded-xl" maxLength={1} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="email" label={<Text strong>Email Address</Text>} rules={[{ type: 'email' }]}>
                          <Input prefix={<Mail size={16} className="text-slate-400"/>} placeholder="student@college.edu" className="h-12 rounded-xl" />
                        </Form.Item>
                        <Form.Item name="password" label={<Text strong>Login Password</Text>} rules={[{ required: true, min: 6, message: 'Minimum 6 characters' }]}>
                          <Input.Password prefix={<Lock size={16} className="text-slate-400"/>} placeholder="Create a password" className="h-12 rounded-xl" />
                        </Form.Item>
                      </div>

                      {/* STEP 1: ACADEMIC */}
                      <div className={currentStep === 1 ? "block animate-in fade-in duration-500" : "hidden"}>
                        <Form.Item name="roll_number" label={<Text strong>Roll Number / UID</Text>} rules={[{ required: true, message: 'Please enter roll number' }]}>
                          <Input prefix={<Hash size={16} className="text-slate-400"/>} placeholder="e.g. 2024CS101" className="h-12 rounded-xl" />
                        </Form.Item>
                        <Form.Item name="college" label={<Text strong>College / Campus</Text>} rules={[{ required: true, message: 'Please select college' }]}>
                          <Select className="h-12 rounded-xl" placeholder="Select Affiliated College">
                            <Option value="nec">National Engineering College (NEC)</Option>
                            <Option value="lapc">LAPC Campus</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name="session_id" label={<Text strong>Academic Year / Batch</Text>} rules={[{ required: true, message: 'Please select batch' }]}>
                          <Select className="h-12 rounded-xl" placeholder="Select Admission Year">
                            {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                          </Select>
                        </Form.Item>
                        <Form.Item name="requires_bed" valuePropName="checked" className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                          <Checkbox>
                            <Text strong className="text-blue-700 ml-2 text-sm">Allocate Room/Bed</Text>
                            <Paragraph className="text-[11px] text-blue-500 m-0 ml-6 italic">Enable this if the student will be staying in the hostel.</Paragraph>
                          </Checkbox>
                        </Form.Item>
                      </div>

                      {/* STEP 2: REVIEW */}
                      {currentStep === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="bg-white rounded-2xl border-2 border-blue-50 shadow-sm overflow-hidden">
                            <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
                              <Text strong className="text-blue-700 flex items-center gap-2"><ShieldCheck size={16}/> Final Verification</Text>
                            </div>
                            <div className="p-6">
                              <Descriptions column={1} bordered size="small" className="bg-white">
                                <Descriptions.Item label={<Text type="secondary" style={{ fontSize: '12px' }}>Student Name</Text>}>
                                  <Text strong className="text-blue-900 uppercase">{form.getFieldValue('baseUsername')} {form.getFieldValue('initial')}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={<Text type="secondary">Roll No</Text>}>
                                  {form.getFieldValue('roll_number')}
                                </Descriptions.Item>
                                <Descriptions.Item label={<Text type="secondary">Institution</Text>}>
                                  <span className="uppercase">{form.getFieldValue('college') === 'lapc' ? 'LAPC Campus' : 'National Engineering College (NEC)'}</span>
                                </Descriptions.Item>
                                <Descriptions.Item label={<Text type="secondary">Admission Type</Text>}>
                                  {form.getFieldValue('requires_bed') 
                                    ? <Tag color="blue" className="rounded-full px-3">HOSTELLER (BED REQUIRED)</Tag> 
                                    : <Tag className="rounded-full px-3">DAY SCHOLAR</Tag>}
                                </Descriptions.Item>
                              </Descriptions>
                            </div>
                          </div>
                          <div className="mt-6 flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
                            <Text className="text-[11px] text-amber-800">
                              Please confirm all details are correct. Clicking the button below will save this student to the hostel records.
                            </Text>
                          </div>
                        </div>
                      )}

                      {/* BUTTON CONTAINER */}
                      <div className="mt-12 flex justify-between">
                        {currentStep > 0 ? (
                          <Button 
                            type="text" 
                            htmlType="button"
                            onClick={handlePrev} 
                            size="large" 
                            icon={<ArrowLeft size={18}/>} 
                            className="h-14 px-8 rounded-xl hover:bg-slate-100"
                          >
                            Back
                          </Button>
                        ) : <div />}

                        {currentStep < 2 ? (
                          <Button 
                            type="primary" 
                            htmlType="button"
                            onClick={handleNext} 
                            size="large" 
                            className="h-14 px-12 rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center gap-2"
                          >
                            Next Step <ArrowRight size={18}/>
                          </Button>
                        ) : (
                          <Button 
                            type="primary" 
                            htmlType="submit" 
                            size="large" 
                            loading={loading} 
                            className="h-14 px-12 rounded-2xl font-bold bg-green-600 hover:bg-green-700 border-none shadow-lg shadow-green-100 flex items-center gap-2"
                          >
                            Register Student <Send size={18}/>
                          </Button>
                        )}
                      </div>
                    </Form>
                  </>
                )}
              </Card>
            </Col>

            {/* Admission Steps Sidebar */}
            <Col lg={8} xs={24}>
              <div className="space-y-6">
                <Card className="border-none shadow-sm rounded-[32px] bg-blue-600 text-white relative overflow-hidden">
                  <div className="relative z-10 p-2">
                    <Title level={4} className="text-white mb-6 flex items-center gap-2"><Info size={20}/> Admission Steps</Title>
                    <Timeline 
                      mode="left"
                      items={[
                        { children: <Text className="text-blue-50 text-xs">Enter Student Details</Text>, color: 'white' },
                        { children: <Text className="text-blue-50 text-xs">Assign Year/Batch</Text>, color: 'white' },
                        { children: <Text className="text-blue-100 font-bold text-xs">Warden Verification</Text>, color: '#10b981' },
                      ]}
                    />
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-400 rounded-full opacity-10" />
                </Card>

                <Card className="border-none shadow-sm rounded-[32px] p-2 bg-white border border-slate-100">
                  <div className="p-4">
                    <Title level={5} className="mb-2">Bulk Import Available</Title>
                    <Paragraph className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Need to enroll multiple students at once? Use the <strong>Bulk Import & Preview</strong> tab to upload an Excel file with Name, Roll Number, and Email.
                    </Paragraph>
                    <Button
                      type="default"
                      icon={<FileSpreadsheet size={16} />}
                      onClick={() => setActiveTab('bulk')}
                      className="w-full h-10 rounded-xl text-blue-600 border-blue-200 hover:border-blue-400"
                    >
                      Switch to Bulk Import
                    </Button>
                  </div>
                </Card>
              </div>
            </Col>
          </Row>
        )}

        {/* TAB 2: BULK IMPORT & PREVIEW */}
        {activeTab === 'bulk' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* If no students loaded, show Upload Zone */}
            {previewStudents.length === 0 ? (
              <Card className="border-none shadow-sm rounded-[32px] bg-white p-6 md:p-10 text-center">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <FileSpreadsheet size={36} />
                  </div>
                  
                  <div>
                    <Title level={3} style={{ marginBottom: 8 }}>Bulk Student Import</Title>
                    <Paragraph className="text-slate-500 text-sm">
                      Upload an Excel sheet (.xlsx, .xls) containing student records. 
                      You will be able to review, adjust batch allocations, select hostel beds, and configure college settings before submitting.
                    </Paragraph>
                  </div>

                  {/* Required Columns Info */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 inline-block text-left w-full max-w-lg">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Info size={14} className="text-blue-600" />
                      Required Sheet Columns (Exact or Similar Headers):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {requiredImportColumns.map((col) => (
                        <Tag key={col.key} color="blue" className="px-3 py-1 rounded-lg font-semibold text-xs">
                          {col.label}
                        </Tag>
                      ))}
                    </div>
                  </div>

                  {/* Upload Dragger Zone */}
                  <div className="py-2">
                    <Dragger
                      accept=".xlsx, .xls"
                      showUploadList={false}
                      beforeUpload={handleExcelUpload}
                      className="rounded-3xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 p-8"
                    >
                      <p className="ant-upload-drag-icon flex justify-center text-blue-600 mb-3">
                        <UploadCloud size={48} />
                      </p>
                      <p className="text-base font-bold text-slate-800 mb-1">
                        Click or drag Excel spreadsheet here to upload
                      </p>
                      <p className="text-xs text-slate-400">
                        Supports .xlsx, .xls files formatted with Name, Roll Number, Email
                      </p>
                    </Dragger>
                  </div>

                  <div className="flex justify-center items-center gap-4 pt-2">
                    <Button
                      icon={<Download size={16} />}
                      onClick={() => downloadStudentBulkImportTemplate()}
                      className="h-11 rounded-xl border-blue-200 text-blue-700 hover:border-blue-400 px-6 font-semibold"
                    >
                      Download Sample Template
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              /* PREVIEW TAB VIEW (When data is loaded) */
              <div className="space-y-6">
                
                {/* Top Section: Common College & Global Batch Controls */}
                <Card className="border-none shadow-sm rounded-[24px] bg-white overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                            Live Preview
                          </span>
                          <Title level={4} style={{ margin: 0 }}>Review Imported Students</Title>
                        </div>
                        <Text type="secondary" className="text-xs">
                          Review data, set the common college, select batches, and toggle room/bed allocations per student.
                        </Text>
                      </div>

                      <div className="flex items-center gap-3">
                        <Upload
                          accept=".xlsx, .xls"
                          showUploadList={false}
                          beforeUpload={handleExcelUpload}
                        >
                          <Button 
                            icon={<RefreshCw size={15} />}
                            className="rounded-xl border-slate-200 hover:border-blue-400 text-slate-600"
                          >
                            Re-upload Sheet
                          </Button>
                        </Upload>
                        <Button 
                          danger
                          type="text"
                          icon={<Trash2 size={15} />}
                          onClick={handleClearPreview}
                          className="rounded-xl hover:bg-red-50"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {/* TOP DROPDOWNS SECTION: College (Common to All) and Default Batch */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-end">
                      
                      {/* Top Dropdown: College (Applied to all) */}
                      <div className="md:col-span-5 bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                            <Building2 size={16} className="text-blue-600" />
                            Target College (Applied to all students)
                          </label>
                          <Tag color="blue" className="rounded-full text-[10px] font-bold px-2">Common to all</Tag>
                        </div>
                        <Select
                          value={selectedCollege}
                          onChange={(value) => {
                            setSelectedCollege(value);
                            message.success(`College set to ${value === 'lapc' ? 'LAPC Campus' : 'NEC'} for all preview students.`);
                          }}
                          className="w-full h-12 text-sm font-semibold"
                          size="large"
                        >
                          <Option value="nec">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-700">NEC</span>
                              <span className="text-slate-500 text-xs">- National Engineering College</span>
                            </div>
                          </Option>
                          <Option value="lapc">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-purple-700">LAPC</span>
                              <span className="text-slate-500 text-xs">- LAPC Campus</span>
                            </div>
                          </Option>
                        </Select>
                        <p className="text-[11px] text-blue-600/80 m-0 mt-2 italic">
                          Selecting this will assign <strong>{selectedCollege.toUpperCase()}</strong> to every student in this batch.
                        </p>
                      </div>

                      {/* Quick Apply Batch to All */}
                      <div className="md:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                            <Layers size={16} className="text-slate-500" />
                            Default Batch
                          </label>
                          <span className="text-[10px] text-slate-400">Quick Apply</span>
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={bulkDefaultBatch}
                            onChange={(val) => setBulkDefaultBatch(val)}
                            className="flex-1 h-12 rounded-xl"
                            placeholder="Select Batch"
                            loading={sessionsLoading}
                          >
                            {sessions.map((s) => (
                              <Option key={s.id} value={s.id}>{s.name}</Option>
                            ))}
                          </Select>
                          <Button
                            type="primary"
                            onClick={() => handleApplyBatchToAll(bulkDefaultBatch)}
                            disabled={!bulkDefaultBatch}
                            className="h-12 rounded-xl px-4 bg-slate-800 hover:bg-slate-900 border-none font-semibold text-xs"
                          >
                            Apply All
                          </Button>
                        </div>
                      </div>

                      {/* Quick Bed Toggle Actions */}
                      <div className="md:col-span-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                        <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                          <Bed size={16} className="text-slate-500" />
                          Bed Allocation
                        </label>
                        <div className="flex gap-2">
                          <Button
                            size="middle"
                            onClick={() => handleToggleAllBeds(true)}
                            className="flex-1 rounded-xl text-xs font-semibold h-11 border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            Check All
                          </Button>
                          <Button
                            size="middle"
                            onClick={() => handleToggleAllBeds(false)}
                            className="flex-1 rounded-xl text-xs font-semibold h-11 border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            Uncheck All
                          </Button>
                        </div>
                      </div>

                    </div>

                    {/* Summary Stats Badges */}
                    <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-slate-100 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5">
                        <Users size={14} className="text-slate-500" />
                        Total Students: <span className="font-bold text-blue-600">{previewStudents.length}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-semibold flex items-center gap-1.5">
                        <Building2 size={14} />
                        College: <span className="font-bold uppercase">{selectedCollege}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-green-50 text-green-700 font-semibold flex items-center gap-1.5">
                        <Bed size={14} />
                        Hostellers (Bed): <span className="font-bold">{previewStudents.filter(s => s.requires_bed).length}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-semibold flex items-center gap-1.5">
                        <User size={14} />
                        Day Scholars: <span className="font-bold">{previewStudents.filter(s => !s.requires_bed).length}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Students Preview Table */}
                <Card className="border-none shadow-sm rounded-[24px] bg-white overflow-hidden">
                  <div className="p-4 md:p-6">
                    <Table
                      dataSource={previewStudents}
                      columns={previewColumns}
                      pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '25', '50', '100'] }}
                      rowKey="key"
                      scroll={{ x: 900 }}
                      className="custom-preview-table"
                    />

                    <Divider className="my-6" />

                    {/* Submit Section */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-xs text-slate-500 max-w-xl">
                        <ShieldCheck size={20} className="text-blue-600 flex-shrink-0" />
                        <span>
                          Once applied, all student credentials and academic enrollment records will be created in the database matching the individual registration structure. Default login password is <code>12345678</code>.
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          size="large"
                          onClick={handleClearPreview}
                          className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          loading={bulkSubmitting}
                          onClick={handleBulkSubmit}
                          className="h-12 px-8 rounded-xl font-bold bg-green-600 hover:bg-green-700 border-none shadow-lg shadow-green-100 flex items-center gap-2 text-sm"
                        >
                          <CheckCircle2 size={18} />
                          Confirm & Enroll All ({previewStudents.length}) Students
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

              </div>
            )}
          </div>
        )}

      </div>
    </ConfigProvider>
  );
};

export default EnrollStudent;
