import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, Divider,message,Modal, Badge,
  Input, Form, Tag, Skeleton, ConfigProvider, theme, Tooltip 
} from 'antd';
import { 
  User, Mail, Lock, Eye, EyeOff, Key, Users, Home,Info,XCircle,
  ShieldCheck, ArrowRight, ShieldAlert, CheckCircle2, 
  UserCircle, Bed, MapPin, Hash, Phone 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentAPI, authAPI } from '../../services/api';

const { Title, Text } = Typography;

// --- 1. High-Fidelity Skeleton for Profile ---
const ProfileSkeleton = () => (
  <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
    <div className="flex gap-6 items-center">
      <Skeleton.Avatar active size={100} shape="circle" />
      <div className="flex-1">
        <Skeleton active title={{ width: 200 }} paragraph={{ rows: 2 }} />
      </div>
    </div>
    <Row gutter={24}>
      <Col span={12}><Skeleton.Button active block style={{ height: 200, borderRadius: 32 }} /></Col>
      <Col span={12}><Skeleton.Button active block style={{ height: 200, borderRadius: 32 }} /></Col>
    </Row>
  </div>
);

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [roomMates, setRoomMates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm] = Form.useForm();
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getProfile();
      const profileData = response.data.data;
      setProfile(profileData);

      if (profileData?.tbl_RoomAllotments?.length > 0) {
        const mateRes = await studentAPI.getRoommates();
        setRoomMates(mateRes.data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchProfileData(); }, [fetchProfileData]);

  const onPasswordFinish = async (values) => {
    setSubmittingPassword(true);
    try {
      await authAPI.changePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      message.success('Security credentials updated successfully');
      setIsChangingPassword(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || 'Password update failed');
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  const roomInfo = profile?.tbl_RoomAllotments?.[0]?.HostelRoom;
  const hostel = profile?.Hostel;

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 24 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-blue-100 border-4 border-white overflow-hidden">
                {profile?.profileImage ? (
                  <img src={profile.profileImage} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  profile?.userName?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white" />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>{profile?.userName}</Title>
              <Space split={<Divider type="vertical" />}>
                <Text className="text-slate-400 font-medium">#{profile?.roll_number || 'STU-ID'}</Text>
                <Tag bordered={false} color="blue" className="rounded-full px-4 font-bold uppercase text-[10px]">Student Member</Tag>
              </Space>
            </div>
          </div>
          <Button icon={<Key size={16}/>} onClick={() => setIsChangingPassword(true)} className="rounded-xl h-12 px-6 font-bold shadow-sm">Password Settings</Button>
        </div>

        <Row gutter={[24, 24]}>
          {/* Account Details */}
          <Col lg={12} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] h-full" title={<div className="flex items-center gap-2"><User size={18} className="text-blue-600" /><Text strong>Account Information</Text></div>}>
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm"><Mail size={20} /></div>
                  <div>
                    <Text className="text-[10px] uppercase font-bold text-slate-400 block">Primary Email</Text>
                    <Text strong className="text-slate-700">{profile?.email}</Text>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm"><Home size={20} /></div>
                  <div>
                    <Text className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Hostel</Text>
                    <Text strong className="text-slate-700">{hostel?.name || 'N/A'}</Text>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 px-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 text-xs">
                   <Info size={14} /> To update official details, contact the Hostel Administration Office.
                </div>
              </div>
            </Card>
          </Col>

          {/* Room Allocation */}
          <Col lg={12} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] h-full" title={<div className="flex items-center gap-2"><Bed size={18} className="text-purple-600" /><Text strong>Housing Status</Text></div>}>
              {roomInfo ? (
                <div className="space-y-4">
                  <Row gutter={16}>
                    <Col span={12}>
                      <div className="bg-slate-50 p-6 rounded-3xl text-center border border-slate-100">
                        <Text className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Room Number</Text>
                        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>{roomInfo.room_number}</Title>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="bg-slate-50 p-6 rounded-3xl text-center border border-slate-100">
                        <Text className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Room Type</Text>
                        <Title level={3} style={{ margin: 0, color: '#1e293b' }}>{roomInfo.tbl_RoomType?.name || 'Standard'}</Title>
                      </div>
                    </Col>
                  </Row>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <Space><MapPin size={16} className="text-slate-400" /><Text className="text-xs text-slate-500">{hostel?.address || 'Main Campus'}</Text></Space>
                    <Tag color="success" className="rounded-full border-none px-3 font-bold uppercase text-[9px]">Verified Allocation</Tag>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-8">
                  <XCircle size={48} className="text-slate-200 mb-4" />
                  <Text className="text-slate-400 italic">No room currently allotted</Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Roommates Grid */}
        {roomInfo && (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: '24px' }} title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Users size={18} className="text-emerald-600" /><Text strong>Shared Occupants</Text></div>
              <Badge count={roomMates.length} color="#10b981" />
            </div>
          }>
            <Row gutter={[20, 20]}>
              {roomMates.length > 0 ? roomMates.map((mate) => (
                <Col lg={8} md={12} xs={24} key={mate.id}>
                  <div className="p-5 rounded-[24px] bg-white border border-slate-100 shadow-sm hover:border-blue-200 transition-all group flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {mate.userName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Text strong className="block truncate text-slate-700">{mate.userName}</Text>
                      <Text className="text-[10px] font-bold text-blue-500 uppercase">{mate.roll_number || 'STU'}</Text>
                    </div>
                  </div>
                </Col>
              )) : (
                <Col span={24} className="text-center py-10">
                   <Text className="text-slate-400 italic">You are currently the sole occupant of this room</Text>
                </Col>
              )}
            </Row>
          </Card>
        )}

        {/* Change Password Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><ShieldCheck size={20}/> Account Security</div>}
          open={isChangingPassword}
          onCancel={() => { setIsChangingPassword(false); passwordForm.resetFields(); }}
          footer={null}
          width={480}
          className="rounded-3xl"
        >
          <Form form={passwordForm} layout="vertical" onFinish={onPasswordFinish} className="mt-6">
            <Form.Item name="currentPassword" label="Existing Password" rules={[{ required: true }]}>
              <Input.Password prefix={<Lock size={14} className="mr-2 text-slate-300"/>} placeholder="••••••••" className="h-12 rounded-xl" />
            </Form.Item>
            
            <Divider className="my-6 border-slate-100" />
            
            <Form.Item name="newPassword" label="New Secure Password" rules={[{ required: true, min: 8 }]}>
              <Input.Password prefix={<ShieldCheck size={14} className="mr-2 text-slate-300"/>} placeholder="Min. 8 characters" className="h-12 rounded-xl" />
            </Form.Item>

            <Form.Item name="confirmNewPassword" label="Confirm Password" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match!'));
              },
            })]}>
              <Input.Password prefix={<CheckCircle2 size={14} className="mr-2 text-slate-300"/>} placeholder="Repeat new password" className="h-12 rounded-xl" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block size="large" loading={submittingPassword} className="h-14 rounded-2xl shadow-lg shadow-blue-100 font-bold mt-4">
              Update Security Credentials
            </Button>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default StudentProfile;