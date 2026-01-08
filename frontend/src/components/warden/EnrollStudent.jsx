import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Input, Select, Button, Checkbox, 
  Typography, Row, Col, Divider, message, 
  ConfigProvider, theme, Skeleton, Steps, Tag, Timeline, Descriptions
} from 'antd';
import { 
  User, Lock, CheckCircle2, AlertCircle, Bed, School, 
  Hash, Mail, Send, ArrowRight, ArrowLeft, GraduationCap,
  ShieldCheck, Info
} from 'lucide-react';
import { wardenAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

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
      setTimeout(() => setSessionsLoading(false), 800);
    }
  };

  // --- FINAL SAVE FUNCTION (Only called on Step 2 Submit) ---
  const onFinish = async () => {
    setLoading(true);
    const allValues = form.getFieldsValue(true);
    
    const baseName = (allValues.baseUsername || "").trim().toUpperCase();
    const init = (allValues.initial || "").trim().toUpperCase();
    const finalUsername = `${baseName} ${init}`;

    const payload = {
      username: finalUsername,
      password: allValues.password,
      email: allValues.email || `${baseName.toLowerCase()}@hostel.com`,
      session_id: parseInt(allValues.session_id),
      roll_number: allValues.roll_number || "",
      college: allValues.college || "",
      requires_bed: allValues.requires_bed || false
    };

    try {
      await wardenAPI.enrollStudent(payload);
      message.success('Student record officially created and activated!');
      form.resetFields();
      setCurrentStep(0);
    } catch (error) {
      message.error(error.response?.data?.message || 'Server rejected enrollment.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      // Validate current visible fields before moving forward
      const fields = currentStep === 0 
        ? ['baseUsername', 'initial', 'password'] 
        : ['roll_number', 'college', 'session_id'];
      
      await form.validateFields(fields);
      setCurrentStep(currentStep + 1);
    } catch (e) {
      message.warning("Required fields are missing.");
    }
  };

  const handlePrev = () => setCurrentStep(currentStep - 1);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
        
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg text-white">
            <GraduationCap size={28} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Enrollment Hub</Title>
            <Text type="secondary">Digital Student Onboarding cycle</Text>
          </div>
        </div>

        <Row gutter={[24, 24]}>
          <Col lg={16} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden min-h-[550px]">
              {sessionsLoading ? <FormSkeleton /> : (
                <>
                  <div className="px-8 pt-8">
                    <Steps
                      current={currentStep}
                      items={[
                        { title: 'Personal', icon: <User size={18}/> },
                        { title: 'Academic', icon: <School size={18}/> },
                        { title: 'Review', icon: <ShieldCheck size={18}/> }
                      ]}
                    />
                  </div>
                  
                  <Divider className="my-8" />

                  <Form 
                    form={form} 
                    layout="vertical" 
                    onFinish={onFinish} 
                    className="px-8 pb-8"
                    preserve={true} // Critical: Keeps data when shifting between Steps
                  >
                    
                    {/* STEP 0: PERSONAL */}
                    <div className={currentStep === 0 ? "block animate-in fade-in duration-500" : "hidden"}>
                      <Row gutter={16}>
                        <Col span={18}>
                          <Form.Item name="baseUsername" label={<Text strong>Full Name</Text>} rules={[{ required: true }]}>
                            <Input prefix={<User size={16} className="text-slate-400"/>} placeholder="e.g. ARUN" className="h-12 rounded-xl" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="initial" label={<Text strong>Initial</Text>} rules={[{ required: true }]}>
                            <Input placeholder="K" className="h-12 text-center uppercase font-bold rounded-xl" maxLength={1} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="email" label={<Text strong>Email Address</Text>} rules={[{ type: 'email' }]}>
                        <Input prefix={<Mail size={16} className="text-slate-400"/>} placeholder="student@college.edu" className="h-12 rounded-xl" />
                      </Form.Item>
                      <Form.Item name="password" label={<Text strong>System Password</Text>} rules={[{ required: true, min: 6 }]}>
                        <Input.Password prefix={<Lock size={16} className="text-slate-400"/>} placeholder="Minimum 6 characters" className="h-12 rounded-xl" />
                      </Form.Item>
                    </div>

                    {/* STEP 1: ACADEMIC */}
                    <div className={currentStep === 1 ? "block animate-in fade-in duration-500" : "hidden"}>
                      <Form.Item name="roll_number" label={<Text strong>Roll Number / UID</Text>} rules={[{ required: true }]}>
                        <Input prefix={<Hash size={16} className="text-slate-400"/>} placeholder="e.g. 2024CS101" className="h-12 rounded-xl" />
                      </Form.Item>
                      <Form.Item name="college" label={<Text strong>College / Campus</Text>} rules={[{ required: true }]}>
                        <Select className="h-12 rounded-xl" placeholder="Select Affiliated College">
                          <Option value="nec">National Engineering College</Option>
                          <Option value="lapc">LAPC Campus</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="session_id" label={<Text strong>Academic Session</Text>} rules={[{ required: true }]}>
                        <Select className="h-12 rounded-xl" placeholder="Link to Active Session">
                          {sessions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item name="requires_bed" valuePropName="checked" className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <Checkbox>
                          <Text strong className="text-blue-700 ml-2 text-sm">Authorize Bed Allocation</Text>
                          <Paragraph className="text-[11px] text-blue-500 m-0 ml-6 italic">Enables the student for immediate room assignment by the warden.</Paragraph>
                        </Checkbox>
                      </Form.Item>
                    </div>

                    {/* STEP 2: REVIEW (The Final Screen) */}
                    {currentStep === 2 && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white rounded-2xl border-2 border-blue-50 shadow-sm overflow-hidden">
                          <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
                            <Text strong className="text-blue-700 flex items-center gap-2"><ShieldCheck size={16}/> Final Verification</Text>
                          </div>
                          <div className="p-6">
                            <Descriptions column={1} bordered size="small" className="bg-white">
                              <Descriptions.Item label={<Text type="secondary" small>Legal Name</Text>}>
                                <Text strong className="text-blue-900 uppercase">{form.getFieldValue('baseUsername')} {form.getFieldValue('initial')}</Text>
                              </Descriptions.Item>
                              <Descriptions.Item label={<Text type="secondary">Roll No</Text>}>
                                {form.getFieldValue('roll_number')}
                              </Descriptions.Item>
                              <Descriptions.Item label={<Text type="secondary">Institution</Text>}>
                                <span className="uppercase">{form.getFieldValue('college')}</span>
                              </Descriptions.Item>
                              <Descriptions.Item label={<Text type="secondary">Plan</Text>}>
                                {form.getFieldValue('requires_bed') ? <Tag color="blue" className="rounded-full px-3">HOSTEL RESIDENT</Tag> : <Tag className="rounded-full px-3">DAY SCHOLAR</Tag>}
                              </Descriptions.Item>
                            </Descriptions>
                          </div>
                        </div>
                        <div className="mt-6 flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                          <AlertCircle size={20} className="text-amber-500" />
                          <Text className="text-[11px] text-amber-800">Please confirm all data is correct. Clicking the button below will permanently sync this student to the central database.</Text>
                        </div>
                      </div>
                    )}

                    {/* BUTTON CONTAINER */}
                    <div className="mt-12 flex justify-between">
                      {currentStep > 0 ? (
                        <Button 
                          type="text" 
                          htmlType="button" // Important: Don't submit
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
                          htmlType="button" // Important: Don't submit
                          onClick={handleNext} 
                          size="large" 
                          className="h-14 px-12 rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center gap-2"
                        >
                          Next Step <ArrowRight size={18}/>
                        </Button>
                      ) : (
                        <Button 
                          type="primary" 
                          htmlType="submit" // THIS IS THE ONLY SUBMIT BUTTON
                          size="large" 
                          loading={loading} 
                          className="h-14 px-12 rounded-2xl font-bold bg-green-600 hover:bg-green-700 border-none shadow-lg shadow-green-100 flex items-center gap-2"
                        >
                          Confirm & Complete Enrollment <Send size={18}/>
                        </Button>
                      )}
                    </div>
                  </Form>
                </>
              )}
            </Card>
          </Col>

          {/* Institutional Protocol Sidebar */}
          <Col lg={8} xs={24}>
            <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-[32px] bg-blue-600 text-white relative overflow-hidden">
                <div className="relative z-10 p-2">
                  <Title level={4} className="text-white mb-6 flex items-center gap-2"><Info size={20}/> Onboarding Protocol</Title>
                  <Timeline 
                    mode="left"
                    items={[
                      { children: <Text className="text-blue-50 text-xs">Verify Student Identity</Text>, color: 'white' },
                      { children: <Text className="text-blue-50 text-xs">Map Academic Session</Text>, color: 'white' },
                      { children: <Text className="text-blue-100 font-bold text-xs">Warden Final Review</Text>, color: '#10b981' },
                    ]}
                  />
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-400 rounded-full opacity-10" />
              </Card>

              <Card className="border-none shadow-sm rounded-[32px] p-2 bg-white border border-slate-100">
                 <div className="p-4">
                    <Title level={5} className="mb-2">Data Integrity</Title>
                    <Paragraph className="text-xs text-slate-500 m-0 leading-relaxed">
                       Once enrolled, students will receive an invitation to log in via their institutional email. Ensure the <strong>Roll Number</strong> is unique.
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