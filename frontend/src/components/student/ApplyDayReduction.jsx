import React, { useState } from 'react';
import { 
  Card, Form, Input, DatePicker, Button, Typography, 
  Row, Col, Space, Divider, message, ConfigProvider, 
  theme, Alert, Statistic 
} from 'antd';
import { 
  CalendarDays, Send, RefreshCw, Info, 
  Clock, ShieldCheck, Calculator, AlertTriangle 
} from 'lucide-react';
import moment from 'moment';
import { studentAPI } from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ApplyDayReduction = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewDays, setPreviewDays] = useState(0);

  // --- Calculate Day Difference for UI Feedback ---
  const handleValuesChange = (_, allValues) => {
    if (allValues.dates && allValues.dates[0] && allValues.dates[1]) {
      const diff = allValues.dates[1].diff(allValues.dates[0], 'days') + 1;
      setPreviewDays(diff > 0 ? diff : 0);
    } else {
      setPreviewDays(0);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    const payload = {
      from_date: values.dates[0].format('YYYY-MM-DD'),
      to_date: values.dates[1].format('YYYY-MM-DD'),
      reason: values.reason
    };

    try {
      await studentAPI.applyDayReduction(payload);
      message.success('Day reduction request submitted for admin review');
      form.resetFields();
      setPreviewDays(0);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to submit request');
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
              <Clock className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Day Reduction</Title>
              <Text type="secondary">Request a rebate on mess charges for scheduled absences</Text>
            </div>
          </div>
        </div>

        <Row gutter={24}>
          {/* Form Side */}
          <Col lg={14} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] p-2">
              <Form 
                form={form} 
                layout="vertical" 
                onFinish={onFinish}
                onValuesChange={handleValuesChange}
              >
                <Form.Item 
                  name="dates" 
                  label={<Text strong>Reduction Period</Text>} 
                  rules={[{ required: true, message: 'Please select dates' }]}
                >
                  <DatePicker.RangePicker 
                    className="w-full h-12 rounded-xl" 
                    format="YYYY-MM-DD"
                    disabledDate={(current) => current && current < moment().startOf('day')}
                  />
                </Form.Item>

                <Form.Item 
                  name="reason" 
                  label={<Text strong>Justification</Text>} 
                  rules={[{ required: true, min: 10, message: 'Please provide a detailed reason' }]}
                >
                  <TextArea 
                    rows={5} 
                    placeholder="Describe why you are requesting reduction (e.g. Internship, Medical, Family event)..." 
                    className="rounded-xl p-4" 
                  />
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
                    Submit Request
                  </Button>
                  <Button 
                    size="large" 
                    icon={<RefreshCw size={18} />} 
                    onClick={() => { form.resetFields(); setPreviewDays(0); }}
                    className="h-14 rounded-2xl px-8"
                  >
                    Reset
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>

          {/* Info Side */}
          <Col lg={10} xs={24}>
            <div className="space-y-6">
              {/* Live Preview Card */}
              <Card className="border-none shadow-sm rounded-[32px] bg-blue-600 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <Title level={4} className="text-white mb-6 flex items-center gap-2">
                    <Calculator size={20} /> Impact Preview
                  </Title>
                  
                  <div className="space-y-6">
                    <Statistic 
                      title={<span className="text-blue-100 text-xs uppercase font-bold tracking-widest">Total Days Saved</span>}
                      value={previewDays}
                      valueStyle={{ color: 'white', fontWeight: 900, fontSize: '2.5rem' }}
                      suffix={<span className="text-lg opacity-60 ml-2">Days</span>}
                    />
                    
                    <div className="bg-blue-500/30 p-4 rounded-2xl border border-blue-400/50 flex items-center gap-3">
                      <Info size={20} className="text-blue-100" />
                      <Text className="text-[11px] text-blue-50 leading-relaxed">
                        Reductions are subject to warden approval. Once approved, these days will be deducted from your monthly mess bill.
                      </Text>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-400 rounded-full opacity-20" />
              </Card>

              {/* Policy Notice */}
              <Alert
                message={<Text strong>Submission Rules</Text>}
                description={
                  <div className="text-[12px] text-slate-500 mt-1 space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldCheck size={14} className="text-emerald-500 mt-0.5" />
                      <span>Requests must be submitted at least 24 hours prior to leave.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 mt-0.5" />
                      <span>Backdated reductions are generally not permitted.</span>
                    </div>
                  </div>
                }
                type="info"
                showIcon
                icon={<Info className="text-blue-500" size={20} />}
                className="rounded-[24px] border-blue-50 bg-white p-4"
              />
            </div>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default ApplyDayReduction;