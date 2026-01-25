import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Table, Tag, Button, Input, Select, Typography, 
  Row, Col, Statistic, Space, Skeleton, Modal, Badge, 
  Progress, Divider, Empty, message, ConfigProvider, theme 
} from 'antd';
import { 
  Bed, User, CheckCircle2, AlertCircle, Users, Home, Eye, 
  Search, RefreshCw, Building, Users2, MapPin, Inbox,
  ShieldCheck, ArrowRight, UserPlus
} from 'lucide-react';
import { wardenAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

// --- Specialized Skeletons for Precise UI Matching ---

const SidebarSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 1 }} />
    <div className="space-y-4 mt-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-slate-50 bg-slate-50/30">
          <Skeleton active avatar={{ shape: 'square' }} title={{ width: '40%' }} paragraph={{ rows: 1 }} />
        </div>
      ))}
    </div>
  </Card>
);

const FormSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-8 bg-white overflow-hidden">
    <div className="flex items-center gap-4 mb-8">
      <Skeleton.Avatar active size="large" shape="square" />
      <Skeleton active title={{ width: '40%' }} paragraph={false} />
    </div>
    <div className="space-y-8">
      <Skeleton.Input active block style={{ height: 50, borderRadius: 12 }} />
      <Skeleton active paragraph={{ rows: 4 }} />
      <Skeleton.Button active block style={{ height: 60, borderRadius: 16 }} />
    </div>
  </Card>
);

