import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  InputNumber,
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
  Tabs,
  Popconfirm,
  Alert,
  Tooltip,
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
  Zap,
  RotateCcw,
  CheckCheck,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";
import { wardenAPI } from "../../services/api";
import moment from "moment";
import axios from "axios";

const { Title, Text, Paragraph } = Typography;
const token = localStorage.getItem("token");

const AttendanceManagement = () => {
  const [activeTab, setActiveTab] = useState("daily"); // "daily" | "monthly"
  const [students, setStudents] = useState([]);
  const studentsRef = useRef([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [tempAttendance, setTempAttendance] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("All");

  // ================= MONTH-END BULK MANDAYS STATE =================
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [totalOperationalDays, setTotalOperationalDays] = useState(
    moment().daysInMonth()
  );
  // mandaysData format: { [studentId]: { absentDays: number, netManDays: number } }
  const [mandaysData, setMandaysData] = useState({});
  const [savingMonthEnd, setSavingMonthEnd] = useState(false);
  const [loadingMonthEnd, setLoadingMonthEnd] = useState(false);
  const [hasSavedMonthData, setHasSavedMonthData] = useState(false);
  const [monthSearchTerm, setMonthSearchTerm] = useState("");
  const [monthSelectedCollege, setMonthSelectedCollege] = useState("All");

  // ================= FETCH MONTH-END SAVED RECORDS =================
  const fetchMonthEndData = useCallback(
    async (monthDate, studentListOverride = null) => {
      const studentList = studentListOverride || studentsRef.current;
      if (!monthDate || !studentList || studentList.length === 0) return;
      const m = monthDate.month() + 1;
      const y = monthDate.year();
      const defaultDays = monthDate.daysInMonth();
      setLoadingMonthEnd(true);

      try {
        const res = await wardenAPI.getAttendance({
          month: m,
          year: y,
          is_monthly: true,
        });
        const savedRecords = res?.data?.data || [];

        if (savedRecords.length > 0) {
          // Extract operational days from remarks or records if available
          let opDays = defaultDays;
          const firstRemark = savedRecords[0]?.remarks || "";
          const opMatch = firstRemark.match(/out of (\d+) operational days/i);
          if (opMatch && opMatch[1]) {
            opDays = parseInt(opMatch[1], 10);
          } else {
            const maxManDays = Math.max(
              ...savedRecords.map((r) => r.totalManDays || 0)
            );
            if (maxManDays > 0) opDays = Math.max(defaultDays, maxManDays);
          }

          setTotalOperationalDays(opDays);

          const loadedData = {};
          studentList.forEach((s) => {
            const sId = s.id || s.userId;
            const rec = savedRecords.find(
              (r) => Number(r.student_id) === Number(sId)
            );
            if (rec) {
              const net =
                rec.totalManDays !== null && rec.totalManDays !== undefined
                  ? rec.totalManDays
                  : opDays;
              const absent = Math.max(0, opDays - net);
              loadedData[sId] = { absentDays: absent, netManDays: net };
            } else {
              loadedData[sId] = { absentDays: 0, netManDays: opDays };
            }
          });

          setMandaysData(loadedData);
          setHasSavedMonthData(true);
        } else {
          // No saved records found for this month, initialize clean defaults
          setTotalOperationalDays(defaultDays);
          const defaultData = {};
          studentList.forEach((s) => {
            const sId = s.id || s.userId;
            defaultData[sId] = { absentDays: 0, netManDays: defaultDays };
          });
          setMandaysData(defaultData);
          setHasSavedMonthData(false);
        }
      } catch (error) {
        console.error("Fetch month-end records error:", error);
        setTotalOperationalDays(defaultDays);
        const defaultData = {};
        studentList.forEach((s) => {
          const sId = s.id || s.userId;
          defaultData[sId] = { absentDays: 0, netManDays: defaultDays };
        });
        setMandaysData(defaultData);
        setHasSavedMonthData(false);
      } finally {
        setLoadingMonthEnd(false);
      }
    },
    []
  );

  // ================= FETCH STUDENTS & DAILY ATTENDANCE =================
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        wardenAPI.getStudents(),
        wardenAPI.getAttendance({ date: selectedDate }),
      ]);

      const studentList = stuRes?.data?.data || [];
      studentsRef.current = studentList;
      setStudents(studentList);
      setAttendance(attRes?.data?.data || []);

      // Load saved month-end records for the currently selected month
      fetchMonthEndData(selectedMonth, studentList);
    } catch (error) {
      console.error(error);
      message.error("Failed to load student records.");
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [selectedDate]); // Stable dependency on selectedDate only

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When month changes, fetch saved data from backend or restore clean defaults
  const handleMonthChange = (date) => {
    if (!date) return;
    setSelectedMonth(date);
    fetchMonthEndData(date);
  };

  // When operational days change manually, scale/bound values
  const handleOperationalDaysChange = (val) => {
    const days = typeof val === "number" && val >= 0 ? val : 0;
    setTotalOperationalDays(days);
    setMandaysData((prev) => {
      const updated = {};
      students.forEach((s) => {
        const sId = s.id || s.userId;
        const currentAbsent = prev[sId]?.absentDays || 0;
        const boundedAbsent = Math.min(currentAbsent, days);
        updated[sId] = {
          absentDays: boundedAbsent,
          netManDays: Math.max(0, days - boundedAbsent),
        };
      });
      return updated;
    });
  };

  // ================= "MAX DAYS" AUTOFILL BUTTON =================
  const handleFillMaxDays = () => {
    const maxDays = totalOperationalDays || selectedMonth.daysInMonth();
    const updated = {};
    students.forEach((s) => {
      const sId = s.id || s.userId;
      updated[sId] = {
        absentDays: 0,
        netManDays: maxDays,
      };
    });
    setMandaysData(updated);
    message.success(`All ${students.length} students filled with Max Days (${maxDays} days)!`);
  };

  // ================= STUDENT MANDAY TWO-WAY SYNC HANDLERS =================
  const handleAbsentChange = (studentId, val) => {
    const absent = typeof val === "number" && val >= 0 ? Math.min(val, totalOperationalDays) : 0;
    const net = Math.max(0, totalOperationalDays - absent);
    setMandaysData((prev) => ({
      ...prev,
      [studentId]: {
        absentDays: absent,
        netManDays: net,
      },
    }));
  };

  const handleNetManDaysChange = (studentId, val) => {
    const net = typeof val === "number" && val >= 0 ? Math.min(val, totalOperationalDays) : 0;
    const absent = Math.max(0, totalOperationalDays - net);
    setMandaysData((prev) => ({
      ...prev,
      [studentId]: {
        absentDays: absent,
        netManDays: net,
      },
    }));
  };

  const handleSetStudentFull = (studentId) => {
    setMandaysData((prev) => ({
      ...prev,
      [studentId]: {
        absentDays: 0,
        netManDays: totalOperationalDays,
      },
    }));
  };

  // ================= SAVE MONTH-END MANDAYS =================
  const handleSaveMonthEndMandays = async () => {
    if (!students.length) {
      message.warning("No students available to save.");
      return;
    }

    setSavingMonthEnd(true);
    try {
      const reductions = students.map((s) => {
        const sId = s.id || s.userId;
        const absent = mandaysData[sId]?.absentDays || 0;
        return {
          student_id: sId,
          reduction_days: absent,
        };
      });

      const payload = {
        month: selectedMonth.month() + 1,
        year: selectedMonth.year(),
        total_operational_days: parseInt(totalOperationalDays, 10),
        student_reductions: reductions,
      };

      const res = await wardenAPI.bulkMonthEndMandays(payload);

      message.success(
        res?.data?.message ||
          `Month-end mandays saved successfully for ${students.length} students!`
      );
      await fetchMonthEndData(selectedMonth, students);
    } catch (error) {
      console.error("Save month-end error:", error);
      const errMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to save month-end mandays.";
      message.error(errMsg);
    } finally {
      setSavingMonthEnd(false);
    }
  };

  // ================= HELPERS (DAILY) =================
  const getAttendanceForStudent = (studentId) =>
    attendance.find((att) => att?.Student?.id === studentId || att?.student_id === studentId);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesCollege =
        selectedCollege === "All" || s?.college === selectedCollege;

      const matchesSearch =
        (s?.username?.toLowerCase() || s?.userName?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        ) ||
        (s?.roll_number?.toLowerCase() || "").includes(
          searchTerm.toLowerCase()
        );

      return matchesCollege && matchesSearch;
    });
  }, [students, searchTerm, selectedCollege]);

  const filteredMonthStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesCollege =
        monthSelectedCollege === "All" || s?.college === monthSelectedCollege;

      const matchesSearch =
        (s?.username?.toLowerCase() || s?.userName?.toLowerCase() || "").includes(
          monthSearchTerm.toLowerCase()
        ) ||
        (s?.roll_number?.toLowerCase() || "").includes(
          monthSearchTerm.toLowerCase()
        );

      return matchesCollege && matchesSearch;
    });
  }, [students, monthSearchTerm, monthSelectedCollege]);

  const handleStatusChange = (studentId, status) => {
    setTempAttendance((prev) => ({
      ...prev,
      [studentId]: { status },
    }));
  };

  // ================= SAVE DAILY ATTENDANCE =================
  const handleSaveAllDaily = async () => {
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
        wardenAPI.markAttendance({
          student_id: parseInt(studentId),
          date: selectedDate,
          status: data.status,
        })
      );

      await Promise.all(promises);

      message.success(`Attendance updated for ${changes.length} student(s)`);
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

  // ================= DAILY COLUMNS =================
  const dailyColumns = [
    {
      title: "Student Details",
      key: "identity",
      render: (_, r) => {
        const name = r?.username || r?.userName || "Unknown";
        return (
          <Space>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Users size={18} />
            </div>
            <Space direction="vertical" size={0}>
              <Text strong>{name}</Text>
              <Text type="secondary" className="text-xs">
                Roll: {r?.roll_number || "UNSET"} • {r?.college || "N/A"}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Attendance Status",
      key: "status",
      render: (_, r) => {
        const sId = r.id || r.userId;
        const studentAtt = getAttendanceForStudent(sId);
        const temp = tempAttendance[sId];
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
        const sId = r.id || r.userId;
        const studentAtt = getAttendanceForStudent(sId);
        if (studentAtt) {
          return (
            <Tag color="blue" className="px-3 py-1 font-medium">
              MARKED ({studentAtt.status})
            </Tag>
          );
        }

        const current = tempAttendance[sId]?.status;

        return (
          <Space>
            <Button
              shape="circle"
              size="small"
              type={current === "P" ? "primary" : "default"}
              onClick={() => handleStatusChange(sId, "P")}
            >
              P
            </Button>
            <Button
              shape="circle"
              size="small"
              danger={current === "A"}
              onClick={() => handleStatusChange(sId, "A")}
            >
              A
            </Button>
            <Button
              shape="circle"
              size="small"
              onClick={() => handleStatusChange(sId, "OD")}
            >
              OD
            </Button>
          </Space>
        );
      },
    },
  ];

  // ================= MONTH-END MANDAYS COLUMNS =================
  const monthMandaysColumns = [
    {
      title: "Student Details",
      key: "identity",
      render: (_, r) => {
        const name = r?.username || r?.userName || "Unknown";
        return (
          <Space>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Users size={18} />
            </div>
            <Space direction="vertical" size={0}>
              <Text strong>{name}</Text>
              <Text type="secondary" className="text-xs">
                Roll: {r?.roll_number || "UNSET"} • {r?.college || "N/A"}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Total Month Days",
      key: "operational",
      align: "center",
      width: 130,
      render: () => (
        <Tag color="geekblue" className="font-semibold px-3 py-1">
          {totalOperationalDays} Days
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip title="Enter number of days student was absent / on leave">
          <span>Days Absent ℹ️</span>
        </Tooltip>
      ),
      key: "absentDays",
      align: "center",
      width: 160,
      render: (_, r) => {
        const sId = r.id || r.userId;
        const absent = mandaysData[sId]?.absentDays ?? 0;
        return (
          <InputNumber
            min={0}
            max={totalOperationalDays}
            value={absent}
            onChange={(val) => handleAbsentChange(sId, val)}
            className="w-24 text-center"
            status={absent > 0 ? "warning" : ""}
          />
        );
      },
    },
    {
      title: (
        <Tooltip title="Net present days calculated (Operational Days - Absent Days)">
          <span>Net Man-Days ℹ️</span>
        </Tooltip>
      ),
      key: "netManDays",
      align: "center",
      width: 160,
      render: (_, r) => {
        const sId = r.id || r.userId;
        const net = mandaysData[sId]?.netManDays ?? totalOperationalDays;
        return (
          <InputNumber
            min={0}
            max={totalOperationalDays}
            value={net}
            onChange={(val) => handleNetManDaysChange(sId, val)}
            className="w-24 text-center font-bold"
          />
        );
      },
    },
    {
      title: "Status & Summary",
      key: "statusSummary",
      align: "center",
      width: 180,
      render: (_, r) => {
        const sId = r.id || r.userId;
        const absent = mandaysData[sId]?.absentDays ?? 0;
        const net = mandaysData[sId]?.netManDays ?? totalOperationalDays;

        if (absent === 0 && net === totalOperationalDays) {
          return <Tag color="success">Full ({net} Days)</Tag>;
        }
        if (net === 0) {
          return <Tag color="error">Full Absent (0 Days)</Tag>;
        }
        return (
          <Tag color="warning">
            {net} Days (-{absent} Absent)
          </Tag>
        );
      },
    },
    {
      title: "Quick Action",
      key: "quickAction",
      align: "right",
      width: 120,
      render: (_, r) => {
        const sId = r.id || r.userId;
        const absent = mandaysData[sId]?.absentDays ?? 0;
        return absent > 0 ? (
          <Button
            size="small"
            type="link"
            icon={<RotateCcw size={12} />}
            onClick={() => handleSetStudentFull(sId)}
          >
            Reset Max
          </Button>
        ) : (
          <Text type="secondary" className="text-xs">Max Days</Text>
        );
      },
    },
  ];

  // Calculate Month-End Aggregates
  const monthEndStats = useMemo(() => {
    let totalNetManDays = 0;
    let totalAbsentDays = 0;
    let studentsWithReduction = 0;

    students.forEach((s) => {
      const sId = s.id || s.userId;
      const absent = mandaysData[sId]?.absentDays ?? 0;
      const net = mandaysData[sId]?.netManDays ?? totalOperationalDays;
      totalNetManDays += net;
      totalAbsentDays += absent;
      if (absent > 0) studentsWithReduction += 1;
    });

    const avgManDays =
      students.length > 0
        ? (totalNetManDays / students.length).toFixed(1)
        : 0;

    return {
      totalNetManDays,
      totalAbsentDays,
      studentsWithReduction,
      avgManDays,
    };
  }, [students, mandaysData, totalOperationalDays]);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: "#2563eb", borderRadius: 12 },
      }}
    >
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* TOP HEADER */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
              <CalendarCheck size={26} />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Attendance & Man-Days Management
              </Title>
              <Text type="secondary">
                Track daily attendance or bulk record month-end man-days
              </Text>
            </div>
          </div>

          {/* TAB TOGGLER */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
            <Button
              type={activeTab === "daily" ? "primary" : "text"}
              onClick={() => setActiveTab("daily")}
              className="rounded-xl font-medium"
              icon={<Calendar size={16} />}
            >
              Daily Attendance
            </Button>
            <Button
              type={activeTab === "monthly" ? "primary" : "text"}
              onClick={() => setActiveTab("monthly")}
              className="rounded-xl font-medium"
              icon={<Zap size={16} />}
            >
              Month-End Bulk Man-Days
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: DAILY ATTENDANCE TAB */}
        {/* ========================================================================= */}
        {activeTab === "daily" && (
          <>
            {/* DAILY CONTROLS BAR */}
            <div className="flex justify-between items-center mb-6">
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
                  className="rounded-xl h-10"
                />
                <Button
                  icon={<RefreshCw size={16} />}
                  onClick={fetchData}
                  className="rounded-xl h-10"
                />
              </Space>
            </div>

            {/* DAILY STATS */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} md={6}>
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <Statistic
                    title="Total Students"
                    value={students.length}
                    prefix={<Users size={18} className="text-slate-500 mr-1" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <Statistic
                    title="Present"
                    value={attendance.filter((a) => a.status === "P").length}
                    valueStyle={{ color: "#16a34a" }}
                    prefix={<CheckCircle2 size={18} className="mr-1" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <Statistic
                    title="Absent"
                    value={attendance.filter((a) => a.status === "A").length}
                    valueStyle={{ color: "#dc2626" }}
                    prefix={<XCircle size={18} className="mr-1" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <Statistic
                    title="College OD"
                    value={attendance.filter((a) => a.status === "OD").length}
                    valueStyle={{ color: "#2563eb" }}
                    prefix={<Clock size={18} className="mr-1" />}
                  />
                </Card>
              </Col>
            </Row>

            {/* DAILY FILTER & ACTIONS */}
            <Card className="mb-6 rounded-2xl border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Space wrap>
                  <Input
                    prefix={<Search size={14} className="text-slate-400" />}
                    placeholder="Search Roll or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: 250 }}
                    className="rounded-xl h-10"
                    allowClear
                  />
                  <Select
                    value={selectedCollege}
                    onChange={setSelectedCollege}
                    style={{ width: 200 }}
                    className="h-10"
                    options={[
                      { label: "All Colleges", value: "All" },
                      ...[...new Set(students.map((s) => s.college))]
                        .filter(Boolean)
                        .map((c) => ({ label: c, value: c })),
                    ]}
                  />
                </Space>

                {Object.keys(tempAttendance).length > 0 && (
                  <Button
                    type="primary"
                    icon={<Save size={16} />}
                    loading={markingAttendance}
                    onClick={handleSaveAllDaily}
                    className="rounded-xl h-10 px-6 font-semibold"
                  >
                    Save Changes ({Object.keys(tempAttendance).length})
                  </Button>
                )}
              </div>
            </Card>

            {/* DAILY TABLE */}
            <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden">
              <Table
                dataSource={filteredStudents}
                columns={dailyColumns}
                rowKey={(r) => r.id || r.userId}
                loading={loading}
                pagination={{ pageSize: 15, showSizeChanger: true }}
                locale={{
                  emptyText: (
                    <Empty
                      image={<Inbox size={40} className="text-slate-300 mx-auto" />}
                      description="No students found"
                    />
                  ),
                }}
              />
            </Card>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MONTH-END BULK MANDAYS TAB */}
        {/* ========================================================================= */}
        {activeTab === "monthly" && (
          <>
            {/* INSTRUCTION ALERT BANNER */}
            <Alert
              message={
                <div className="flex items-center gap-2 font-semibold text-blue-900">
                  <Zap size={18} className="text-blue-600" />
                  Bulk Month-End Man-Days Entry Mode
                </div>
              }
              description={
                <span className="text-slate-600 text-sm">
                  1. Select month & total operational days. • 2. Click <b>"Max Days"</b> to autofill all students with full attendance. • 3. Adjust absent days for students who took leave. • 4. Click <b>"Save Month-End Man-Days"</b> to record all changes.
                </span>
              }
              type="info"
              showIcon={false}
              className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-4"
            />

            {/* MONTH-END CONTROLS & ACTION CARD */}
            <Card className="mb-6 rounded-2xl border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* LEFT: MONTH PICKER & OPERATIONAL DAYS & MAX DAYS BUTTON */}
                <Space wrap size="middle">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Text className="text-xs font-semibold text-slate-500">
                        Billing Month
                      </Text>
                      {hasSavedMonthData ? (
                        <Tag color="success" className="text-xs px-1.5 py-0 font-medium border-none bg-emerald-100 text-emerald-800">
                          Saved Records
                        </Tag>
                      ) : (
                        <Tag color="blue" className="text-xs px-1.5 py-0 font-medium border-none bg-blue-100 text-blue-800">
                          Default (New)
                        </Tag>
                      )}
                    </div>
                    <DatePicker
                      picker="month"
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      allowClear={false}
                      className="rounded-xl h-10 w-44"
                    />
                  </div>

                  <div>
                    <Text className="block text-xs font-semibold text-slate-500 mb-1">
                      Operational Days
                    </Text>
                    <InputNumber
                      min={1}
                      max={31}
                      value={totalOperationalDays}
                      onChange={handleOperationalDaysChange}
                      className="rounded-xl h-10 w-36 font-semibold"
                    />
                  </div>

                  <div className="pt-5 flex gap-2">
                    <Tooltip title="Fill all students with maximum operational days (0 absent days)">
                      <Button
                        type="default"
                        icon={<Zap size={16} className="text-amber-500" />}
                        onClick={handleFillMaxDays}
                        className="rounded-xl h-10 border-amber-300 bg-amber-50/60 hover:bg-amber-100 text-amber-900 font-semibold px-4"
                      >
                        Max Days (All Full)
                      </Button>
                    </Tooltip>

                    <Tooltip title="Reset all changes back to default full operational days for this month">
                      <Button
                        type="text"
                        icon={<RotateCcw size={15} className="text-slate-500" />}
                        onClick={handleFillMaxDays}
                        className="rounded-xl h-10 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3"
                      >
                        Reset Defaults
                      </Button>
                    </Tooltip>
                  </div>
                </Space>

                {/* RIGHT: SAVE BUTTON */}
                <div className="pt-2">
                  <Popconfirm
                    title="Confirm Month-End Submission"
                    description={`Save month-end man-days for ${students.length} students for ${selectedMonth.format(
                      "MMMM YYYY"
                    )} with ${totalOperationalDays} operational days? This will overwrite previous monthly records for this month.`}
                    onConfirm={handleSaveMonthEndMandays}
                    okText="Yes, Save"
                    cancelText="Cancel"
                    okButtonProps={{ loading: savingMonthEnd }}
                  >
                    <Button
                      type="primary"
                      size="large"
                      icon={<Save size={18} />}
                      loading={savingMonthEnd}
                      className="rounded-xl h-11 px-7 font-bold bg-emerald-600 hover:bg-emerald-700 border-none shadow-md"
                    >
                      Save Month-End Man-Days
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </Card>

            {/* MONTH-END AGGREGATE STATS */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} md={6}>
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <Statistic
                    title="Total Students"
                    value={students.length}
                    prefix={<Users size={18} className="text-slate-500 mr-1" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <Statistic
                    title="Total Operational Days"
                    value={totalOperationalDays}
                    suffix="Days"
                    valueStyle={{ color: "#2563eb" }}
                    prefix={<Calendar size={18} className="mr-1" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <Statistic
                    title="Aggregate Man-Days"
                    value={monthEndStats.totalNetManDays}
                    suffix={`/ ${students.length * totalOperationalDays}`}
                    valueStyle={{ color: "#16a34a" }}
                    prefix={<CheckCheck size={18} className="mr-1" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="rounded-2xl border-slate-200 shadow-xs">
                  <Statistic
                    title="Students with Leave/Reduction"
                    value={monthEndStats.studentsWithReduction}
                    suffix={`(${monthEndStats.totalAbsentDays} Days)`}
                    valueStyle={{
                      color:
                        monthEndStats.studentsWithReduction > 0
                          ? "#d97706"
                          : "#16a34a",
                    }}
                    prefix={<AlertCircle size={18} className="mr-1" />}
                  />
                </Card>
              </Col>
            </Row>

            {/* SEARCH & FILTER FOR MONTH VIEW */}
            <Card className="mb-6 rounded-2xl border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Space wrap>
                  <Input
                    prefix={<Search size={14} className="text-slate-400" />}
                    placeholder="Search Roll or Name..."
                    value={monthSearchTerm}
                    onChange={(e) => setMonthSearchTerm(e.target.value)}
                    style={{ width: 250 }}
                    className="rounded-xl h-10"
                    allowClear
                  />
                  <Select
                    value={monthSelectedCollege}
                    onChange={setMonthSelectedCollege}
                    style={{ width: 200 }}
                    className="h-10"
                    options={[
                      { label: "All Colleges", value: "All" },
                      ...[...new Set(students.map((s) => s.college))]
                        .filter(Boolean)
                        .map((c) => ({ label: c, value: c })),
                    ]}
                  />
                </Space>

                <Text type="secondary" className="text-xs">
                  Showing {filteredMonthStudents.length} of {students.length} students
                </Text>
              </div>
            </Card>

            {/* MONTH-END STUDENTS TABLE */}
            <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden">
              <Table
                dataSource={filteredMonthStudents}
                columns={monthMandaysColumns}
                rowKey={(r) => r.id || r.userId}
                loading={loadingMonthEnd || loading}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                locale={{
                  emptyText: (
                    <Empty
                      image={<Inbox size={40} className="text-slate-300 mx-auto" />}
                      description="No students found"
                    />
                  ),
                }}
              />
            </Card>
          </>
        )}
      </div>
    </ConfigProvider>
  );
};

export default AttendanceManagement;
