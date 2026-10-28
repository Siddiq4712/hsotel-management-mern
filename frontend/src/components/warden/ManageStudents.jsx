import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Table, Input, Button, Tag, Space, Typography, 
  Modal, Descriptions, Badge, Empty, Skeleton, ConfigProvider, theme, Alert, Checkbox, message
} from 'antd';
import { 
  Users, User, Bed, Search, RefreshCw, Eye, 
  ChevronLeft, ChevronRight, Mail, Hash, BookOpen, 
  ShieldCheck, UserCircle, MapPin, Inbox, Server
} from 'lucide-react';
import axios from 'axios';
import { wardenAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { studentBatch } from '../../utils/batchMatching';
import { normalizeStudentDob, readStudentDob } from '../../../../shared/studentDob.js';
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
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [roommatesLoading, setRoommatesLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Academics API Testing State
  const [academicsModalVisible, setAcademicsModalVisible] = useState(false);
  const [academicsStudents, setAcademicsStudents] = useState([]);
  const [academicsLoading, setAcademicsLoading] = useState(false);
  const [academicsToken, setAcademicsToken] = useState(localStorage.getItem('token') || '');
  const [academicsError, setAcademicsError] = useState('');
  const [academicsBatches, setAcademicsBatches] = useState([]);
  const [academicsFetchedAt, setAcademicsFetchedAt] = useState(null);
  const [academicsSelected, setAcademicsSelected] = useState([]);
  const [academicsImporting, setAcademicsImporting] = useState(false);
  const [academicsImportResult, setAcademicsImportResult] = useState(null);
  const [academicsSearch, setAcademicsSearch] = useState('');
  const [academicsPage, setAcademicsPage] = useState(1);
  const [academicsPageSize, setAcademicsPageSize] = useState(5);
  const [academicsRequiresBed, setAcademicsRequiresBed] = useState(false);

  const fetchStudents = useCallback(async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    try {
      const response = await wardenAPI.getStudents();
      const roster = response.data.data || [];
      setStudents(roster);
      return roster;
    } catch (error) {
      console.error('Directory Sync Error:', error);
    } finally {
      if (!background) setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const fetchAcademicsStudents = async () => {
    const token = academicsToken.trim().replace(/^Bearer\s+/i, '');
    if (!token) { setAcademicsError('Enter your Academics authorization token first.'); return; }
    setAcademicsLoading(true);
    setAcademicsError('');
    setAcademicsStudents([]);
    setAcademicsSelected([]);
    setAcademicsFetchedAt(null);
    setAcademicsImportResult(null);
    setAcademicsPage(1);
    setAcademicsSearch('');
    try {
      const endpoint = import.meta.env.DEV
        ? '/erp-api/institute_management_system/students'
        : 'https://erp.nec.edu.in/institute_management_system/students';

      const [response, batches] = await Promise.all([axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 20000
      }), wardenAPI.getSessions()]);
      if (response.data?.success === false) throw new Error(response.data.message || 'Academics could not return students.');
      const data = Array.isArray(response.data) ? response.data : response.data?.data;
      if (!Array.isArray(data)) throw new Error('Academics returned an unexpected response. Expected a list of students.');
      setAcademicsBatches(batches.data.data || []);
      
      // Filter only hosteller students (checking student_type or studentType case-insensitively)
      const hostellers = data.filter(student => {
        const type = student.student_type || student.studentType || '';
        return String(type).trim().toLowerCase() === 'hosteller';
      });
      
      setAcademicsStudents(hostellers.map((student, index) => ({
        ...student,
        importKey: String(student.registerNumber || student.roll_number || `missing-roll-${index}`).trim(),
        registerNumber: String(student.registerNumber || student.roll_number || '').trim(),
        username: String(student.studentName || student.username || student.userName || student.name || '').trim(),
        email: String(student.email || student.userMail || student.personal_email || '').trim(),
        gender: student.gender || student.Gender || student.sex || student.student_gender,
        date_of_birth: readStudentDob(student),
        erp_batch_year: student.batch ?? student.erp_batch_year ?? null
      })));
      setAcademicsFetchedAt(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Calcutta' }));
    } catch (error) {
      setAcademicsError(error.code === 'ECONNABORTED' ? 'The Academics request timed out after 20 seconds. Try again.' : error.response?.data?.message || error.message || 'Failed to fetch students.');
    } finally {
      setAcademicsLoading(false);
    }
  };

  const academicsCandidates = useMemo(() => {
    const localByRoll = new Map(students.map(student => [String(student.roll_number || student.registerNumber || '').trim(), student]));
    const scoped = academicsStudents.filter(student => {
      if (user?.role === 'admin') return true;
      const batch = studentBatch(student.erp_batch_year, academicsBatches, student.gender, student.college);
      // The backend returns batches for the warden's current DB assignment.
      return Boolean(batch);
    });
    return scoped.map(student => {
      const batch = studentBatch(student.erp_batch_year, academicsBatches, student.gender, student.college);
      const existing = localByRoll.get(student.registerNumber);
      let blocked = '';
      if (String(student.college ?? 'nec').trim().toLowerCase() === 'lapc') blocked = 'LAPC students must be imported through Excel';
      else if (String(existing?.college ?? 'nec').trim().toLowerCase() === 'lapc') blocked = 'Existing LAPC enrollment must be maintained through Excel';
      else if (!student.registerNumber || !student.username) blocked = 'Name or roll number missing';
      else if (!batch) blocked = 'Missing or unconfigured batch year and gender';
      else if (existing && Number(existing.erp_batch_year) === Number(student.erp_batch_year) && Number(existing.hostel_id) === Number(batch.hostel_id) && Number(existing.session_id ?? existing.tbl_Enrollment?.[0]?.session_id) === Number(batch.id)) blocked = 'Already enrolled';
      if (!blocked && !existing) {
        try { normalizeStudentDob(student.date_of_birth); }
        catch { blocked = 'Missing or invalid Date of Birth'; }
      }
      return { ...student, matchedBatch: batch, existing, blocked };
    });
  }, [academicsStudents, academicsBatches, students, user]);
  const filteredAcademics = academicsCandidates.filter(student => `${student.username} ${student.registerNumber} ${student.erp_batch_year ?? ''}`.toLowerCase().includes(academicsSearch.trim().toLowerCase()));
  const academicsEligibleKeys = filteredAcademics.filter(student => !student.blocked).map(student => student.importKey);
  const importAcademicsStudents = async () => {
    const selected = academicsCandidates.filter(student => academicsSelected.includes(student.importKey) && !student.blocked);
    if (!selected.length) return message.warning('Select students with a configured batch and hostel.');
    setAcademicsImporting(true); setAcademicsError(''); setAcademicsImportResult(null);
    try {
      const response = await wardenAPI.bulkEnrollStudents({ import_source: 'api', students: selected.map(student => ({
        userName: student.username,
        roll_number: student.registerNumber,
        date_of_birth: student.date_of_birth,
        email: student.email || undefined,
        erp_batch_year: Number(student.erp_batch_year),
        gender: student.gender,
        college: String(student.college || student.existing?.college || 'nec').toLowerCase() === 'lapc' ? 'lapc' : 'nec',
        requires_bed: student.existing
          ? Boolean(student.existing.requires_bed ?? student.existing.tbl_Enrollment?.[0]?.requires_bed)
          : academicsRequiresBed
      })) });
      if (response.data?.success === false) throw new Error(response.data.message || 'Import failed.');
      setAcademicsImportResult(response.data.data || { successful: 0, skipped: 0, errors: [] });
      setAcademicsSelected([]);
      await fetchStudents({ background: true });
    } catch (error) { setAcademicsError(error.response?.data?.message || error.message || 'Unable to import students.'); }
    finally { setAcademicsImporting(false); }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const name = (s.userName || s.username || '').toLowerCase();
      const roll = (s.roll_number || s.registerNumber || '').toLowerCase();
      const course = (s.course || s.session || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || roll.includes(query) || course.includes(query);
    });
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
        setRoommates(response.data.data?.filter(m => m.id !== (student.userId || student.id)) || []);
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
      render: (_, r) => {
        const displayName = r.userName || r.username || 'Unnamed';
        const displayRoll = r.roll_number || r.registerNumber || 'Not Set';
        return (
          <Space gap={3}>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <User size={20} />
            </div>
            <Space direction="vertical" size={0}>
              <Text strong className="text-slate-700 uppercase">{displayName}</Text>
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Roll: {displayRoll}
              </Text>
            </Space>
          </Space>
        );
      }
    },
    {
      title: 'Room Status',
      key: 'room',
      render: (_, r) => {
        const allotment = r.tbl_RoomAllotments?.find(a => a.is_active);
        const room = allotment?.HostelRoom || allotment?.tbl_HostelRoom;
        const roomNumber = room?.room_number || r.room_number;
        return roomNumber ? (
          <Tag color="green" bordered={false} className="rounded-full px-3 font-bold text-[10px] uppercase">
            Room {roomNumber}
          </Tag>
        ) : (
          <Tag color="orange" bordered={false} className="rounded-full px-3 font-bold text-[10px] uppercase">
            Unassigned
          </Tag>
        );
      }
    },
    {
      title: 'Gender',
      key: 'gender',
      render: (_, r) => {
        const gender = (r.gender || r.Gender || r.sex || '').toUpperCase();
        const isMale = gender === 'MALE' || gender === 'M';
        const isFemale = gender === 'FEMALE' || gender === 'F';
        return (
          <Tag color={isMale ? 'blue' : isFemale ? 'magenta' : 'default'} className="rounded-full px-2.5 font-bold text-[10px]">
            {gender || 'N/A'}
          </Tag>
        );
      }
    },
    {
      title: 'Course / Batch',
      key: 'course',
      render: (_, r) => <Text className="text-slate-500 font-medium">{r.course || r.session || 'N/A'}</Text>
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
      <div className="module-page p-8 bg-slate-50 min-h-screen space-y-6">
        
        {/* Header */}
        <div className="module-page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
                variant="borderless" 
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
            <Button 
              type="primary"
              icon={<Server size={16}/>} 
              onClick={() => setAcademicsModalVisible(true)} 
              className="rounded-xl h-12 flex items-center justify-center border-slate-200 bg-emerald-600 hover:bg-emerald-700 border-none shadow-md" 
            >
              Fetch from Academics
            </Button>
          </div>
        </Card>

        {/* Student Table */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" styles={{ body: { padding: 0 } }}>
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
                    <Title level={3} style={{ color: 'white', margin: 0 }}>{selectedStudent.userName}</Title>
                    <Text style={{ color: 'rgba(255,255,255,0.7)' }} className="uppercase font-bold text-xs tracking-widest">
                      {selectedStudent.roll_number || 'NO ROLL NUMBER'}
                    </Text>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
              </div>

              <Descriptions bordered column={2} className="rounded-2xl overflow-hidden shadow-sm border-slate-100">
                <Descriptions.Item label={<Space><Hash size={14}/> Roll / Reg No</Space>}>
                  {selectedStudent.registerNumber || selectedStudent.roll_number || selectedStudent.userId}
                </Descriptions.Item>
                <Descriptions.Item label={<Space><BookOpen size={14}/> Course / Batch</Space>}>
                  {selectedStudent.course || selectedStudent.session || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label={<Space><Mail size={14}/> Email Address</Space>}>
                  {selectedStudent.email || selectedStudent.userMail || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label={<Space><User size={14}/> Student Type</Space>}>
                  <Tag color="green" className="font-bold uppercase">
                    {selectedStudent.student_type || selectedStudent.studentType || 'Hosteller'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<Space><MapPin size={14}/> Room Assignment</Space>} span={2}>
                  {(() => {
                    const room = selectedStudent.tbl_RoomAllotments?.find(a => a.is_active)?.HostelRoom;
                    const roomNumber = room?.room_number || selectedStudent.room_number;
                    return roomNumber 
                      ? `Room ${roomNumber} (${room?.tbl_RoomType?.name || 'Standard'})` 
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
                          <Text strong className="text-slate-600">{mate.userName}</Text>
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

        {/* Academics API Connection Testing Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-emerald-600"><Server size={20}/> Fetch and Import Students</div>}
          open={academicsModalVisible}
          onCancel={() => { if (!academicsLoading && !academicsImporting) setAcademicsModalVisible(false); }}
          footer={[
            <Button key="close" disabled={academicsLoading || academicsImporting} onClick={() => setAcademicsModalVisible(false)} className="rounded-xl">
              Close
            </Button>,
            <Button 
              key="fetch" 
              type="primary" 
              loading={academicsLoading} 
              disabled={academicsImporting}
              onClick={fetchAcademicsStudents} 
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
            >
              Fetch Students
            </Button>,
            <Button key="import" type="primary" loading={academicsImporting} disabled={academicsLoading || !academicsSelected.length} onClick={() => Modal.confirm({
              title: `Import ${academicsSelected.length} selected students?`,
              content: 'Students will be saved to the hostel assigned to their ERP batch year and gender. Existing login passwords are preserved.',
              okText: 'Import Students', onOk: importAcademicsStudents
            })}>Import Selected Students ({academicsSelected.length})</Button>
          ]}
          width={1100}
          closable={!academicsLoading && !academicsImporting}
          mask={{ closable: !academicsLoading && !academicsImporting }}
        >
          <div className="space-y-4 my-4">
            <Text type="secondary">
              Fetch students to preview their batch and hostel, then select and import them into this system.
            </Text>
            
            <div>
              <Text strong className="block mb-2">Authorization Token (JWT Bearer Token):</Text>
              <Input.Password
                aria-label="Academics authorization token"
                disabled={academicsLoading || academicsImporting}
                value={academicsToken}
                onChange={e => setAcademicsToken(e.target.value)}
                placeholder="Paste Warden / SuperAdmin JWT Token..."
                className="rounded-xl font-mono text-xs"
              />
            </div>

            {academicsError && (
              <Alert 
                title="Student fetch or import needs attention"
                description={academicsError} 
                type="error" 
                showIcon 
                closable
              />
            )}

            {academicsLoading && <Alert type="info" showIcon title="Fetching students from Academics…" description="The request may take up to 20 seconds." />}
            {academicsFetchedAt && !academicsLoading && <Alert type={academicsStudents.length ? 'success' : 'warning'} showIcon title={`Fetched ${academicsCandidates.length} matching hosteller students at ${academicsFetchedAt}. Select students and click Import Selected Students to save them.`} />}
            {academicsImportResult && <Alert showIcon type={academicsImportResult.errors?.length ? 'warning' : 'success'} title={`Imported ${academicsImportResult.successful || 0} students; ${academicsImportResult.skipped || 0} skipped; ${academicsImportResult.errors?.length || 0} failed.`} description={academicsImportResult.errors?.map((failure, index) => <div key={index}>{failure.name}: {failure.error}</div>)} />}

            {academicsStudents.length > 0 && (
              <div className="space-y-4">
                <Space wrap>
                  <Input aria-label="Search Academics students" allowClear placeholder="Search name, roll number or batch year" value={academicsSearch} disabled={academicsImporting} onChange={event => { setAcademicsSearch(event.target.value); setAcademicsPage(1); setAcademicsSelected([]); }} />
                  <Button disabled={academicsLoading || academicsImporting || !academicsEligibleKeys.length} onClick={() => setAcademicsSelected(academicsEligibleKeys)}>Select all matching eligible students ({academicsEligibleKeys.length})</Button>
                  <Button disabled={academicsImporting || !academicsSelected.length} onClick={() => setAcademicsSelected([])}>Clear selection</Button>
                  <Checkbox checked={academicsRequiresBed} disabled={academicsImporting} onChange={event => setAcademicsRequiresBed(event.target.checked)}>New students require a bed</Checkbox>
                </Space>
                
                <Table
                  dataSource={filteredAcademics}
                  rowKey="importKey"
                  loading={academicsLoading || academicsImporting}
                  scroll={{ x: 1250 }}
                  pagination={{ current: academicsPage, pageSize: academicsPageSize, showSizeChanger: true, pageSizeOptions: [5, 10, 20, 50, 100], onChange: (page, size) => { setAcademicsPage(size === academicsPageSize ? page : 1); setAcademicsPageSize(size); }, showTotal: total => `${total} students` }}
                  rowSelection={{ selectedRowKeys: academicsSelected, onChange: setAcademicsSelected, preserveSelectedRowKeys: true,
                    columnTitle: <Checkbox aria-label="Select all eligible Academics students" checked={academicsEligibleKeys.length > 0 && academicsEligibleKeys.every(key => academicsSelected.includes(key))} indeterminate={academicsSelected.length > 0 && !academicsEligibleKeys.every(key => academicsSelected.includes(key))} disabled={academicsLoading || academicsImporting || !academicsEligibleKeys.length} onChange={event => setAcademicsSelected(event.target.checked ? academicsEligibleKeys : [])} />,
                    getCheckboxProps: student => ({ disabled: academicsLoading || academicsImporting || Boolean(student.blocked) }) }}
                  columns={[
                    { title: 'ERP Batch Year', dataIndex: 'erp_batch_year', width: 120 },
                    { title: 'Batch', key: 'batch', width: 140, render: (_, student) => student.matchedBatch?.name || 'Unconfigured' },
                    { title: 'Assigned Hostel', key: 'hostel', width: 170, render: (_, student) => student.matchedBatch?.hostel_name || 'Unassigned' },
                    { title: 'Import Status', key: 'importStatus', width: 210, render: (_, student) => <Tag color={student.blocked ? 'orange' : 'green'}>{student.blocked || (student.existing ? 'Update enrollment' : 'Ready to import')}</Tag> },
                    {
                      title: 'Register No',
                      dataIndex: 'registerNumber',
                      key: 'registerNumber',
                    },
                    {
                      title: 'Name',
                      dataIndex: 'username',
                      key: 'username',
                    },
                    {
                      title: 'Email',
                      dataIndex: 'email',
                      key: 'email',
                    },
                    {
                      title: 'Gender',
                      dataIndex: 'gender',
                      key: 'gender',
                      render: (_, record) => {
                        const g = record.gender || record.Gender || record.sex || record.student_gender || 'N/A';
                        const isMale = String(g).toUpperCase().startsWith('M');
                        const isFemale = String(g).toUpperCase().startsWith('F');
                        return (
                          <Tag color={isMale ? 'blue' : isFemale ? 'magenta' : 'default'} className="font-bold">
                            {g}
                          </Tag>
                        );
                      }
                    },
                    {
                      title: 'Course',
                      dataIndex: 'course',
                      key: 'course',
                    },
                    {
                      title: 'Type (Raw Data Check)',
                      key: 'rawType',
                      render: (_, record) => {
                        const rawType = record.student_type || record.studentType || 'Not sent by API';
                        return (
                          <Tag color={rawType === 'Hosteller' ? 'green' : 'orange'}>
                            {rawType}
                          </Tag>
                        );
                      }
                    }
                  ]}
                />

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-60 overflow-y-auto">
                  <Text strong className="block mb-2 text-xs text-slate-500 uppercase tracking-wider">Raw First Student Record JSON (To verify properties):</Text>
                  <pre className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    {JSON.stringify(academicsStudents[0], null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ManageStudents;
