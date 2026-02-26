import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Table, Tag, Button, Input, Select, DatePicker, 
  Typography, Row, Col, Statistic, Space, Skeleton, 
  Modal, Badge, Divider, Empty, message, ConfigProvider, theme 
} from 'antd';
import { 
  Users, CheckCircle2, XCircle, Clock, Calendar, 
  Search, RefreshCw, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  ClipboardList, Save, Plus, Inbox
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';
import axios from "axios";

const { Title, Text } = Typography;
const token = localStorage.getItem("token");

// --- 1. Specialized Skeletons for Exact Field Sizes ---

const AttendanceStatsSkeleton = () => (
  <Row gutter={[16, 16]} className="mb-8">
    {[...Array(4)].map((_, i) => (
      <Col xs={24} sm={12} lg={6} key={i}>
        <Card className="border-none shadow-sm rounded-2xl">
          <Skeleton loading active avatar paragraph={{ rows: 1 }} />
        </Card>
      </Col>
    ))}
  </Row>
);

const AttendanceTableSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] overflow-hidden">
    <div className="p-6 border-b border-slate-50 flex justify-between items-center">
      <Skeleton.Input active style={{ width: 250 }} />
      <div className="flex gap-2">
        <Skeleton.Button active style={{ width: 100 }} />
        <Skeleton.Button active style={{ width: 100 }} />
      </div>
    </div>
    <div className="p-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0">
          <Skeleton.Avatar active shape="circle" size="large" />
          <div className="flex-1"><Skeleton active title={false} paragraph={{ rows: 1, width: '100%' }} /></div>
          <Skeleton.Input active style={{ width: 100 }} />
          <Skeleton.Button active style={{ width: 60 }} />
        </div>
      ))}
    </div>
  </Card>
);

