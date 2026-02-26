import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, Divider, Skeleton, Badge, 
  Tag, Modal, Input, Empty, message, Form, InputNumber, Table, Segmented, Tooltip, Select, FloatButton
} from 'antd';
import { 
  Bed, Plus, Users, AlertCircle, Edit3, Trash2, RefreshCw, LayoutGrid, Info, Inbox, 
  Settings2, Activity, List, AlignJustify, Maximize, Square, Hash, ClipboardList, Building 
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ManageRoomTypes = ({ isTabbed }) => {
  const [form] = Form.useForm();
  const [roomTypes, setRoomTypes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);
  const [viewMode, setViewMode] = useState('tiles');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, hostelsRes] = await Promise.all([
        adminAPI.getRoomTypes(),
        adminAPI.getHostels()
      ]);
      setRoomTypes(typesRes.data.data || []);
      setHostels(hostelsRes.data.data || []);
    } catch (error) {
      message.error('Registry sync failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleFinish = async (values) => {
    setBtnLoading(true);
    try {
      if (editingId) {
        await adminAPI.updateRoomType(editingId, values);
        message.success('Inventory updated.');
      } else {
        await adminAPI.createRoomType(values);
        message.success('New template deployed.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error(error.message || 'Action failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Void Room Type?',
      content: 'This will remove the room configuration from the registry.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await adminAPI.deleteRoomType(id);
          message.success('Entry purged.');
          fetchData();
        } catch (e) { message.error('Deletion failed.'); }
      }
    });
  };

  return (
    <div className={isTabbed ? "p-4" : "p-8 bg-slate-50 min-h-screen"}>
      {isTabbed && (
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
           <Text strong className="text-slate-600 uppercase text-[11px] tracking-widest">Classification Templates</Text>
           <Button type="primary" icon={<Plus size={18}/>} onClick={() => handleOpenModal()} className="rounded-xl px-6 h-10 border-none shadow-lg shadow-blue-100">
             Add Type
           </Button>
        </div>
      )}

      {loading ? <Skeleton active /> : (
        <Row gutter={[20, 20]}>
          {roomTypes.map(type => (
            <Col xs={24} md={12} lg={8} key={type.id}>
              {/* Changed bordered={false} to variant and fixed styling */}
              <Card bordered={false} className="rounded-2xl shadow-sm border-l-4 border-l-blue-500">
                <div className="flex justify-between">
                  <Text strong className="text-lg">{type.name}</Text>
                  <Space>
                    <Edit3 size={16} className="cursor-pointer text-slate-400" onClick={() => handleOpenModal(type)} />
                    <Trash2 size={16} className="cursor-pointer text-rose-400" onClick={() => handleDelete(type.id)} />
                  </Space>
                </div>
                <div className="mt-2">
                  <Tag color="blue">{type.capacity} max</Tag>
                  <Tag color="cyan">{hostels.find(h => h.id === type.hostel_id)?.name || 'N/A'}</Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={editingId ? 'Modify Template' : 'Register Template'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={450}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Form.Item name="hostel_id" label="Assign to Hostel" rules={[{ required: true }]}>
            <Select placeholder="Select Hostel" variant="filled">
              {hostels.map(h => <Select.Option key={h.id} value={h.id}>{h.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="Template Label" rules={[{ required: true }]}>
            <Input placeholder="e.g., Executive Suite" variant="filled" />
          </Form.Item>
          <Form.Item name="capacity" label="max Capacity" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" variant="filled" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} variant="filled" />
          </Form.Item>
          <Button type="primary" block htmlType="submit" loading={btnLoading} className="h-10 rounded-lg">
            {editingId ? 'Update' : 'Deploy'}
          </Button>
        </Form>
      </Modal>

      <FloatButton icon={<Plus />} type="primary" onClick={() => handleOpenModal()} />
    </div>
  );
};

export default ManageRoomTypes;