import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Tag, Space, Typography, 
  Modal, Form, Input, DatePicker, Select, message, Empty, Divider, ConfigProvider, theme 
} from 'antd';
import { 
  Percent, Plus, History, Info, CheckCircle, Clock, ArrowUpRight
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StudentRebates = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [rebates, setRebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchMyRebates = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyRebates();
      setRebates(response.data.data || []);
    } catch (error) {
      messageApi.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyRebates(); }, []);

  const onFinish = async (values) => {
    try {
      const data = {
        rebate_type: values.rebate_type,
        from_date: values.dates[0].format('YYYY-MM-DD'),
        to_date: values.dates[1].format('YYYY-MM-DD'),
        reason: values.reason
      };
      await studentAPI.applyRebate(data);
      messageApi.success('Application submitted successfully');
      setIsModalOpen(false);
      form.resetFields();
      fetchMyRebates();
    } catch (error) {
      messageApi.error(error.response?.data?.message || 'Submission failed');
    }
  };

  const columns = [
    {
      title: 'Category',
      dataIndex: 'rebate_type',
      render: (t) => <Tag color="blue" className="rounded-full px-3 font-bold uppercase text-[9px] border-none">{t}</Tag>
    },
    {
      title: 'Absence Duration',
      key: 'period',
      render: (_, r) => (
        <div className="flex flex-col">
          <Text strong className="text-slate-700">
            {moment(r.from_date).format('DD MMM')} — {moment(r.to_date).format('DD MMM')}
          </Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase">
            {moment(r.to_date).diff(moment(r.from_date), 'days') + 1} Total Days
          </Text>
        </div>
      )
    },
    {
      title: 'Application Status',
      dataIndex: 'status',
      render: (s) => (
        <Tag color={s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'gold'} 
             className="rounded-full px-3 font-bold uppercase text-[9px] border-none">
          {s}
        </Tag>
      )
    },
    {
      title: 'Amount Credited',
      dataIndex: 'amount',
      align: 'right',
      render: (amt, r) => r.status === 'approved' ? (
        <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-100 inline-block">
          <Text strong className="text-green-600 font-black">₹{parseFloat(amt).toFixed(2)}</Text>
        </div>
      ) : <Text className="text-slate-300">—</Text>
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      {contextHolder}
      <div className="p-8 bg-slate-50 min-h-screen space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Percent className="text-white" size={24} />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>Absence Credits</Title>
              <Text type="secondary">Claim credits for mess/hostel fees during approved absence</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<Plus size={18}/>} 
            onClick={() => setIsModalOpen(true)}
            className="h-12 rounded-2xl px-6 font-bold bg-blue-600 border-none flex items-center gap-2"
          >
            Apply Now
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl flex gap-4">
          <Info className="text-blue-500 shrink-0" size={22} />
          <div>
            <Text strong className="text-blue-800 block">Calculation Logic</Text>
            <Text className="text-blue-600 text-sm">
              Rebates are calculated using the <b>Daily Man-Day Rate</b> finalized by the mess council for that specific month.
            </Text>
          </div>
        </div>

        <Card 
          className="border-none shadow-sm rounded-[32px] overflow-hidden" 
          bodyStyle={{ padding: 0 }}
          title={<div className="flex items-center gap-2 px-2 py-2"><History size={18} className="text-blue-600"/><Text strong>Previous Requests</Text></div>}
        >
          <Table 
            columns={columns} 
            dataSource={rebates} 
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 6, position: ['bottomCenter'] }}
            expandable={{
              expandedRowRender: r => (
                <div className="p-4 bg-slate-50 rounded-xl m-2 border border-slate-100">
                  <Text type="secondary" className="text-[10px] uppercase font-bold block mb-1">My Reason:</Text>
                  <Text className="italic text-slate-600">"{r.reason}"</Text>
                </div>
              )
            }}
          />
        </Card>

        <Modal
          title={<div className="flex items-center gap-2"><ArrowUpRight size={20} className="text-blue-600"/> Request Rebate</div>}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          centered
          className="rounded-[32px]"
          width={500}
        >
          <Form form={form} layout="vertical" onFinish={onFinish} className="mt-6">
            <Form.Item name="rebate_type" label={<Text strong className="text-slate-500 uppercase text-[10px] tracking-widest">Category</Text>} rules={[{ required: true }]}>
              <Select placeholder="Choose rebate type" className="h-12 rounded-xl" options={[
                { value: 'mess', label: 'Mess Bill Credit' },
                { value: 'hostel', label: 'Hostel Fee Credit' },
                { value: 'other', label: 'Institutional Credit' },
              ]} />
            </Form.Item>

            <Form.Item name="dates" label={<Text strong className="text-slate-500 uppercase text-[10px] tracking-widest">Absence Period</Text>} rules={[{ required: true }]}>
              <RangePicker className="w-full h-12 rounded-xl" />
            </Form.Item>

            <Form.Item name="reason" label={<Text strong className="text-slate-500 uppercase text-[10px] tracking-widest">Reason / Justification</Text>} rules={[{ required: true, min: 10 }]}>
              <Input.TextArea rows={4} placeholder="e.g. Mandatory Internship, Family Emergency..." className="rounded-xl" />
            </Form.Item>

            <div className="flex gap-4 mt-8">
              <Button block className="h-12 rounded-2xl" onClick={() => setIsModalOpen(false)}>Discard</Button>
              <Button block type="primary" htmlType="submit" className="h-12 rounded-2xl bg-blue-600 font-bold border-none shadow-lg shadow-blue-100">
                Submit Request
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default StudentRebates;