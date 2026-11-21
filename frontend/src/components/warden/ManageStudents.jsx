import WorkspaceToolbar from '../common/WorkspaceToolbar';
import WorkspaceContextHeader from '../common/WorkspaceContextHeader';
import StudentProfileContent from './StudentProfileContent';
import { useWardenHostelName, wardenListPagination } from './WardenWorkspace';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Table, Input, Button, Tag, Space, Typography, 
  Modal, Badge, Empty, Skeleton, ConfigProvider, Checkbox, message
} from 'antd';
import Alert from '../common/WorkspaceAlert';
import { 
  Bed, Search, RefreshCw,
  ShieldCheck, UserCircle, Inbox, Server
} from 'lucide-react';
import axios from 'axios';
import { wardenAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { studentBatch } from '../../utils/batchMatching';
import { normalizeStudentDob, readStudentDob } from '../../../../shared/studentDob.js';
import moment from 'moment';

const { Text } = Typography;

// --- Specialized Skeleton for Student List ---
const DirectorySkeleton = () => (
  <Card className="border-none shadow-sm rounded-surface p-6 bg-white overflow-hidden">
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
  const hostelName = useWardenHostelName();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
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

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setViewModalVisible(true);
  };

  const columns = [
    {
      title: 'Student Name',
      key: 'identity',
      render: (_, r) => {
        const displayName = r.userName || r.username || 'Unnamed';
        const displayRoll = r.roll_number || r.registerNumber || 'Not Set';
        return (
          <div>
              <Text strong>{displayName}</Text>
              {r.resident_type === 'staff' && <Tag color="purple">Staff resident</Tag>}
              <span className="warden-record-meta">
                {r.resident_type === 'staff' ? 'Staff code' : 'Roll'}: {displayRoll}
              </span>
          </div>
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
      title: 'Actions',
      key: 'action',
      align: 'right',
      render: (_, r) => (
        <Button onClick={() => handleViewDetails(r)}>
          View Profile
        </Button>
      )
    }
  ];

  if (loading) return <DirectorySkeleton />;

  return (
    <ConfigProvider>
      <div className="module-page warden-page">
        <WorkspaceContextHeader title="Student Register" headingAs="h1"
          description={hostelName ? `Browse and manage residents in ${hostelName}.` : 'Browse and manage hostel residents.'}
          actions={<>
            <Button icon={<RefreshCw size={16} />} onClick={fetchStudents}>Refresh</Button>
            <Button type="primary" onClick={() => setAcademicsModalVisible(true)}>Fetch from Academics</Button>
          </>} />

        <section className="warden-panel warden-table-panel" aria-label="Student register">
          <WorkspaceToolbar className="warden-table-toolbar">
            <Input aria-label="Search students" className="workspace-search" prefix={<Search size={16} aria-hidden="true" />}
              placeholder="Search by name or roll number" value={searchTerm} onChange={event => { setSearchTerm(event.target.value); setCurrentPage(1); }} allowClear />
            <span className="warden-count">{filteredStudents.length} students</span>
          </WorkspaceToolbar>
          {filteredStudents.length > 0 ? (
            <Table 
              scroll={{ x: 820 }} dataSource={filteredStudents}
              columns={columns} 
              rowKey="id" 
              pagination={{
                ...wardenListPagination(7, 'students'), current: currentPage,
                onChange: p => setCurrentPage(p),
              }}
            />
          ) : (
            <div className="py-10">
              <Empty 
                image={<div className="bg-slate-50 p-8 rounded-full inline-block mb-4"><Inbox size={64} className="text-slate-200" /></div>}
                description={<Text className="text-slate-400 block">No students found matching your search</Text>}
              />
            </div>
          )}
        </section>

        {/* Student Profile Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><UserCircle size={20}/> Student Profile</div>}
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={
            <Button 
              type="primary" 
              onClick={() => setViewModalVisible(false)} 
              className="rounded-control h-11 px-8"
            >
              Close Profile
            </Button>
          }
          width="min(1160px, 92vw)"
          className="warden-student-profile-modal rounded-surface"
          centered
        >
          {viewModalVisible && selectedStudent && <StudentProfileContent key={selectedStudent.userId ?? selectedStudent.id}
            student={selectedStudent} hostelName={hostelName} />}
        </Modal>

        {/* Academics API Connection Testing Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-emerald-600"><Server size={20}/> Fetch and Import Students</div>}
          open={academicsModalVisible}
          onCancel={() => { if (!academicsLoading && !academicsImporting) setAcademicsModalVisible(false); }}
          footer={[
            <Button key="close" disabled={academicsLoading || academicsImporting} onClick={() => setAcademicsModalVisible(false)} className="rounded-control">
              Close
            </Button>,
            <Button 
              key="fetch" 
              type="primary" 
              loading={academicsLoading} 
              disabled={academicsImporting}
              onClick={fetchAcademicsStudents} 
              className="rounded-control bg-emerald-600 hover:bg-emerald-700"
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
                className="rounded-control font-mono text-xs"
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

                <div className="bg-slate-50 p-4 rounded-surface border border-slate-100 max-h-60 overflow-y-auto">
                  <Text strong className="block mb-2 text-xs text-slate-500 uppercase tracking-wider">Raw First Student Record JSON (To verify properties):</Text>
                  <pre className="text-xs text-slate-600 bg-white p-3 rounded-control border border-slate-200">
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
