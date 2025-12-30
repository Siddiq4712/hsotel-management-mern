import React, { useState } from 'react';
import { 
  Card, Form, Input, Select, DatePicker, Button, 
  Typography, Row, Col, Space, Divider, message, 
  ConfigProvider, theme, Alert 
} from 'antd';
import { 
  Calendar, FileText, Send, RefreshCw, 
  Info, ClipboardList, Clock, ShieldCheck 
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ApplyLeave = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState({ days: 0 });

  // Watch for date changes to calculate duration preview
  const handleValuesChange = (_, allValues) => {
    if (allValues.dates && allValues.dates[0] && allValues.dates[1]) {
      const diff = allValues.dates[1].diff(allValues.dates[0], 'days') + 1;
      setPreviewData({ days: diff });
    } else {
      setPreviewData({ days: 0 });
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        leave_type: values.leave_type,
        from_date: values.dates[0].format('YYYY-MM-DD'),
        to_date: values.dates[1].format('YYYY-MM-DD'),
        reason: values.reason
      };

      await studentAPI.applyLeave(payload);
      message.success('Leave application submitted for approval');
      form.resetFields();
      setPreviewData({ days: 0 });
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Leave Application</Title>
              <Text type="secondary">Submit your absence request for administrative approval</Text>
            </div>
          </div>
        </div>

        <Row gutter={24}>
          {/* Left Column: Form Details */}
          <Col lg={14} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] p-2">
              <Form 
                form={form} 
                layout="vertical" 
                onFinish={onFinish}
                onValuesChange={handleValuesChange}
                initialValues={{ leave_type: 'casual' }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="leave_type" label={<Text strong>Leave Category</Text>} rules={[{ required: true }]}>
                      <Select className="h-11" placeholder="Select type">
                        <Option value="casual">Casual Leave</Option>
                        <Option value="sick">Medical/Sick Leave</Option>
                        <Option value="emergency">Emergency Leave</Option>
                        <Option value="vacation">Semester Vacation</Option>
                        <Option value="other">Institutional/OD</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="dates" label={<Text strong>Duration</Text>} rules={[{ required: true }]}>
                      <DatePicker.RangePicker 
                        className="w-full h-11 rounded-xl" 
                        disabledDate={(current) => current && current < moment().startOf('day')}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="reason" label={<Text strong>Detailed Reason</Text>} rules={[{ required: true, min: 10 }]}>
                  <TextArea rows={5} placeholder="Provide a clear explanation for your leave request..." className="rounded-xl" />
                </Form.Item>

                <Divider className="my-6 border-slate-100" />

                <div className="flex gap-4">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large" 
                    loading={loading} 
                    icon={<Send size={18} />}
                    className="h-14 rounded-2xl shadow-lg shadow-blue-100 font-bold flex-1"
                  >
                    Submit Application
                  </Button>
                  <Button 
                    size="large" 
                    icon={<RefreshCw size={18} />} 
                    onClick={() => { form.resetFields(); setPreviewData({ days: 0 }); }}
                    className="h-14 rounded-2xl px-8"
                  >
                    Reset
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>

          {/* Right Column: Preview & Policy */}
          <Col lg={10} xs={24}>
            <div className="space-y-6">
              {/* Request Summary Card */}
              <Card className="border-none shadow-sm rounded-[32px] bg-blue-600 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <Title level={4} className="text-white mb-6 flex items-center gap-2">
                    <ClipboardList size={20} /> Application Summary
                  </Title>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-blue-400 pb-3 text-blue-50">
                      <Text className="text-blue-100">Total Duration</Text>
                      <Text strong className="text-white text-lg">{previewData.days} Days</Text>
                    </div>
                    <div className="flex justify-between items-center border-b border-blue-400 pb-3 text-blue-50">
                      <Text className="text-blue-100">Auto-Deduction</Text>
                      <Text strong className="text-white text-lg">
                        {previewData.days > 0 ? `₹${(previewData.days * 120).toFixed(2)}` : '₹0.00'}
                      </Text>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-3 bg-blue-500/30 p-4 rounded-2xl border border-blue-400/50">
                    <Info size={20} className="shrink-0" />
                    <Text className="text-[11px] text-blue-50 leading-relaxed">
                      Mess reduction is automatically calculated based on your approved leave dates. Ensure your return is marked on time.
                    </Text>
                  </div>
                </div>
                {/* Decorative background element */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-400 rounded-full opacity-20" />
              </Card>

              {/* Approval Notice */}
              <Alert
                message={<Text strong className="text-slate-800">Policy Notice</Text>}
                description={
                  <ul className="text-[12px] text-slate-500 list-disc pl-4 mt-1 space-y-1">
                    <li>Medical leaves require supporting documentation upon return.</li>
                    <li>Casual leaves must be submitted 24 hours in advance.</li>
                    <li>Approval status can be tracked in your reduction history.</li>
                  </ul>
                }
                type="info"
                showIcon
                icon={<ShieldCheck className="text-blue-500" size={20} />}
                className="rounded-3xl border-blue-100 bg-white shadow-sm"
              />
            </div>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default ApplyLeave;