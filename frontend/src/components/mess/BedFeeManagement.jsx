import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select,
  message, Popconfirm, Space, Typography, Tabs, Checkbox, Row, Col
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';
import { messAPI } from '../../services/api'; // Import existing API methods

const { Title, Text } = Typography;
const { Option } = Select;

const BedFeeManagement = () => {
  const [loading, setLoading] = useState(false);
  const [bedFees, setBedFees] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [studentsForSelection, setStudentsForSelection] = useState([]); // Students for modal checkboxes
  const [isGenerateFeeModalVisible, setIsGenerateFeeModalVisible] = useState(false); // Modal for generating fees for selected students
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false); // Modal for session-wide bulk creation
  const [generateFeeForm] = Form.useForm();
  const [bulkForm] = Form.useForm();
  const [filter, setFilter] = useState({ // Filters for the main table
    month: moment().month() + 1,
    year: moment().year(),
    session_id: undefined,
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState([]); // Stores student IDs selected in the generate fee modal
  const [sessionForModalFilter, setSessionForModalFilter] = useState(undefined); // Session filter within the generate fee modal

  // --- Main data fetching for the table ---
  useEffect(() => {
    fetchBedFees();
    fetchSessions();
  }, [filter.month, filter.year, filter.session_id]);

  // --- Fetching students for the "Generate Bed Fees" modal's checkbox list ---
  useEffect(() => {
    if (isGenerateFeeModalVisible && sessionForModalFilter) {
      fetchStudentsForModalSelection(sessionForModalFilter);
    } else if (isGenerateFeeModalVisible && !sessionForModalFilter) {
      // Clear students when modal is open but no session selected for filtering
      setStudentsForSelection([]);
    }
  }, [isGenerateFeeModalVisible, sessionForModalFilter]); // Re-fetch when modal opens or session filter changes

  const fetchBedFees = async () => {
    try {
      setLoading(true);
      const response = await messAPI.getStudentFees({
        ...filter,
        fee_type: 'bed_charge',
      });

      if (response.data && response.data.data) {
        setBedFees(response.data.data);
      } else {
        setBedFees([]);
      }
    } catch (error) {
      console.error('Failed to fetch bed fees:', error);
      message.error('Failed to fetch bed fees');
      setBedFees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await messAPI.getSessions();
      if (response.data && response.data.data) {
        setSessions(response.data.data);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      message.error('Failed to fetch sessions');
      setSessions([]);
    }
  };

  // Function to fetch students specifically for the checkbox selection in the modal
  const fetchStudentsForModalSelection = async (sessionId) => {
    if (!sessionId) {
      setStudentsForSelection([]);
      return;
    }
    try {
      setLoading(true);
      // Pass requires_bed: true AND the selected session_id
      const response = await messAPI.getStudents({ requires_bed: true, session_id: sessionId });

      if (response.data && response.data.data) {
        // The backend should now return only students who requires_bed in the specified session
        setStudentsForSelection(response.data.data);
      } else {
        setStudentsForSelection([]);
      }
    } catch (error) {
      console.error('Failed to fetch students for modal selection:', error);
      message.error('Failed to fetch students for modal selection: ' + (error.message || 'Unknown error'));
      setStudentsForSelection([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for modals ---
  const handleGenerateBedFees = async (values) => {
    if (selectedStudentIds.length === 0) {
      message.error('Please select at least one student.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...values,
        fee_type: 'bed_charge',
        description: values.description || `Bed fee for ${values.month}/${values.year}`,
        student_ids: selectedStudentIds, // Pass the selected student IDs explicitly
        // No need to send requires_bed or session_id here, as specific_student_ids take precedence in backend
      };

      const response = await messAPI.createBulkStudentFee(payload);

      message.success(`Generated ${response.data?.data?.fees_created || 0} bed fees successfully`);
      setIsGenerateFeeModalVisible(false);
      generateFeeForm.resetFields();
      setSelectedStudentIds([]); // Clear selection after successful generation
      setSessionForModalFilter(undefined); // Clear modal's session filter
      fetchBedFees(); // Refresh main table
    } catch (error) {
      console.error('Failed to generate bed fees:', error);
      message.error('Failed to generate bed fees: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBulkBedFees = async (values) => {
    try {
      setLoading(true);
      const response = await messAPI.createBulkStudentFee({
        ...values,
        fee_type: 'bed_charge',
        description: values.description || `Bed fee for ${values.month}/${values.year}`,
        requires_bed: true // This flag tells the backend to only target students requiring beds within the session
      });

      message.success(`Created ${response.data?.data?.fees_created || 0} bed fees successfully across the session`);
      setIsBulkModalVisible(false);
      bulkForm.resetFields();
      fetchBedFees();
    } catch (error) {
      console.error('Failed to create bulk bed fees:', error);
      message.error('Failed to create bulk bed fees: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBedFee = async (id) => {
    try {
      setLoading(true);
      await messAPI.deleteStudentFee(id); // Use the correct API method
      message.success('Bed fee deleted successfully');
      fetchBedFees();
    } catch (error) {
      console.error('Failed to delete bed fee:', error);
      message.error('Failed to delete bed fee: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter({ ...filter, ...newFilter });
  };

  // Handlers for student selection in the "Generate Bed Fees" modal
  const onStudentSelectionChange = (checkedValues) => {
    setSelectedStudentIds(checkedValues);
  };

  const onSelectAllChange = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(studentsForSelection.map(student => student.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const isAllSelected = studentsForSelection.length > 0 && selectedStudentIds.length === studentsForSelection.length;
  const isIndeterminate = selectedStudentIds.length > 0 && selectedStudentIds.length < studentsForSelection.length;

  const columns = [
    {
      title: 'Student',
      key: 'student_name',
      render: (_, record) => (
        <span>
          {record.Student?.username || 'Unknown'}
          {record.Student?.roll_number ? ` (${record.Student.roll_number})` : ''}
        </span>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`
    },
    {
      title: 'Month/Year',
      key: 'period',
      render: (_, record) => `${record.month}/${record.year}`
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Created By',
      key: 'issued_by',
      render: (_, record) => record.IssuedBy?.username || 'System'
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('DD-MM-YYYY HH:mm')
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Are you sure you want to delete this bed fee?"
          onConfirm={() => handleDeleteBedFee(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      )
    }
  ];

  const tabItems = [
    {
      key: '1',
      label: 'View Bed Fees',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Select
                placeholder="Select Month"
                style={{ width: 120 }}
                value={filter.month}
                onChange={(value) => handleFilterChange({ month: value })}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <Option key={month} value={month}>
                    {moment().month(month - 1).format('MMMM')}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Select Year"
                style={{ width: 100 }}
                value={filter.year}
                onChange={(value) => handleFilterChange({ year: value })}
              >
                {Array.from({ length: 5 }, (_, i) => moment().year() - 2 + i).map(year => (
                  <Option key={year} value={year}>{year}</Option>
                ))}
              </Select>
              <Select
                placeholder="Filter by Session"
                style={{ width: 200 }}
                allowClear
                value={filter.session_id}
                onChange={(value) => handleFilterChange({ session_id: value })}
              >
                {sessions.map(session => (
                  <Option key={session.id} value={session.id}>
                    {session.name}
                  </Option>
                ))}
              </Select>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setIsGenerateFeeModalVisible(true);
                  setSelectedStudentIds([]); // Clear any previous selection
                  generateFeeForm.resetFields();
                  // Set default values for modal form
                  const defaultMonth = moment().month() + 1;
                  const defaultYear = moment().year();
                  const defaultSession = sessions.length > 0 ? sessions[0].id : undefined;

                  generateFeeForm.setFieldsValue({
                    month: defaultMonth,
                    year: defaultYear,
                    session_id_for_modal: defaultSession
                  });
                  setSessionForModalFilter(defaultSession); // Also set the internal state for student list
                }}
              >
                Generate Bed Fee (Multi-Select)
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  setIsBulkModalVisible(true);
                  bulkForm.resetFields();
                  // Set default values for bulk form
                  bulkForm.setFieldsValue({
                    month: moment().month() + 1,
                    year: moment().year(),
                    session_id: sessions.length > 0 ? sessions[0].id : undefined
                  });
                }}
              >
                Bulk Create (Session-wide)
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={bedFees}
            rowKey="id"
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            summary={(pageData) => {
              const totalAmount = pageData.reduce(
                (total, item) => total + parseFloat(item.amount || 0),
                0
              );
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <strong>Total</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text type="danger">₹{totalAmount.toFixed(2)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={4}></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </>
      )
    },
    {
      key: '2',
      label: 'Statistics',
      children: (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Title level={5}>Bed Fee Summary</Title>
            {/* Note: This statistics count is based on students loaded for modal selection, 
                which is session-specific. You might want a separate API for overall stats. */}
            <Text>Students with bed requirement in selected modal session: {studentsForSelection.length}</Text>
            <br />
            <Text>Total bed fees collected this month: ₹{
              bedFees
                .filter(fee => fee.month === filter.month && fee.year === filter.year)
                .reduce((sum, fee) => sum + parseFloat(fee.amount), 0)
                .toFixed(2)
            }</Text>
          </div>
        </Card>
      )
    }
  ];

  return (
    <div className="bed-fee-management">
      <Card title={<Title level={4}>Bed Fee Management</Title>}>
        <Tabs items={tabItems} defaultActiveKey="1" />
      </Card>

      {/* Modal for generating bed fees for selected students */}
      <Modal
        title="Generate Bed Fees for Selected Students"
        open={isGenerateFeeModalVisible}
        onCancel={() => {
          setIsGenerateFeeModalVisible(false);
          generateFeeForm.resetFields();
          setSelectedStudentIds([]); // Clear selection on cancel
          setSessionForModalFilter(undefined); // Clear session filter for modal
        }}
        width={800}
        footer={null}
      >
        <Form
          form={generateFeeForm}
          layout="vertical"
          onFinish={handleGenerateBedFees}
          initialValues={{
            month: moment().month() + 1,
            year: moment().year(),
            session_id_for_modal: sessionForModalFilter,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="session_id_for_modal"
                label="Filter Students by Session"
                rules={[{ required: true, message: 'Please select a session' }]}
              >
                <Select
                  placeholder="Select session to view students"
                  onChange={(value) => {
                      setSessionForModalFilter(value); // Update state to trigger re-fetch of students
                      setSelectedStudentIds([]); // Clear selection when session changes
                  }}
                  value={sessionForModalFilter} // Control the value of this select
                >
                  {sessions.map(session => (
                    <Option key={session.id} value={session.id}>
                      {session.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount (₹)"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <Input type="number" min={0} step={0.01} prefix="₹" placeholder="Amount" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="month" label="Month" rules={[{ required: true }]}>
                <Select placeholder="Select month">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <Option key={month} value={month}>
                      {moment().month(month - 1).format('MMMM')}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="year" label="Year" rules={[{ required: true }]}>
                <Select placeholder="Select year">
                  {Array.from({ length: 5 }, (_, i) => moment().year() - 2 + i).map(year => (
                    <Option key={year} value={year}>{year}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Description (Optional)" />
          </Form.Item>

          <Title level={5} style={{ marginTop: 20 }}>Select Students</Title>
          {sessionForModalFilter ? ( // Only show student list if a session is selected
            studentsForSelection.length > 0 ? (
              <>
                <Checkbox
                  indeterminate={isIndeterminate}
                  onChange={onSelectAllChange}
                  checked={isAllSelected}
                >
                  Select All ({studentsForSelection.length})
                </Checkbox>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, marginTop: 8 }}>
                  <Checkbox.Group value={selectedStudentIds} onChange={onStudentSelectionChange}>
                    <Row>
                      {studentsForSelection.map(student => (
                        <Col span={12} key={student.id} style={{ marginBottom: 8 }}>
                          <Checkbox value={student.id}>
                            {student.username} {student.roll_number ? `(${student.roll_number})` : ''}
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                </div>
              </>
            ) : (
              <Text type="secondary">No students found requiring a bed in the selected session.</Text>
            )
          ) : (
            <Text type="secondary">Please select a session to view students.</Text>
          )}

          <Form.Item style={{ marginTop: 20 }}>
            <Button type="primary" htmlType="submit" loading={loading} block disabled={selectedStudentIds.length === 0}>
              Generate Bed Fees for {selectedStudentIds.length} Selected Student(s)
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for session-wide bulk creation of bed fees */}
      <Modal
        title="Bulk Create Bed Fees (Session-wide)"
        open={isBulkModalVisible}
        onCancel={() => {
          setIsBulkModalVisible(false);
          bulkForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={bulkForm}
          layout="vertical"
          onFinish={handleCreateBulkBedFees}
          initialValues={{
            month: moment().month() + 1,
            year: moment().year(),
            session_id: sessions.length > 0 ? sessions[0].id : undefined,
          }}
        >
          <Form.Item
            name="session_id"
            label="Session"
            rules={[{ required: true, message: 'Please select a session' }]}
          >
            <Select
              placeholder="Select session"
            >
              {sessions.map(session => (
                <Option key={session.id} value={session.id}>
                  {session.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="Amount (₹)"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <Input type="number" min={0} step={0.01} prefix="₹" placeholder="Amount" />
          </Form.Item>
          <Form.Item name="month" label="Month" rules={[{ required: true }]}>
            <Select placeholder="Select month">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <Option key={month} value={month}>
                  {moment().month(month - 1).format('MMMM')}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="year" label="Year" rules={[{ required: true }]}>
            <Select placeholder="Select year">
              {Array.from({ length: 5 }, (_, i) => moment().year() - 2 + i).map(year => (
                <Option key={year} value={year}>{year}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Description (Optional)" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Create Bed Fees for All Eligible Students in Session
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BedFeeManagement;
