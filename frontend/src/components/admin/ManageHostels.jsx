import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Space, 
  Divider, ConfigProvider, theme, Skeleton, Badge, 
  Tag, Progress, Empty, message 
} from 'antd';
import { 
  Building, MapPin, Phone, Mail, Users, Bed, 
  RefreshCw, Plus, ShieldCheck, Activity, Inbox, 
  ChevronRight, Calendar
} from 'lucide-react';
import moment from 'moment';
import { adminAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

// --- Specialized Skeletons for Precise UI Matching ---
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

const ManageHostels = () => {
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
      // Subtle delay for smooth shimmer effect
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchHostels(); }, [fetchHostels]);

  // --- Aggregate Stats ---
  const stats = useMemo(() => ({
    total: hostels.length,
    capacity: hostels.reduce((acc, curr) => acc + (curr.capacity || 0), 0),
    rooms: hostels.reduce((acc, curr) => acc + (curr.tbl_HostelRooms?.length || 0), 0)
  }), [hostels]);

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Building className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Hostel Management</Title>
              <Text type="secondary">Master registry and capacity audit for institutional housing units</Text>
            </div>
          </div>
          <Space>
            <Button icon={<RefreshCw size={16}/>} onClick={fetchHostels} className="rounded-xl h-11 px-6 font-bold shadow-sm">Sync Journal</Button>
            <Button type="primary" icon={<Plus size={18}/>} className="h-11 rounded-xl px-6 font-bold shadow-lg shadow-blue-100 border-none bg-blue-600">Add Unit</Button>
          </Space>
        </div>

        {loading ? (
          <>
            <HostelStatsSkeleton />
            <HostelCardSkeleton />
          </>
        ) : (
          <>
            {/* Quick Metrics */}
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

            {/* Hostel Grid */}
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
                              <ShieldCheck size={10}/> Institutional Unit
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
                              <Bed size={14} className="text-slate-400"/>
                              <Text strong className="text-xs">{hostel.tbl_HostelRooms?.length || 0} Rooms</Text>
                           </div>
                           <Divider type="vertical" className="h-4 border-slate-200" />
                           <div className="flex items-center gap-2">
                              <Users size={14} className="text-slate-400"/>
                              <Text strong className="text-xs">{hostel.capacity} Beds</Text>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                       <div className="flex items-center gap-2 text-slate-400">
                          <Calendar size={12}/>
                          <Text className="text-[10px] font-bold uppercase">Registry: {moment(hostel.createdAt).format('YYYY')}</Text>
                       </div>
                       <Button type="text" className="text-blue-600 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Open Details <ChevronRight size={14}/>
                       </Button>
                    </div>
                  </Card>
                </Col>
              )) : (
                <Col span={24}>
                  <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[40px] shadow-sm border border-slate-50">
                    <Empty image={<div className="bg-slate-50 p-10 rounded-full mb-4"><Inbox size={80} className="text-slate-200" /></div>} description={<Text className="text-slate-400 font-medium block">No institutional units registered in the system.</Text>} />
                  </div>
                </Col>
              )}
            </Row>
          </>
        )}
      </div>
    </ConfigProvider>
  );
};

export default ManageHostels;