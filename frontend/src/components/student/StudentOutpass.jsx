import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Tag, Input, Button, Form, DatePicker, 
  message, Tabs, Space, Typography, ConfigProvider, theme, 
  Empty, Descriptions, QRCode
} from 'antd';
import { 
  Send, Clock, CheckCircle, XCircle, AlertTriangle, 
  QrCode, ClipboardList, MapPin, Calendar, RefreshCw
} from 'lucide-react';
import { outpassAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

const StudentOutpass = () => {
  const [activeTab, setActiveTab] = useState('status');
  const [currentOutpass, setCurrentOutpass] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchOutpasses = useCallback(async () => {
    setLoading(true);
    try {
      const [currRes, histRes] = await Promise.all([
        outpassAPI.getCurrentOutpass(),
        outpassAPI.getMyOutpasses()
      ]);
      setCurrentOutpass(currRes.data.data);
      setHistory(histRes.data.data || []);
    } catch (error) {
      message.error('Failed to sync outpass logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOutpasses();
  }, [fetchOutpasses]);

  const handleSubmit = async (values) => {
    const { purpose, destination, duration } = values;
    if (!duration || duration.length < 2) {
      message.error('Please select both exit and expected return times');
      return;
    }

    const from_date = duration[0].toDate();
    const to_date = duration[1].toDate();

    if (from_date >= to_date) {
      message.error('Return time must be after exit time');
      return;
    }

    setSubmitLoading(true);
    try {
      await outpassAPI.createOutpass({
        purpose,
        destination,
        from_date: from_date.toISOString(),
        to_date: to_date.toISOString()
      });
      message.success('Outpass request submitted successfully!');
      form.resetFields();
      setActiveTab('status');
      fetchOutpasses();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentOutpass) return;
    setCancelLoading(true);
    try {
      await outpassAPI.cancelOutpass(currentOutpass.id);
      message.success('Outpass request cancelled');
      fetchOutpasses();
    } catch (error) {
      message.error('Failed to cancel outpass');
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'gold', text: 'PENDING WARDEN', icon: <Clock size={12} /> },
      approved: { color: 'blue', text: 'APPROVED', icon: <CheckCircle size={12} /> },
      rejected: { color: 'magenta', text: 'REJECTED', icon: <XCircle size={12} /> },
      cancelled: { color: 'default', text: 'CANCELLED', icon: <XCircle size={12} /> },
      outside: { color: 'purple', text: 'OUTSIDE HOSTEL', icon: <Send size={12} /> },
      completed: { color: 'green', text: 'COMPLETED', icon: <CheckCircle size={12} /> },
      expired: { color: 'red', text: 'EXPIRED', icon: <AlertTriangle size={12} /> },
      late_return: { color: 'red', text: 'LATE RETURN', icon: <AlertTriangle size={12} /> }
    };
    const details = statusMap[status] || { color: 'default', text: String(status).toUpperCase() };
    return (
      <Tag color={details.color} className="flex items-center gap-1 w-fit px-2.5 py-0.5 rounded-full font-bold text-[10px] border-none">
        {details.icon}
        {details.text}
      </Tag>
    );
  };

  const columns = [
    { title: 'Purpose', dataIndex: 'purpose', key: 'purpose', render: (val) => <Text strong>{val}</Text> },
    { title: 'Destination', dataIndex: 'destination', key: 'destination' },
    { title: 'Exit Schedule', dataIndex: 'from_date', key: 'from_date', render: (d) => moment(d).format('lll') },
    { title: 'Return Expectation', dataIndex: 'to_date', key: 'to_date', render: (d) => moment(d).format('lll') },
    { title: 'Gate Exit Log', dataIndex: 'exit_time', key: 'exit_time', render: (d) => d ? moment(d).format('lll') : <Text type="secondary" className="italic text-xs">Not left</Text> },
    { title: 'Gate Return Log', dataIndex: 'return_time', key: 'return_time', render: (d) => d ? moment(d).format('lll') : <Text type="secondary" className="italic text-xs">Not returned</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => getStatusTag(s) }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#3b82f6', borderRadius: 16 } }}>
      <div className="bg-slate-50 min-h-screen p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 text-white">
              <QrCode size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Gate Outpass Console</Title>
              <Text type="secondary">Submit outpass permit requests and retrieve secure gate pass QR codes</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16} />} onClick={fetchOutpasses} loading={loading} className="h-11 rounded-xl flex items-center gap-2 border-slate-200">
            Sync Logs
          </Button>
        </div>

        <Card className="border-none shadow-sm rounded-3xl p-6 bg-white">
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            {
              key: 'status',
              label: 'Active Outpass & QR Code',
              children: (
                <div className="py-4">
                  {currentOutpass ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                      
                      {/* Left: Outpass Info */}
                      <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                          <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                            <Text className="text-slate-500 font-semibold uppercase text-xs tracking-wider">Outpass Details</Text>
                            {getStatusTag(currentOutpass.status)}
                          </div>
                          
                          <Descriptions column={1} size="small" bordered={false}>
                            <Descriptions.Item label={<Text type="secondary" className="flex items-center gap-1.5"><ClipboardList size={14}/> Purpose</Text>}>
                              <Text strong className="text-slate-800">{currentOutpass.purpose}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={<Text type="secondary" className="flex items-center gap-1.5"><MapPin size={14}/> Destination</Text>}>
                              <Text strong className="text-slate-800">{currentOutpass.destination}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={<Text type="secondary" className="flex items-center gap-1.5"><Calendar size={14}/> Schedule Exit</Text>}>
                              <Text className="text-slate-700">{moment(currentOutpass.from_date).format('lll')}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label={<Text type="secondary" className="flex items-center gap-1.5"><Calendar size={14}/> Expected Return</Text>}>
                              <Text className="text-slate-700">{moment(currentOutpass.to_date).format('lll')}</Text>
                            </Descriptions.Item>
                          </Descriptions>
                        </div>

                        {currentOutpass.status === 'pending' && (
                          <Button danger type="primary" onClick={handleCancel} loading={cancelLoading} className="h-12 w-full rounded-xl font-bold flex items-center justify-center gap-2">
                            <XCircle size={16} /> Cancel Outpass Request
                          </Button>
                        )}
                      </div>

                      {/* Right: QR Code Visualizer */}
                      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-100 rounded-3xl">
                        {(currentOutpass.status === 'approved' || currentOutpass.status === 'outside') && currentOutpass.qr_token ? (
                          <div className="text-center space-y-4">
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 w-fit mx-auto">
                              <QRCode value={currentOutpass.qr_token} size={180} />
                            </div>
                            <Text strong className="text-blue-600 block">Outpass Token Ready</Text>
                            <Paragraph className="text-slate-400 text-xs max-w-sm">
                              Present this QR code to the gate security officer on exit and return. 
                              The officer will scan this code to record logs automatically.
                            </Paragraph>
                          </div>
                        ) : (
                          <div className="text-center p-6 space-y-3">
                            <Clock size={48} className="text-amber-500 mx-auto" />
                            <Text strong className="text-slate-700 block">Awaiting Warden Authorization</Text>
                            <Text className="text-slate-400 text-xs max-w-sm block">
                              Your permit QR code will be generated dynamically once the warden approves this request.
                            </Text>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <Empty description={
                      <div className="text-center space-y-2">
                        <Text type="secondary">No active outpass permits found.</Text>
                        <Button type="primary" onClick={() => setActiveTab('request')} className="bg-blue-600 hover:bg-blue-700 h-10 rounded-xl block mx-auto mt-4">
                          Create Outpass Request
                        </Button>
                      </div>
                    } />
                  )}
                </div>
              )
            },
            {
              key: 'request',
              label: 'New Permit Request',
              children: (
                <div className="max-w-2xl mx-auto py-6">
                  {currentOutpass ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-800">
                      <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                      <div>
                        <Text strong className="text-amber-900 block">Active Request Limit Exceeded</Text>
                        <Text className="text-xs">
                          You cannot create a new outpass request while you have a pending or active outpass. 
                          Please wait until your current outpass is completed or cancel the pending one.
                        </Text>
                      </div>
                    </div>
                  ) : (
                    <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
                      <Form.Item name="purpose" label={<Text strong>Purpose of Leaving</Text>} rules={[{ required: true, message: 'Please specify leaving purpose' }]}>
                        <Input placeholder="e.g. Weekend home visit, medical checkout" className="h-11 rounded-xl" />
                      </Form.Item>
                      
                      <Form.Item name="destination" label={<Text strong>Destination Place</Text>} rules={[{ required: true, message: 'Please specify destination' }]}>
                        <Input placeholder="e.g. Madurai, Salem" className="h-11 rounded-xl" />
                      </Form.Item>

                      <Form.Item name="duration" label={<Text strong>Outpass Date & Time Range</Text>} rules={[{ required: true, message: 'Select permit range' }]}>
                        <DatePicker.RangePicker showTime format="YYYY-MM-DD HH:mm" className="h-11 w-full rounded-xl" />
                      </Form.Item>

                      <Button type="primary" htmlType="submit" loading={submitLoading} className="bg-blue-600 hover:bg-blue-700 h-12 w-full rounded-xl font-bold mt-4">
                        Submit Permit Request
                      </Button>
                    </Form>
                  )}
                </div>
              )
            },
            {
              key: 'history',
              label: 'Outpass History',
              children: (
                <Table 
                  columns={columns} 
                  dataSource={history} 
                  rowKey="id" 
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  className="mt-4"
                />
              )
            }
          ]} />
        </Card>

      </div>
    </ConfigProvider>
  );
};

export default StudentOutpass;
