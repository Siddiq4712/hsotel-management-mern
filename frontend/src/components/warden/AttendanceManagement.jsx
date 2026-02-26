import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  Typography,
  Row,
  Col,
  Statistic,
  Space,
  Skeleton,
  Empty,
  message,
  ConfigProvider,
  theme,
} from "antd";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  RefreshCw,
  Save,
  Inbox,
} from "lucide-react";
import { wardenAPI } from "../../services/api";
import moment from "moment";
import axios from "axios";

const { Title, Text } = Typography;
const token = localStorage.getItem("token");

const AttendanceManagement = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [tempAttendance, setTempAttendance] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("All");

  // ================= FETCH =================
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        wardenAPI.getStudents(),
        wardenAPI.getAttendance({ date: selectedDate }),
      ]);

      setStudents(stuRes?.data?.data || []);
      setAttendance(attRes?.data?.data || []);
    } catch (error) {
      console.error(error);
      message.error("Failed to load student records.");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ================= HELPERS =================
  const getAttendanceForStudent = (studentId) =>
    attendance.find((att) => att?.Student?.id === studentId);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesCollege =
        selectedCollege === "All" || s?.college === selectedCollege;

      const matchesSearch =
        (s?.username?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (s?.roll_number?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        );

      return matchesCollege && matchesSearch;
    });
  }, [students, searchTerm, selectedCollege]);

  const handleStatusChange = (studentId, status) => {
    setTempAttendance((prev) => ({
      ...prev,
      [studentId]: { status },
    }));
  };

  // ================= SAVE =================
  const handleSaveAll = async () => {
    if (!token) {
      message.error("Authentication required.");
      return;
    }

    const changes = Object.entries(tempAttendance);
    if (changes.length === 0) {
      message.info("No changes to save.");
      return;
    }

    setMarkingAttendance(true);

    try {
      const promises = changes.map(([studentId, data]) =>
        axios.post(
          "http://localhost:5001/api/warden/attendance",
          {
            student_id: parseInt(studentId),
            date: selectedDate,
            status: data.status,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      await Promise.all(promises);

      message.success(
        `Attendance updated for ${changes.length} student(s)`
      );
      setTempAttendance({});
      fetchData();
    } catch (error) {
      console.error(error);
      message.error("Failed to save attendance.");
    } finally {
      setMarkingAttendance(false);
    }
  };

  const statusConfig = {
    P: {
      color: "success",
      label: "Present",
      icon: <CheckCircle2 size={12} />,
    },
    A: {
      color: "error",
      label: "Absent",
      icon: <XCircle size={12} />,
    },
    OD: {
      color: "processing",
      label: "College OD",
      icon: <Clock size={12} />,
    },
  };

  // ================= TABLE =================
  const columns = [
    {
      title: "Student Details",
      key: "identity",
      render: (_, r) => (
        <Space>
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <Users size={18} />
          </div>
          <Space direction="vertical" size={0}>
            <Text strong>{r?.username || "Unknown"}</Text>
            <Text type="secondary" className="text-xs">
              Roll: {r?.roll_number || "UNSET"} • {r?.college || "N/A"}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: "Attendance Status",
      key: "status",
      render: (_, r) => {
        const studentAtt = getAttendanceForStudent(r.id);
        const temp = tempAttendance[r.id];
        const status = temp?.status || studentAtt?.status;

        if (status && statusConfig[status]) {
          return (
            <Tag
              icon={statusConfig[status].icon}
              color={statusConfig[status].color}
            >
              {statusConfig[status].label}
            </Tag>
          );
        }

        return <Text type="secondary">Not Marked</Text>;
      },
    },
    {
      title: "Mark Attendance",
      key: "actions",
      align: "right",
      render: (_, r) => {
        const studentAtt = getAttendanceForStudent(r.id);
        if (studentAtt) {
          return (
            <Button type="text" size="small">
              MARKED
            </Button>
          );
        }

        const current = tempAttendance[r.id]?.status;

        return (
          <Space>
            <Button
              shape="circle"
              size="small"
              type={current === "P" ? "primary" : "default"}
              onClick={() => handleStatusChange(r.id, "P")}
            >
              P
            </Button>
            <Button
              shape="circle"
              size="small"
              danger={current === "A"}
              onClick={() => handleStatusChange(r.id, "A")}
            >
              A
            </Button>
            <Button
              shape="circle"
              size="small"
              onClick={() => handleStatusChange(r.id, "OD")}
            >
              OD
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: "#2563eb", borderRadius: 12 },
      }}
    >
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Calendar size={24} />
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Daily Attendance
              </Title>
              <Text type="secondary">
                Manage daily student records
              </Text>
            </div>
          </div>

          <Space>
            <DatePicker
              value={moment(selectedDate)}
              onChange={(date) =>
                setSelectedDate(
                  date
                    ? date.format("YYYY-MM-DD")
                    : moment().format("YYYY-MM-DD")
                )
              }
            />
            <Button icon={<RefreshCw size={16} />} onClick={fetchData} />
          </Space>
        </div>

        {/* STATS */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic title="Total Students" value={students.length} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Present"
                value={attendance.filter((a) => a.status === "P").length}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Absent"
                value={attendance.filter((a) => a.status === "A").length}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="OD"
                value={attendance.filter((a) => a.status === "OD").length}
              />
            </Card>
          </Col>
        </Row>

        {/* FILTER */}
        <Card className="mb-6">
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Input
              prefix={<Search size={14} />}
              placeholder="Search Roll or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 250 }}
            />
            <Select
              value={selectedCollege}
              onChange={setSelectedCollege}
              style={{ width: 200 }}
              options={[
                { label: "All", value: "All" },
                ...[...new Set(students.map((s) => s.college))]
                  .filter(Boolean)
                  .map((c) => ({ label: c, value: c })),
              ]}
            />
            {Object.keys(tempAttendance).length > 0 && (
              <Button
                type="primary"
                icon={<Save size={14} />}
                loading={markingAttendance}
                onClick={handleSaveAll}
              >
                Save Changes
              </Button>
            )}
          </Space>
        </Card>

        {/* TABLE */}
        <Card>
          <Table
            dataSource={filteredStudents}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <Empty
                  image={<Inbox size={40} />}
                  description="No students found"
                />
              ),
            }}
          />
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default AttendanceManagement;