const RoomAllotment = () => {
  const [students, setStudents] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // --- Data Synchronization ---
  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [studentRes, roomRes] = await Promise.all([
        wardenAPI.getStudents(),
        wardenAPI.getAvailableRooms()
      ]);

      // Filter unassigned students
      const unassigned = studentRes.data.data.filter(s => 
        !s.tbl_RoomAllotments?.some(a => a.is_active)
      );
      setStudents(unassigned);

      // Map rooms with occupancy data
      const roomData = await Promise.all(
        roomRes.data.data.map(async (room) => {
          const occRes = await wardenAPI.getRoomOccupants(room.id);
          const occupants = occRes.data.data || [];
          return {
            ...room,
            current_occupants: occupants.length,
            spacesLeft: (room.RoomType?.capacity || 0) - occupants.length,
            occupants
          };
        })
      );
      setAvailableRooms(roomData);
    } catch (error) {
      message.error('Failed to load hostel data.');
    } finally {
      setTimeout(() => setDataLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Computed States ---
  const selectedRoom = useMemo(() => 
    availableRooms.find(r => r.id === selectedRoomId), [availableRooms, selectedRoomId]);

  const filteredStudents = useMemo(() => students.filter(s =>
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.roll_number && s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [students, searchTerm]);

  // --- Handlers ---
  const handleToggleStudent = (id) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (selectedRoom && prev.length >= selectedRoom.spacesLeft) {
        message.warning(`Room is full (${selectedRoom.spacesLeft} spaces left)`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const confirmAllotment = async () => {
    setLoading(true);
    try {
      await Promise.all(selectedStudentIds.map(sid => 
        wardenAPI.allotRoom({ student_id: sid, room_id: selectedRoomId })
      ));
      message.success(`${selectedStudentIds.length} students successfully assigned to the room.`);
      setSelectedRoomId(null);
      setSelectedStudentIds([]);
      setConfirmModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Failed to save the allotment.');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
        <Row gutter={24}>
          <Col lg={16} xs={24}><FormSkeleton /></Col>
          <Col lg={8} xs={24}><SidebarSkeleton /></Col>
        </Row>
      </div>
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Institutional Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Building className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Room Allotment Board</Title>
              <Text type="secondary">Assign students to available hostel rooms</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchData} className="rounded-xl h-11 px-6 font-bold shadow-sm">Refresh List</Button>
        </div>

        <Row gutter={[24, 24]}>
          {/* Main Action Area */}
          <Col lg={16} xs={24} className="space-y-6">
            <Card className="border-none shadow-sm rounded-[32px] p-4">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-slate-100 rounded-xl"><UserPlus className="text-slate-600" size={20}/></div>
                <Title level={4} style={{ margin: 0 }}>Step 1: Room Selection</Title>
              </div>

              <div className="space-y-8">
                {/* Room Selector Dropdown */}
                <div className="space-y-2">
                  <Text strong className="text-[11px] uppercase tracking-widest text-slate-400">Select Target Room</Text>
                  <Select
                    placeholder="Select room to begin assignment..."
                    className="w-full h-14"
                    onChange={(val) => { setSelectedRoomId(val); setSelectedStudentIds([]); }}
                    value={selectedRoomId}
                  >
                    {availableRooms.map(room => (
                      <Select.Option key={room.id} value={room.id} disabled={room.spacesLeft === 0}>
                        <div className="flex justify-between items-center py-1">
                          <Space><Home size={16} className="text-blue-500"/> <Text strong>Room {room.room_number}</Text></Space>
                          <Tag bordered={false} color={room.spacesLeft > 0 ? 'green' : 'default'} className="m-0 rounded-full font-bold uppercase text-[9px]">
                            {room.spacesLeft} Slots Available
                          </Tag>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {selectedRoom && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                    {/* Capacity Analytics */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <Row gutter={24} align="middle">
                        <Col span={14}>
                          <Text type="secondary" className="text-[10px] uppercase font-bold block mb-3">Room Capacity Status</Text>
                          <Progress 
                            percent={Math.round((selectedRoom.current_occupants / selectedRoom.RoomType.capacity) * 100)} 
                            strokeColor={{ '0%': '#3b82f6', '100%': '#2563eb' }}
                            strokeWidth={12}
                          />
                        </Col>
                        <Col span={10}>
                          <div className="flex justify-around text-center">
                            <Statistic title={<span className="text-[10px] uppercase font-bold text-slate-400">Occupied</span>} value={selectedRoom.current_occupants} valueStyle={{ fontWeight: 900 }} />
                            <Statistic title={<span className="text-[10px] uppercase font-bold text-slate-400">Total</span>} value={selectedRoom.RoomType.capacity} valueStyle={{ fontWeight: 900 }} />
                          </div>
                        </Col>
                      </Row>
                    </div>

                    {/* Student Multi-Select List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <Text strong className="text-[11px] uppercase tracking-widest text-slate-400">Step 2: Assign Student Members ({selectedStudentIds.length} Selected)</Text>
                         <Input 
                            prefix={<Search size={14} className="text-slate-300"/>} 
                            placeholder="Filter by name or roll..." 
                            className="w-64 rounded-xl border-slate-200" 
                            onChange={e => setSearchTerm(e.target.value)}
                         />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredStudents.map(student => {
                          const isSelected = selectedStudentIds.includes(student.id);
                          return (
                            <div 
                              key={student.id} 
                              onClick={() => handleToggleStudent(student.id)}
                              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                  <User size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Text strong className="block truncate">{student.username}</Text>
                                  <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.roll_number || 'No Roll Set'}</Text>
                                </div>
                                {isSelected && <CheckCircle2 size={20} className="text-blue-600" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button 
                      type="primary" 
                      block 
                      size="large" 
                      className="h-16 rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-3 mt-4"
                      disabled={selectedStudentIds.length === 0}
                      onClick={() => setConfirmModalVisible(true)}
                    >
                      Process Assignment <ArrowRight size={20}/>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </Col>

          {/* Institutional Sidebar */}
          <Col lg={8} xs={24} className="space-y-6">
            {/* Quick Status Sidebar */}
            <Card className="border-none shadow-sm rounded-[32px]" title={<Space><Users2 size={18} className="text-orange-500"/> <Text strong>Waiting List</Text></Space>}>
              <div className="flex flex-col gap-3">
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                   <Statistic title={<span className="text-orange-700 font-bold text-[10px] uppercase">Students Without Rooms</span>} value={students.length} valueStyle={{ color: '#c2410c', fontWeight: 900 }} />
                </div>
                <Divider className="my-2 border-slate-50" />
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {students.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Space size={3}><User size={12} className="text-slate-400"/><Text className="text-xs font-medium">{s.username}</Text></Space>
                      <Text className="text-[9px] font-bold text-slate-400">{s.roll_number}</Text>
                    </div>
                  ))}
                  <Text className="text-[10px] text-slate-400 text-center block mt-2">Only top 5 shown</Text>
                </div>
              </div>
            </Card>

            {/* Protocol Card */}
            <Card className="border-none shadow-sm rounded-[32px] bg-slate-900 text-white relative overflow-hidden">
               <div className="relative z-10">
                  <Title level={5} className="text-white mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-blue-400"/> Important Notes</Title>
                  <Paragraph className="text-slate-400 text-[11px] leading-relaxed">
                    Allotting a room updates the official hostel records. This action will:
                  </Paragraph>
                  <ul className="text-[10px] space-y-2 text-slate-300 pl-4 list-disc">
                    <li>Update the Student Register for 2024-25</li>
                    <li>Start monthly mess bill calculations</li>
                    <li>Mark student as a "Hosteller" in the system</li>
                  </ul>
               </div>
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500 rounded-full opacity-10" />
            </Card>
          </Col>
        </Row>

        {/* Audit Confirmation Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><Building size={20}/> Confirm Room Allotment</div>}
          open={confirmModalVisible}
          onCancel={() => setConfirmModalVisible(false)}
          footer={[
            <Button key="back" onClick={() => setConfirmModalVisible(false)} className="rounded-xl h-11 px-8">Cancel</Button>,
            <Button key="submit" type="primary" loading={loading} onClick={confirmAllotment} className="rounded-xl h-11 px-12 font-bold shadow-lg shadow-blue-100">Confirm & Save</Button>
          ]}
          width={600}
          className="rounded-[32px]"
        >
          <div className="mt-6 space-y-6">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex justify-between items-center">
               <div>
                 <Text type="secondary" className="text-[10px] uppercase font-bold tracking-widest">Selected Room</Text>
                 <Title level={3} style={{ margin: 0 }}>Room {selectedRoom?.room_number}</Title>
                 <Text type="secondary" className="text-xs">{selectedRoom?.RoomType?.name}</Text>
               </div>
               <Badge count={`${selectedStudentIds.length} Students`} style={{ backgroundColor: '#2563eb' }} className="h-fit font-bold" />
            </div>

            <Divider orientation="left" plain><Text className="text-[10px] uppercase font-bold text-slate-400">Selected Students</Text></Divider>

            <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto">
              {selectedStudentIds.map(id => {
                const s = students.find(item => item.id === id);
                return (
                  <div key={id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm"><User size={12} className="text-blue-500"/></div>
                    <Text strong className="text-xs truncate">{s?.username}</Text>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
              <AlertCircle className="text-orange-500 shrink-0 mt-1" size={18} />
              <Text className="text-[11px] text-orange-800 italic leading-tight">Note: This action updates official student records and will affect their room status immediately.</Text>
            </div>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default RoomAllotment;