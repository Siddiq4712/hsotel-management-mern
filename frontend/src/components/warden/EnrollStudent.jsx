import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Input, Select, Button, Checkbox, 
  Typography, Row, Col, Space, Divider, message, 
  ConfigProvider, theme, Skeleton, Steps, Tag, Timeline
} from 'antd';
import { 
  User, Lock, Calendar, CheckCircle2, AlertCircle, Bed, School, 
  Hash, Mail, Send, ArrowRight, ArrowLeft, GraduationCap,
  ShieldCheck, Info
} from 'lucide-react';
import { wardenAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// --- Specialized Skeleton for Enroll Form ---
const EnrollmentSkeleton = () => (
  <div className="p-6 space-y-8 animate-pulse">
    {/* Skeleton for Personal Info Row */}
    <Row gutter={16}>
      <Col span={18}>
        <div className="mb-2"><Skeleton.Input active size="small" style={{ width: 120 }} /></div>
        <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
      </Col>
      <Col span={6}>
        <div className="mb-2"><Skeleton.Input active size="small" style={{ width: 60 }} /></div>
        <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
      </Col>
    </Row>

    {/* Skeleton for Email field */}
    <div className="space-y-2">
      <Skeleton.Input active size="small" style={{ width: 150 }} />
      <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
    </div>

    {/* Skeleton for Password field */}
    <div className="space-y-2">
      <Skeleton.Input active size="small" style={{ width: 140 }} />
      <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
    </div>

    <Divider className="my-6" />
    
    <div className="flex justify-end">
      <Skeleton.Button active style={{ width: 220, height: 56, borderRadius: 16 }} />
    </div>
  </div>
);

const EnrollStudent = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await wardenAPI.getSessions();
      setSessions(response.data.data || []);
    } catch (error) {
      message.error('Failed to sync academic sessions.');
    } finally {
      // Small timeout to prevent flickering on ultra-fast connections
      setTimeout(() => setSessionsLoading(false), 600);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    const baseName = (values.baseUsername || "").trim().toUpperCase();
    const initial = (values.initial || "").trim().toUpperCase();
    const finalUsername = `${baseName} ${initial}`;

    try {
      await wardenAPI.enrollStudent({
        ...values,
        username: finalUsername,
        session_id: parseInt(values.session_id) || 0,
        email: values.email || "",
        roll_number: values.roll_number || "",
        college: values.college || ""
      });

      message.success('Institutional enrollment complete! Profile activated.');
      form.resetFields();
      setCurrentStep(0);
    } catch (error) {
      message.error(error.response?.data?.message || 'Enrollment rejected by server.');
    } finally {
      setLoading(false);
    }
  };

  const next = async () => {
    try {
      const fields = currentStep === 0 
        ? ['baseUsername', 'initial', 'email', 'password'] 
        : ['college', 'session_id', 'roll_number'];
      await form.validateFields(fields);
      setCurrentStep(currentStep + 1);
    } catch (e) {
      message.warning("Please complete all required fields correctly.");
    }
  };

  const prev = () => setCurrentStep(currentStep - 1);

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <GraduationCap className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Enrollment Hub</Title>
              <Text type="secondary">Onboard new students into the institutional management cycle</Text>
            </div>
          </div>
        </div>

        <Row gutter={24}>
          <Col lg={16} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden p-2">
              <div className="px-8 pt-8 pb-4">
                <Steps
                  current={currentStep}
                  items={[
                    { title: 'Personal', icon: <User size={16}/> },
                    { title: 'Academic', icon: <School size={16}/> },
                    { title: 'Review', icon: <ShieldCheck size={16}/> }
                  ]}
                />
              </div>
              <Divider className="my-4 border-slate-100" />

              {/* Display Skeletons while fetching initial session data */}
              {sessionsLoading ? (
                <EnrollmentSkeleton />
              ) : (
                <Form 
                  form={form} 
                  layout="vertical" 
                  onFinish={onFinish} 
                  className="p-6"
                  initialValues={{ requires_bed: false }}
                >
                  
                  {/* Step 0: Personal Identity */}
                  {currentStep === 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <Row gutter={16}>
                        <Col span={18}>
                          <Form.Item name="baseUsername" label={<Text strong>Student Full Name</Text>} rules={[{ required: true }]}>
                            <Input prefix={<User size={14} className="text-slate-400 mr-2"/>} placeholder="e.g. John Doe" className="h-12 rounded-xl" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="initial" label={<Text strong>Initial</Text>} rules={[{ required: true, maxLength: 1 }]}>
                            <Input placeholder="D" className="h-12 rounded-xl text-center font-bold" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="email" label={<Text strong>Institutional Email</Text>} rules={[{ type: 'email' }]}>
                        <Input prefix={<Mail size={14} className="text-slate-400 mr-2"/>} placeholder="student@college.edu" className="h-12 rounded-xl" />
                      </Form.Item>
                      <Form.Item name="password" label={<Text strong>Access Password</Text>} rules={[{ required: true, min: 6 }]}>
                        <Input.Password prefix={<Lock size={14} className="text-slate-400 mr-2"/>} placeholder="Min. 6 characters" className="h-12 rounded-xl" />
                      </Form.Item>
                    </div>
                  )}

                  {/* Step 1: Academic Logic */}
                  {currentStep === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <Form.Item name="roll_number" label={<Text strong>Roll Number / UID</Text>} rules={[{ required: true }]}>
                        <Input prefix={<Hash size={14} className="text-slate-400 mr-2"/>} placeholder="e.g. 2024CS101" className="h-12 rounded-xl" />
                      </Form.Item>
                      <Form.Item name="college" label={<Text strong>Affiliated College</Text>} rules={[{ required: true }]}>
                        <Select className="h-12" placeholder="Select College">
                          <Option value="NEC">National Engineering College (NEC)</Option>
                          <Option value="LAPC">LAPC Campus</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="session_id" label={<Text strong>Academic Session</Text>} rules={[{ required: true }]}>
                        <Select className="h-12" placeholder="Select Active Session">
                          {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item name="requires_bed" valuePropName="checked" className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <Checkbox>
                          <Text strong className="text-blue-700 ml-2">Authorize Bed Allocation</Text>
                          <Paragraph className="text-[11px] text-blue-600 m-0 ml-6">Checking this flags the student for immediate room assignment.</Paragraph>
                        </Checkbox>
                      </Form.Item>
                    </div>
                  )}

                  {/* Step 2: Confirmation & Summary */}
                  {currentStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-6">
                        <Title level={4} className="m-0 flex items-center gap-2"><ShieldCheck className="text-emerald-500"/> Verification Summary</Title>
                        <Row gutter={[16, 16]}>
                          <Col span={12}>
                            <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest">Legal Name</Text>
                            <Text strong className="block text-lg capitalize">{form.getFieldValue('baseUsername')} {form.getFieldValue('initial')}</Text>
                          </Col>
                          <Col span={12}>
                            <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest">Roll Number</Text>
                            <Text strong className="block text-lg">{form.getFieldValue('roll_number')}</Text>
                          </Col>
                          <Col span={12}>
                            <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest">Institution</Text>
                            <Text strong className="block">{form.getFieldValue('college')}</Text>
                          </Col>
                          <Col span={12}>
                            <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest">Bed Requirement</Text>
                            <Tag color={form.getFieldValue('requires_bed') ? 'blue' : 'default'} className="rounded-full border-none px-3 font-bold uppercase text-[9px]">
                              {form.getFieldValue('requires_bed') ? 'Authorized' : 'Day Scholar'}
                            </Tag>
                          </Col>
                        </Row>
                      </div>
                      
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3 mt-6">
                        <AlertCircle className="text-orange-500 shrink-0" size={20} />
                        <Text className="text-xs text-orange-800 leading-relaxed">
                          Confirming this creates a permanent institutional record. Account credentials will be generated instantly.
                        </Text>
                      </div>
                    </div>
                  )}

                  <div className="mt-12 flex justify-between gap-4">
                    {currentStep > 0 ? (
                      <Button onClick={prev} size="large" icon={<ArrowLeft size={16}/>} className="rounded-xl h-14 px-8 border-slate-200">
                        Previous
                      </Button>
                    ) : <div/>}

                    {currentStep < 2 ? (
                      <Button type="primary" onClick={next} size="large" className="rounded-2xl h-14 px-12 font-bold shadow-lg shadow-blue-100 flex items-center gap-2">
                        Next Step <ArrowRight size={18}/>
                      </Button>
                    ) : (
                      <Button type="primary" htmlType="submit" size="large" loading={loading} icon={<Send size={18}/>} className="rounded-2xl h-14 px-12 font-bold shadow-lg shadow-blue-100">
                        Complete Enrollment
                      </Button>
                    )}
                  </div>
                </Form>
              )}
            </Card>
          </Col>

          {/* Institutional Sidebar */}
          <Col lg={8} xs={24}>
            <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-[32px] bg-blue-600 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <Title level={4} className="text-white mb-4 flex items-center gap-2"><Info size={20}/> Onboarding Protocol</Title>
                  <Timeline 
                    mode="left"
                    items={[
                      { children: <Text className="text-blue-50 text-[11px]">System creates student instance</Text>, color: '#fff' },
                      { children: <Text className="text-blue-50 text-[11px]">Authorized roll number link</Text>, color: '#fff' },
                      { children: <Text className="text-blue-50 text-[11px]">Academic session binding</Text>, color: '#fff' },
                      { children: <Text className="text-blue-100 font-bold text-[11px]">Ready for Warden Allotment</Text>, color: '#10b981' },
                    ]}
                  />
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-400 rounded-full opacity-20" />
              </Card>

              <Card className="border-none shadow-sm rounded-[32px] p-2 bg-white">
                <Title level={5} className="mb-4 px-2">Data Integrity</Title>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Paragraph className="text-[11px] text-slate-500 m-0 leading-relaxed">
                    Once enrolled, student credentials will be sent to the registered institutional email. Ensure the <strong>Initial</strong> field matches the official identity document.
                  </Paragraph>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default EnrollStudent;