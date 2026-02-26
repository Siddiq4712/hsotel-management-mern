import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Input, Button, Select, Typography, 
  Row, Col, Divider, message, ConfigProvider, theme, 
  Space, Skeleton, Modal
} from 'antd';
import { 
  User, Lock, Building, CheckCircle2, AlertCircle, 
  Mail, ShieldCheck, UserPlus, RotateCcw, Send, Info
} from 'lucide-react';
import { adminAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// --- Specialized Skeleton for Precise UI Matching ---
const FormSkeleton = () => (
  <div className="p-8 space-y-8 animate-pulse">
    <div className="space-y-4">
      <Skeleton.Input active size="small" style={{ width: 150 }} />
      <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
    </div>
    <Row gutter={16}>
      <Col span={12}>
        <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
      </Col>
      <Col span={12}>
        <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
      </Col>
    </Row>
    <div className="space-y-4">
      <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
    </div>
    <div className="pt-4 flex gap-4">
      <Skeleton.Button active style={{ width: 160, height: 56, borderRadius: 16 }} />
      <Skeleton.Button active style={{ width: 100, height: 56, borderRadius: 16 }} />
    </div>
  </div>
);

const CreateUser = () => {
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [hostels, setHostels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [componentLoading, setComponentLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [roleCreating, setRoleCreating] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [hostelResponse, roleResponse] = await Promise.all([
        adminAPI.getHostels(),
        adminAPI.getRoles()
      ]);
      setHostels(hostelResponse.data.data || []);
      setRoles(roleResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      message.error('Failed to sync role/hostel registry.');
    } finally {
      // Intentional minor delay for smooth shimmer effect
      setTimeout(() => setComponentLoading(false), 600);
    }
  };

  const fetchRoles = async () => {
    const response = await adminAPI.getRoles();
    setRoles(response.data.data || []);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const selectedRole = roles.find((r) => r.roleId === values.roleId);
      const isAdminRole = selectedRole?.roleName?.toLowerCase() === 'admin';

      await adminAPI.createUser({
        ...values,
        role: selectedRole?.roleName,
        hostel_id: isAdminRole ? null : parseInt(values.hostel_id, 10)
      });
      
      message.success('System identity provisioned successfully!');
      form.resetFields();
      setSelectedRoleId(null);
    } catch (error) {
      console.error('Provisioning Error:', error);
      message.error(error.response?.data?.message || 'Protocol violation: User creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const values = await roleForm.validateFields();
      setRoleCreating(true);
      await adminAPI.createRole(values);
      message.success('New role created successfully');
      roleForm.resetFields();
      setRoleModalVisible(false);
      await fetchRoles();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message || 'Failed to create role');
    } finally {
      setRoleCreating(false);
    }
  };

  const selectedRole = roles.find((r) => r.roleId === selectedRoleId);
  const isAdminRole = selectedRole?.roleName?.toLowerCase() === 'admin';

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <UserPlus className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 600 }}>Provision Identity</Title>
              <Text type="secondary">Deploy new user credentials into the institutional ecosystem</Text>
            </div>
          </div>
          <Button type="primary" ghost className="rounded-xl h-11 px-5 font-semibold" onClick={() => setRoleModalVisible(true)}>
            + Create Role
          </Button>
        </div>

        <Row gutter={24}>
          <Col lg={16} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden p-2">
              {componentLoading ? (
                <FormSkeleton />
              ) : (
                <>
                  <div className="px-8 pt-8 pb-4">
                    <Title level={4} className="flex items-center gap-2">
                      <ShieldCheck className="text-blue-600" size={20} />
                      Credential Configuration
                    </Title>
                    <Paragraph className="text-slate-500 text-sm">Define access levels and institutional binding for the new user profile.</Paragraph>
                  </div>
                  <Divider className="my-2 border-slate-100" />

                  <Form 
                    form={form} 
                    layout="vertical" 
                    onFinish={onFinish} 
                    className="p-8"
                    autoComplete="off"
                    onValuesChange={(changedValues) => {
                      if (Object.prototype.hasOwnProperty.call(changedValues, 'roleId')) {
                        setSelectedRoleId(changedValues.roleId);
                      }
                    }}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          name="userName" 
                          label={<Text strong>Unique userName</Text>} 
                          rules={[{ required: true, message: 'Identity handle required' }]}
                        >
                          <Input 
                            prefix={<User size={18} className="text-slate-400 mr-2"/>} 
                            placeholder="j.doe_admin" 
                            className="h-12 rounded-xl" 
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item 
                          name="email" 
                          label={<Text strong>Institutional Email</Text>} 
                          rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
                        >
                          <Input 
                            prefix={<Mail size={18} className="text-slate-400 mr-2"/>} 
                            placeholder="user@institution.edu" 
                            className="h-12 rounded-xl" 
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item 
                      name="password" 
                      label={<Text strong>Access Password</Text>} 
                      rules={[{ required: true, min: 6, message: 'Minimum 6 characters' }]}
                    >
                      <Input.Password 
                        prefix={<Lock size={18} className="text-slate-400 mr-2"/>} 
                        placeholder="••••••••" 
                        className="h-12 rounded-xl" 
                      />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item 
                          name="roleId" 
                          label={<Text strong>Access Role</Text>} 
                          rules={[{ required: true }]}
                        >
                          <Select placeholder="Select level" className="h-12 w-full">
                            {roles.map(role => (
                              <Option key={role.roleId} value={role.roleId}>{role.roleName}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      
                      <Col span={12}>
                        {selectedRoleId && !isAdminRole && (
                          <Form.Item 
                            name="hostel_id" 
                            label={<Text strong>Assigned Hostel Unit</Text>}
                            rules={[{ required: true, message: 'Unit binding required' }]}
                          >
                            <Select 
                              prefix={<Building size={18} />}
                              placeholder="Choose Unit" 
                              className="h-12 w-full"
                            >
                              {hostels.map(h => (
                                <Option key={h.id} value={h.id}>{h.name}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        )}
                      </Col>
                    </Row>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 mb-8 mt-4">
                      <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                      <Text className="text-xs text-blue-700 leading-relaxed">
                        Provisioning this user will grant immediate access based on the selected role. 
                        Warden and Student roles require valid hostel unit binding for data isolation.
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
                        Deploy Identity
                      </Button>
                      <Button 
                        size="large" 
                        icon={<RotateCcw size={18}/>} 
                        onClick={() => { form.resetFields(); setSelectedRoleId(null); }}
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

          {/* Contextual Sidebar */}
          <Col lg={8} xs={24}>
            <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-[32px] bg-slate-900 text-white relative overflow-hidden">
                <div className="relative z-10 p-2">
                  <Title level={4} style={{ color: 'white' }} className="mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-blue-400" />
                    Security Protocol
                  </Title>
                  <Paragraph className="text-slate-400 text-xs leading-relaxed">
                    User identities are tied to the Institutional Access Control List (ACL). 
                  </Paragraph>
                  
                  

[Image of identity and access management workflow]


                  <ul className="text-xs space-y-4 text-slate-300 pl-4 list-disc mt-4">
                    <li>Multi-factor authentication ready</li>
                    <li>Role-based dashboard redirection</li>
                    <li>Encrypted credential storage (Bcrypt)</li>
                    <li>Activity audit trail integration</li>
                  </ul>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-2xl" />
              </Card>

              <Card className="border-none shadow-sm rounded-[32px] p-2 bg-white">
                <Title level={5} className="mb-4 px-4 pt-4">Provisioning Note</Title>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Paragraph className="text-[11px] text-slate-500 m-0 leading-relaxed italic">
                    "Assigning a 'Warden' role without a Hostel binding will restrict their ability to manage rooms, attendance, and student grievances."
                  </Paragraph>
                </div>
              </Card>
            </div>
          </Col>
        </Row>

        <Modal
          title="Create New Role"
          open={roleModalVisible}
          onCancel={() => {
            setRoleModalVisible(false);
            roleForm.resetFields();
          }}
          onOk={handleCreateRole}
          confirmLoading={roleCreating}
          okText="Create Role"
        >
          <Form form={roleForm} layout="vertical">
            <Form.Item
              name="roleName"
              label="Role Name"
              rules={[
                { required: true, message: 'Role name is required' },
                { min: 2, message: 'Role name must be at least 2 characters' }
              ]}
            >
              <Input placeholder="e.g. Warden, Mess, Student, Admin" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default CreateUser;
