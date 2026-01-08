import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Input, Button, InputNumber, 
  Typography, Row, Col, Divider, message, 
  ConfigProvider, theme, Space, Skeleton
} from 'antd';
import { 
  Building, MapPin, Phone, Mail, Users, 
  CheckCircle2, Info, ShieldCheck, Send, RotateCcw 
} from 'lucide-react';
import { adminAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// --- Specialized Skeleton for the Registration Form ---
const RegistrationSkeleton = () => (
  <div className="p-8 space-y-8 animate-pulse">
    <div className="space-y-4">
      <Skeleton.Input active size="small" style={{ width: 150 }} />
      <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
    </div>
    <div className="space-y-4">
      <Skeleton.Input active size="small" style={{ width: 120 }} />
      <Skeleton.Input active block style={{ height: 100, borderRadius: 12 }} />
    </div>
    <Row gutter={16}>
      <Col span={12}>
        <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
      </Col>
      <Col span={12}>
        <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
      </Col>
    </Row>
    <div className="pt-4">
      <Skeleton.Button active style={{ width: 200, height: 56, borderRadius: 16 }} />
    </div>
  </div>
);

const CreateHostel = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [componentLoading, setComponentLoading] = useState(true);

  // Simulate initial data sync/loading
  useEffect(() => {
    const timer = setTimeout(() => setComponentLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await adminAPI.createHostel({
        ...values,
        capacity: parseInt(values.capacity)
      });
      
      message.success('Institutional unit registered successfully!');
      form.resetFields();
    } catch (error) {
      console.error('Registration Error:', error);
      message.error(error.response?.data?.message || 'Protocol violation: Failed to create hostel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
            <Building className="text-white" size={24} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Hostel Registration</Title>
            <Text type="secondary">Deploy a new institutional housing unit into the management ecosystem</Text>
          </div>
        </div>

        <Row gutter={24}>
          <Col lg={16} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden p-2">
              {componentLoading ? (
                <RegistrationSkeleton />
              ) : (
                <>
                  <div className="px-8 pt-8 pb-4">
                    <Title level={4} className="flex items-center gap-2">
                      <ShieldCheck className="text-blue-600" size={20} />
                      Unit Specifications
                    </Title>
                    <Paragraph className="text-slate-500 text-sm">Ensure all mandatory fields are verified before committing to the registry.</Paragraph>
                  </div>
                  <Divider className="my-2 border-slate-100" />

                  <Form 
                    form={form} 
                    layout="vertical" 
                    onFinish={onFinish} 
                    className="p-8"
                    autoComplete="off"
                  >
                    {/* Basic Identity */}
                    <Form.Item 
                      name="name" 
                      label={<Text strong>Hostel Identity Name</Text>} 
                      rules={[{ required: true, message: 'Institutional name is required' }]}
                    >
                      <Input 
                        prefix={<Building size={18} className="text-slate-400 mr-2"/>} 
                        placeholder="e.g. Platinum Boys Residency" 
                        className="h-12 rounded-xl" 
                      />
                    </Form.Item>

                    {/* Geographical Data */}
                    <Form.Item 
                      name="address" 
                      label={<Text strong>Physical Location / Address</Text>}
                    >
                      <TextArea 
                        prefix={<MapPin size={18} className="text-slate-400 mr-2"/>} 
                        rows={3} 
                        placeholder="Provide complete geographical details of the unit..." 
                        className="rounded-xl p-4 border-slate-200" 
                      />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          name="contact_number" 
                          label={<Text strong>Emergency Contact</Text>}
                        >
                          <Input 
                            prefix={<Phone size={18} className="text-slate-400 mr-2"/>} 
                            placeholder="+91 XXXXX XXXXX" 
                            className="h-12 rounded-xl" 
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          name="email" 
                          label={<Text strong>Official Email Handle</Text>}
                          rules={[{ type: 'email', message: 'Enter a valid institutional email' }]}
                        >
                          <Input 
                            prefix={<Mail size={18} className="text-slate-400 mr-2"/>} 
                            placeholder="admin@unit.institution.edu" 
                            className="h-12 rounded-xl" 
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Capacity Analytics */}
                    <Form.Item 
                      name="capacity" 
                      label={<Text strong>Authorized Bed Capacity</Text>}
                      rules={[{ required: true, message: 'Capacity threshold must be defined' }]}
                    >
                      <InputNumber 
                        min={1} 
                        prefix={<Users size={18} className="text-slate-400 mr-2"/>} 
                        placeholder="e.g. 250" 
                        className="w-full h-12 rounded-xl flex items-center" 
                      />
                    </Form.Item>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 mb-8">
                      <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                      <Text className="text-xs text-blue-700 leading-relaxed">
                        Note: Registering a new unit will allow wardens to define room layouts and begin student allotments for the upcoming academic cycle.
                      </Text>
                    </div>

                    <div className="flex gap-4">
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        size="large" 
                        loading={loading} 
                        icon={<Send size={18}/>} 
                        className="h-14 px-12 rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center gap-2"
                      >
                        Create
                      </Button>
                      <Button 
                        size="large" 
                        icon={<RotateCcw size={18}/>} 
                        onClick={() => form.resetFields()}
                        className="h-14 px-8 rounded-2xl border-slate-200"
                      >
                        Reset
                      </Button>
                    </div>
                  </Form>
                </>
              )}
            </Card>
          </Col>

          {/* Institutional Sidebar */}
          <Col lg={8} xs={24}>
            <div className="space-y-6">
              {componentLoading ? (
                <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white">
                  <Skeleton active paragraph={{ rows: 6 }} />
                </Card>
              ) : (
                <>
                  <Card className="border-none shadow-sm rounded-[32px] bg-slate-900 text-white relative overflow-hidden">
                    <div className="relative z-10 p-2">
                      <Title level={4} style={{ color: 'white' }} className="mb-4 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-blue-400" />
                        Protocol Compliance
                      </Title>
                      <Paragraph className="text-slate-400 text-xs leading-relaxed">
                        By registering this unit, you acknowledge institutional standards for:
                      </Paragraph>
                      <ul className="text-xs space-y-4 text-slate-300 pl-4 list-disc mt-4">
                        <li>Occupational Safety & Fire Compliance</li>
                        <li>Resource Allotment per Square Meter</li>
                        <li>Digital Audit Trail Implementation</li>
                        <li>Institutional Billing Cycle Integration</li>
                      </ul>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-2xl" />
                  </Card>

                  <Card className="border-none shadow-sm rounded-[32px] p-2 bg-white">
                    <Title level={5} className="mb-4 px-4 pt-4">Resource Management</Title>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <Paragraph className="text-[11px] text-slate-500 m-0 leading-relaxed italic">
                        "Ensure the Bed Capacity matches the physical architectural plan. Over-provisioning may lead to system-wide audit flags."
                      </Paragraph>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default CreateHostel;