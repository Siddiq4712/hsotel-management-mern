import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Form, Input, Button, InputNumber,
  Typography, Row, Col, Divider, message,
  ConfigProvider, theme, Space, Skeleton,
  Tag, Progress, Empty, Badge
} from 'antd';
import {
  Building, MapPin, Phone, Mail, Users, Bed,
  CheckCircle2, Info, ShieldCheck, Send, RotateCcw,
  RefreshCw, Plus, Activity, Inbox,
  ChevronRight, Calendar, PlusCircle, LayoutGrid
} from 'lucide-react';
import moment from 'moment';
import { adminAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ─── Skeletons ───────────────────────────────────────────────

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

const HostelStatsSkeleton = () => (
  <Row gutter={[24, 24]} className="mb-8">
    {[...Array(3)].map((_, i) => (
      <Col xs={24} md={8} key={i}>
        <Card className="border-none shadow-sm rounded-[32px] p-5 bg-white">
          <Skeleton loading active avatar={{ size: 'small', shape: 'square' }} paragraph={{ rows: 1 }} title={false} />
        </Card>
      </Col>
    ))}
  </Row>
);

const HostelCardSkeleton = () => (
  <Row gutter={[24, 24]}>
    {[...Array(3)].map((_, i) => (
      <Col xs={24} md={12} lg={8} key={i}>
        <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
          <Skeleton active avatar={{ size: 'large', shape: 'circle' }} title={{ width: '60%' }} paragraph={{ rows: 4 }} />
        </Card>
      </Col>
    ))}
  </Row>
);

// ─── Create Hostel Section ───────────────────────────────────

const CreateHostelSection = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [componentLoading, setComponentLoading] = useState(true);

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
    <div className="p-8">
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
                  <Form.Item
                    name="name"
                    label={<Text strong>Hostel Identity Name</Text>}
                    rules={[{ required: true, message: 'Institutional name is required' }]}
                  >
                    <Input
                      prefix={<Building size={18} className="text-slate-400 mr-2" />}
                      placeholder="e.g. Platinum Boys Residency"
                      className="h-12 rounded-xl"
                    />
                  </Form.Item>

                  <Form.Item
                    name="address"
                    label={<Text strong>Physical Location / Address</Text>}
                  >
                    <TextArea
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
                          prefix={<Phone size={18} className="text-slate-400 mr-2" />}
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
                          prefix={<Mail size={18} className="text-slate-400 mr-2" />}
                          placeholder="admin@unit.institution.edu"
                          className="h-12 rounded-xl"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="capacity"
                    label={<Text strong>Authorized Bed Capacity</Text>}
                    rules={[{ required: true, message: 'Capacity threshold must be defined' }]}
                  >
                    <InputNumber
                      min={1}
                      prefix={<Users size={18} className="text-slate-400 mr-2" />}
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
                      icon={<Send size={18} />}
                      className="h-14 px-12 rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center gap-2"
                    >
                      Create
                    </Button>
                    <Button
                      size="large"
                      icon={<RotateCcw size={18} />}
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
  );
};

// ─── Manage Hostels Section ──────────────────────────────────

