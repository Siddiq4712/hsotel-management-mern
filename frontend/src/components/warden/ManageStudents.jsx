import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Table, Input, Button, Tag, Space, Typography, 
  Modal, Descriptions, Badge, Empty, Skeleton, ConfigProvider, theme 
} from 'antd';
import { 
  Users, User, Bed, Search, RefreshCw, Eye, 
  ChevronLeft, ChevronRight, Mail, Hash, BookOpen, 
  ShieldCheck, UserCircle, MapPin, Inbox
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

// --- Specialized Skeleton for Student List ---
const DirectorySkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Skeleton.Input active style={{ width: 300 }} />
        <Skeleton.Button active />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="circle" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: '20%' }} />
          </div>
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      ))}
    </div>
  </Card>
);

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [roommatesLoading, setRoommatesLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getStudents();
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Directory Sync Error:', error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.roll_number && s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [students, searchTerm]);

  const handleViewDetails = async (student) => {
    setSelectedStudent(student);
    setViewModalVisible(true);
    setRoommatesLoading(true);
    
    try {
      const activeAllotment = student.tbl_RoomAllotments?.find(a => a.is_active);
      const roomId = activeAllotment?.HostelRoom?.id || activeAllotment?.tbl_HostelRoom?.id;
      
      if (roomId) {
        const response = await wardenAPI.getRoomOccupants(roomId);
        setRoommates(response.data.data?.filter(m => m.id !== student.id) || []);
      } else {
        setRoommates([]);
      }
    } catch (e) {
      setRoommates([]);
    } finally {
      setRoommatesLoading(false);
    }
  };

  const columns = [
    {
      title: 'Student Name',
      key: 'identity',
      render: (_, r) => (
        <Space gap={3}>
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <User size={20} />
          </div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700">{r.username}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Roll: {r.roll_number || 'Not Set'}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Room Status',
      key: 'room',
      render: (_, r) => {
        const allotment = r.tbl_RoomAllotments?.find(a => a.is_active);
        const room = allotment?.HostelRoom || allotment?.tbl_HostelRoom;
        return room ? (
          <Tag color="green" bordered={false} className="rounded-full px-3 font-bold text-[10px] uppercase">
            Room {room.room_number}
          </Tag>
        ) : (
          <Tag color="orange" bordered={false} className="rounded-full px-3 font-bold text-[10px] uppercase">
            Unassigned
          </Tag>
        );
      }
    },
    {
      title: 'Batch',
      dataIndex: 'session',
      render: (s) => <Text className="text-slate-500 font-medium">{s || 'N/A'}</Text>
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, r) => (
        <Button 
          icon={<Eye size={14}/>} 
          className="rounded-lg border-none shadow-sm bg-slate-50 hover:bg-blue-50 transition-colors"
          onClick={() => handleViewDetails(r)}
        >
          View Profile
        </Button>
      )
    }
  ];

  if (loading) return <DirectorySkeleton />;

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Student Register</Title>
              <Text type="secondary">List of all students currently registered in the hostel</Text>
            </div>
          </div>
          <div className="bg-white p-3 px-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
             <Badge status="processing" color="#2563eb" />
             <Text strong className="text-[11px] uppercase tracking-wider text-slate-500">
               {filteredStudents.length} Students Total
             </Text>
          </div>
        </div>

        {/* Search Toolbar */}
        <Card className="border-none shadow-sm rounded-2xl">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-blue-300 transition-all">
              <Search size={18} className="text-slate-300" />
              <Input 
                placeholder="Search by Name or Roll Number..." 
                bordered={false} 
                className="w-full font-medium"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              icon={<RefreshCw size={16}/>} 
              onClick={fetchStudents} 
              className="rounded-xl h-12 w-12 flex items-center justify-center border-slate-200" 
            />
          </div>
        </Card>

        {/* Student Table */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
          {filteredStudents.length > 0 ? (
            <Table 
              dataSource={filteredStudents} 
              columns={columns} 
              rowKey="id" 
              pagination={{
                current: currentPage,
                pageSize: 10,
                onChange: p => setCurrentPage(p),
                position: ['bottomCenter'],
                showSizeChanger: false,
                itemRender: (page, type, originalElement) => {
                  if (type === 'prev') return <Button type="text" icon={<ChevronLeft size={14}/>} />;
                  if (type === 'next') return <Button type="text" icon={<ChevronRight size={14}/>} />;
                  return originalElement;
                }
              }}
            />
          ) : (
            <div className="py-32">
              <Empty 
                image={<div className="bg-slate-50 p-8 rounded-full inline-block mb-4"><Inbox size={64} className="text-slate-200" /></div>}
                description={<Text className="text-slate-400 block">No students found matching your search</Text>}
              />
            </div>
          )}
        </Card>

        {/* Student Profile Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><UserCircle size={20}/> Student Profile</div>}
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={
            <Button 
              type="primary" 
              onClick={() => setViewModalVisible(false)} 
              className="rounded-xl h-11 px-8"
            >
              Close Profile
            </Button>
          }
          width={700}
          className="rounded-[32px]"
        >
          {selectedStudent && (
            <div className="mt-6 space-y-6">
              <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                    <User size={40} className="text-white" />
                  </div>
                  <div>
                    <Title level={3} style={{ color: 'white', margin: 0 }}>{selectedStudent.username}</Title>
                    <Text style={{ color: 'rgba(255,255,255,0.7)' }} className="uppercase font-bold text-xs tracking-widest">
                      {selectedStudent.roll_number || 'NO ROLL NUMBER'}
                    </Text>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
              </div>

              <Descriptions bordered column={2} className="rounded-2xl overflow-hidden shadow-sm border-slate-100">
                <Descriptions.Item label={<Space><Hash size={14}/> Student ID</Space>}>
                  {selectedStudent.id}
                </Descriptions.Item>
                <Descriptions.Item label={<Space><BookOpen size={14}/> Batch</Space>}>
                  {selectedStudent.session || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label={<Space><MapPin size={14}/> Room Assignment</Space>} span={2}>
                  {(() => {
                    const room = selectedStudent.tbl_RoomAllotments?.find(a => a.is_active)?.HostelRoom;
                    return room 
                      ? `Room ${room.room_number} (${room.tbl_RoomType?.name || 'Standard'})` 
                      : 'Not Assigned to a Room';
                  })()}
                </Descriptions.Item>
              </Descriptions>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <Text strong className="text-[10px] uppercase text-slate-400 block mb-4 tracking-widest">
                  Current Roommates
                </Text>
                {roommatesLoading ? (
                  <Skeleton active paragraph={{ rows: 2 }} />
                ) : roommates.length > 0 ? (
                  <div className="space-y-3">
                    {roommates.map(mate => (
                      <div 
                        key={mate.id} 
                        className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100"
                      >
                        <Space>
                          <User size={14} className="text-blue-500"/>
                          <Text strong className="text-slate-600">{mate.username}</Text>
                        </Space>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase">
                          {mate.roll_number}
                        </Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text className="text-slate-400 italic text-sm">
                    No other roommates assigned to this room.
                  </Text>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ManageStudents;