const AttendanceManagement = () => {
  // --- States ---
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [tempAttendance, setTempAttendance] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('All');

  // Fetch Logic
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        wardenAPI.getStudents(),
        wardenAPI.getAttendance({ date: selectedDate })
      ]);
      setStudents(stuRes.data.data || []);
      setAttendance(attRes.data.data || []);
    } catch (error) {
      message.error('Failed to load student records.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Logic ---
  const getAttendanceForStudent = (studentId) => attendance.find(att => att.Student?.id === studentId);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesCollege = selectedCollege === 'All' || s.college === selectedCollege;
      const matchesSearch = s.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (s.roll_number && s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCollege && matchesSearch;
    });
  }, [students, searchTerm, selectedCollege]);

  const handleStatusChange = (studentId, status) => {
    setTempAttendance(prev => ({
      ...prev,
      [studentId]: { status }
    }));
  };

  const handleSaveAll = async () => {
    setMarkingAttendance(true);
    try {
      const changes = Object.entries(tempAttendance);
      if (changes.length === 0) return;

      const promises = changes.map(([studentId, data]) => 
        axios.post('http://localhost:5001/api/warden/attendance', {
          student_id: parseInt(studentId),
          date: selectedDate,
          status: data.status
        }, { headers: { Authorization: `Bearer ${token}` } })
      );

      await Promise.all(promises);
      message.success(`Attendance updated for ${changes.length} student(s)`);
      setTempAttendance({});
      fetchData();
    } catch (e) {
      message.error('Failed to save attendance.');
    } finally {
      setMarkingAttendance(false);
    }
  };

  const statusConfig = {
    P: { color: 'success', label: 'Present', icon: <CheckCircle2 size={12} /> },
    A: { color: 'error', label: 'Absent', icon: <XCircle size={12} /> },
    OD: { color: 'processing', label: 'College OD', icon: <Clock size={12} /> }
  };

  const columns = [
    {
      title: 'Student Details',
      key: 'identity',
      render: (_, r) => (
        <Space gap={3}>
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Users size={18} /></div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700">{r.userName}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Roll: {r.roll_number || 'UNSET'} • {r.college}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Attendance Status',
      key: 'status',
      render: (_, r) => {
        const studentAtt = getAttendanceForStudent(r.id);
        const temp = tempAttendance[r.id];
        const status = temp?.status || studentAtt?.status;

        return status ? (
          <Tag icon={statusConfig[status].icon} color={statusConfig[status].color} className="rounded-full border-none px-3 font-bold uppercase text-[9px]">
            {statusConfig[status].label}
          </Tag>
        ) : <Text type="secondary" className="text-xs italic">Not Marked Yet</Text>;
      }
    },
    {
      title: 'Mark Attendance',
      key: 'actions',
      align: 'right',
      render: (_, r) => {
        const studentAtt = getAttendanceForStudent(r.id);
        if (studentAtt) return <Button type="text" size="small" className="text-blue-600 font-bold text-[10px]">MARKED</Button>;

        const current = tempAttendance[r.id]?.status;
        return (
          <div className="flex gap-2 justify-end">
            <Button 
              shape="circle" 
              size="small" 
              className={current === 'P' ? 'bg-emerald-500 text-white border-none' : 'text-emerald-500 border-emerald-100'} 
              onClick={() => handleStatusChange(r.id, 'P')}
            >P</Button>
            <Button 
              shape="circle" 
              size="small" 
              className={current === 'A' ? 'bg-rose-500 text-white border-none' : 'text-rose-500 border-rose-100'} 
              onClick={() => handleStatusChange(r.id, 'A')}
            >A</Button>
          </div>
        );
      }
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Daily Attendance</Title>
              <Text type="secondary">Manage daily student presence and college OD records</Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <DatePicker 
               defaultValue={moment()} 
               onChange={(date) => setSelectedDate(date ? date.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'))}
               className="h-11 rounded-xl w-48 shadow-sm"
             />
             <Button icon={<RefreshCw size={16}/>} onClick={fetchData} className="rounded-xl h-11" />
          </div>
        </div>

        {loading ? (
          <>
            <AttendanceStatsSkeleton />
            <AttendanceTableSkeleton />
          </>
        ) : (
          <>
            {/* Statistics Row */}
            <Row gutter={[24, 24]} className="mb-8">
              {[
                { label: 'Total Students', val: students.length, icon: Users, color: 'text-blue-500' },
                { label: 'Present Today', val: attendance.filter(a => a.status === 'P').length, icon: CheckCircle2, color: 'text-emerald-500' },
                { label: 'Absentees', val: attendance.filter(a => a.status === 'A').length, icon: XCircle, color: 'text-rose-500' },
                { label: 'On Duty (OD)', val: attendance.filter(a => a.status === 'OD').length, icon: Clock, color: 'text-amber-500' },
              ].map((stat, i) => (
                <Col xs={24} sm={12} lg={6} key={i}>
                  <Card className="border-none shadow-sm rounded-2xl">
                    <Statistic title={<span className="text-[10px] uppercase font-bold text-slate-400">{stat.label}</span>} value={stat.val} prefix={<stat.icon size={18} className={`${stat.color} mr-2`} />} valueStyle={{ fontWeight: 800 }} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Filter Hub */}
            <Card className="border-none shadow-sm rounded-2xl mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-blue-300 transition-all">
                  <Search size={18} className="text-slate-300" />
                  <Input placeholder="Search Roll or Name..." bordered={false} className="w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={selectedCollege} onChange={setSelectedCollege} className="w-48 h-11" options={['All', ...new Set(students.map(s => s.college))].map(c => ({ label: c, value: c }))} />
                <div className="ml-auto">
                   {Object.keys(tempAttendance).length > 0 && (
                     <Button 
                       type="primary" 
                       size="large" 
                       className="rounded-xl h-11 font-bold shadow-lg shadow-blue-100" 
                       icon={<Save size={16}/>} 
                       onClick={handleSaveAll} 
                       loading={markingAttendance}
                     >
                       Save {Object.keys(tempAttendance).length} Entries 
                     </Button>
                   )}
                </div>
              </div>
            </Card>

            {/* Attendance Table */}
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              {filteredStudents.length > 0 ? (
                <Table 
                  dataSource={filteredStudents} 
                  columns={columns} 
                  rowKey="id" 
                  pagination={{ pageSize: 12, position: ['bottomCenter'] }} 
                />
              ) : (
                <div className="py-24">
                  <Empty 
                    image={<div className="bg-slate-50 p-8 rounded-full inline-block mb-4"><Inbox size={64} className="text-slate-200" /></div>} 
                    description="No students found matching the search." 
                  />
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </ConfigProvider>
  );
};

export default AttendanceManagement;
