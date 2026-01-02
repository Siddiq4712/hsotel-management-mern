import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Tag, Space, Typography, 
  Modal, Input, Select, message, Popconfirm, Tooltip 
} from 'antd';
import { 
  Percent, Search, Filter, CheckCircle, XCircle, 
  Calendar, User, FileText, RefreshCw, Info 
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const ManageRebates = () => {
  const [rebates, setRebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRebates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getRebates({ status: statusFilter });
      setRebates(response.data.data || []);
    } catch (error) {
      message.error('Failed to sync rebate records');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchRebates(); }, [fetchRebates]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await wardenAPI.updateRebateStatus(id, { status });
      message.success(`Rebate ${status} successfully`);
      fetchRebates();
    } catch (error) {
      message.error(error.message);
    }
  };

  const filteredData = rebates.filter(item => 
    item.RebateStudent?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.RebateStudent?.roll_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      title: 'Student Detail',
      key: 'student',
      render: (_, r) => (
        <Space>
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <User size={18} />
          </div>
          <div className="flex flex-col">
            <Text strong>{r.RebateStudent?.username}</Text>
            <Text type="secondary" className="text-xs uppercase">{r.RebateStudent?.roll_number}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Rebate Type',
      dataIndex: 'rebate_type',
      render: (type) => (
        <Tag color="blue" className="rounded-full px-3 uppercase text-[10px] font-bold">
          {type}
        </Tag>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (amt) => <Text strong className="text-green-600">₹{parseFloat(amt).toLocaleString()}</Text>
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, r) => (
        <div className="flex flex-col text-xs text-slate-500">
          <span><Calendar size={12} className="inline mr-1"/> {moment(r.from_date).format('DD MMM')}</span>
          <span>to {moment(r.to_date).format('DD MMM YYYY')}</span>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => {
        let color = status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'gold';
        return <Tag color={color} className="rounded-full uppercase text-[10px] font-bold">{status}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, r) => r.status === 'pending' && (
        <Space>
          <Popconfirm title="Approve this rebate?" onConfirm={() => handleStatusUpdate(r.id, 'approved')}>
            <Button size="small" type="primary" ghost icon={<CheckCircle size={14} />} className="flex items-center gap-1 rounded-md">
              Approve
            </Button>
          </Popconfirm>
          <Popconfirm title="Reject this rebate?" onConfirm={() => handleStatusUpdate(r.id, 'rejected')} okType="danger">
            <Button size="small" danger ghost icon={<XCircle size={14} />} className="flex items-center gap-1 rounded-md">
              Reject
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Percent className="text-white" size={24} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Rebate Management</Title>
            <Text type="secondary">Review and approve student rebate requests for mess and hostel fees</Text>
          </div>
        </div>
        <Button 
          icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} 
          onClick={fetchRebates}
          className="rounded-xl"
        >
          Refresh
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><FileText size={20}/></div>
            <div>
              <Text type="secondary" className="block text-xs uppercase font-bold tracking-wider">Pending Requests</Text>
              <Title level={3} style={{ margin: 0 }}>{rebates.filter(r => r.status === 'pending').length}</Title>
            </div>
          </div>
        </Card>
        {/* Add more stats as needed */}
      </div>

      {/* Toolbar */}
      <Card className="border-none shadow-sm rounded-2xl">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md">
            <Search size={18} className="text-slate-300" />
            <Input 
              placeholder="Search by student name or roll number..." 
              bordered={false} 
              className="font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Space size="middle">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <Select 
                value={statusFilter} 
                onChange={setStatusFilter}
                className="w-40"
                variant="filled"
              >
                <Option value="all">All Status</Option>
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="rejected">Rejected</Option>
              </Select>
            </div>
          </Space>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-sm rounded-[24px] overflow-hidden" bodyStyle={{ padding: 0 }}>
        <Table 
          columns={columns} 
          dataSource={filteredData} 
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender: record => (
              <div className="p-4 bg-slate-50 rounded-lg">
                <Text strong className="text-xs text-indigo-600 block mb-2 uppercase tracking-widest">Reason for Rebate:</Text>
                <p className="text-slate-600 italic m-0">"{record.reason}"</p>
                {record.status !== 'pending' && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Text type="secondary" className="text-xs">
                      Processed by: <Text strong>{record.RebateApprovedBy?.username || 'System'}</Text>
                    </Text>
                  </div>
                )}
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default ManageRebates;