const ManageHostelsSection = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHostels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getHostels();
      setHostels(response.data.data || []);
    } catch (error) {
      message.error('Hostel registry synchronization failed.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchHostels(); }, [fetchHostels]);

  const stats = useMemo(() => ({
    total: hostels.length,
    capacity: hostels.reduce((acc, curr) => acc + (curr.capacity || 0), 0),
    rooms: hostels.reduce((acc, curr) => acc + (curr.tbl_HostelRooms?.length || 0), 0)
  }), [hostels]);

  return (
    <div className="p-8">
      <div className="flex justify-end mb-8">
        <Space>
          <Button icon={<RefreshCw size={16} />} onClick={fetchHostels} className="rounded-xl h-11 px-6 font-bold shadow-sm">Sync Journal</Button>
        </Space>
      </div>

      {loading ? (
        <>
          <HostelStatsSkeleton />
          <HostelCardSkeleton />
        </>
      ) : (
        <>
          <Row gutter={[24, 24]} className="mb-8">
            {[
              { label: 'Total Units', val: stats.total, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Global Capacity', val: stats.capacity, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Total Rooms', val: stats.rooms, icon: Bed, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((stat, i) => (
              <Col xs={24} md={8} key={i}>
                <Card className="border-none shadow-sm rounded-[32px] p-5 bg-white group hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon size={22} />
                    </div>
                    <div className="flex flex-col">
                      <Text className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-tight">{stat.label}</Text>
                      <Text className="text-2xl font-black text-slate-800 leading-none mt-1">{stat.val}</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[24, 24]}>
            {hostels.length > 0 ? hostels.map((hostel) => (
              <Col xs={24} md={12} lg={8} key={hostel.id}>
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden p-2 group hover:shadow-xl transition-all">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                          <Building size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">{hostel.name}</h3>
                          <Tag bordered={false} color="success" className="rounded-full px-3 font-bold uppercase text-[9px] m-0 flex items-center gap-1">
                            <ShieldCheck size={10} /> Institutional Unit
                          </Tag>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex items-center text-sm font-medium text-slate-500">
                        <MapPin size={16} className="mr-3 text-slate-300 shrink-0" />
                        <Text className="truncate text-slate-500">{hostel.address || 'Location Unset'}</Text>
                      </div>
                      <div className="flex items-center text-sm font-medium text-slate-500">
                        <Phone size={16} className="mr-3 text-slate-300 shrink-0" />
                        {hostel.contact_number}
                      </div>
                      <div className="flex items-center text-sm font-medium text-slate-500">
                        <Mail size={16} className="mr-3 text-slate-300 shrink-0" />
                        <Text className="truncate text-slate-500">{hostel.email}</Text>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        <span>Resource Load</span>
                        <span className="text-blue-600">{hostel.capacity} Total Beds</span>
                      </div>
                      <Progress
                        percent={100}
                        status="active"
                        showInfo={false}
                        strokeColor={{ '0%': '#3b82f6', '100%': '#2563eb' }}
                        strokeWidth={6}
                      />
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <Bed size={14} className="text-slate-400" />
                          <Text strong className="text-xs">{hostel.tbl_HostelRooms?.length || 0} Rooms</Text>
                        </div>
                        <Divider type="vertical" className="h-4 border-slate-200" />
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-400" />
                          <Text strong className="text-xs">{hostel.capacity} Beds</Text>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={12} />
                      <Text className="text-[10px] font-bold uppercase">Registry: {moment(hostel.createdAt).format('YYYY')}</Text>
                    </div>
                    <Button type="text" className="text-blue-600 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Details <ChevronRight size={14} />
                    </Button>
                  </div>
                </Card>
              </Col>
            )) : (
              <Col span={24}>
                <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[40px] shadow-sm border border-slate-50">
                  <Empty
                    image={
                      <div className="bg-slate-50 p-10 rounded-full mb-4">
                        <Inbox size={80} className="text-slate-200" />
                      </div>
                    }
                    description={
                      <Text className="text-slate-400 font-medium block">
                        No institutional units registered in the system.
                      </Text>
                    }
                  />
                </div>
              </Col>
            )}
          </Row>
        </>
      )}
    </div>
  );
};

// ─── Main Combined Page ──────────────────────────────────────

const HostelHub = () => {
  const [activeTab, setActiveTab] = useState('manage');

  const tabs = [
    {
      key: 'manage',
      label: 'Manage Hostels',
      icon: LayoutGrid,
      description: 'View & audit all units',
    },
    {
      key: 'create',
      label: 'Create Hostel',
      icon: PlusCircle,
      description: 'Register a new unit',
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: '#2563eb', borderRadius: 16 },
      }}
    >
      <div className="min-h-screen bg-slate-50">
        {/* Sticky Tab Bar */}
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
          <div className="px-8 pt-6 pb-0">
            {/* Page Identity */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-100">
                <Building className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 leading-none tracking-tight">
                  Hostel Operations
                </h1>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Institutional Housing Management System
                </p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      relative flex items-center gap-2.5 px-6 py-3 rounded-t-2xl
                      font-bold text-sm transition-all duration-300 cursor-pointer
                      border-none outline-none
                      ${isActive
                        ? 'bg-slate-50 text-blue-600 shadow-sm'
                        : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                      }
                    `}
                  >
                    <Icon
                      size={18}
                      className={`transition-colors duration-300 ${
                        isActive ? 'text-blue-600' : 'text-slate-300'
                      }`}
                    />
                    <div className="flex flex-col items-start">
                      <span className="leading-none">{tab.label}</span>
                      <span
                        className={`text-[9px] font-medium mt-0.5 tracking-wide ${
                          isActive ? 'text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        {tab.description}
                      </span>
                    </div>

                    {isActive && (
                      <div className="absolute bottom-0 left-4 right-4 h-[3px] bg-blue-600 rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div
          key={activeTab}
          style={{ animation: 'fadeSlideIn 0.4s ease forwards' }}
        >
          {activeTab === 'manage' && <ManageHostelsSection />}
          {activeTab === 'create' && <CreateHostelSection />}
        </div>

        <style>{`
          @keyframes fadeSlideIn {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default HostelHub;