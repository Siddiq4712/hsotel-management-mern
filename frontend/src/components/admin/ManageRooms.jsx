import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, Badge, Tag, Modal, Input, Empty, message, Form, InputNumber, Select, FloatButton, Skeleton
} from 'antd';
import { Bed, Plus, Edit3, Trash2, Building, DoorOpen, Info } from 'lucide-react';
import { adminAPI } from '../../services/api';

const { Text, Title } = Typography;

const ManageRooms = ({ isTabbed }) => {
  const [form] = Form.useForm();
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, hostelsRes, typesRes] = await Promise.all([
        adminAPI.getRooms(),
        adminAPI.getHostels(),
        adminAPI.getRoomTypes()
      ]);
      setRooms(roomsRes.data.data || []);
      setHostels(hostelsRes.data.data || []);
      setRoomTypes(typesRes.data.data || []);
    } catch (error) {
      message.error('Sync failed.');
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
        await adminAPI.updateRoom(editingId, values);
        message.success('Asset updated.');
      } else {
        await adminAPI.createRoom(values);
        message.success('Room registered.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error(error.message || 'Action failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div className={isTabbed ? "p-4" : "p-8 bg-slate-50 min-h-screen"}>
      {/* 1. Header Add Button (Tabbed Mode) */}
      {isTabbed && (
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
           <Text strong className="text-slate-600 uppercase text-[11px] tracking-widest">Physical Unit Inventory</Text>
           <Button type="primary" icon={<Plus size={18}/>} onClick={() => handleOpenModal()} className="rounded-xl px-6 h-10 border-none shadow-lg shadow-blue-100">
             Register Room
           </Button>
        </div>
      )}

      {loading ? <Skeleton active /> : (
        <Row gutter={[20, 20]}>
          {rooms.map(room => (
            <Col xs={24} md={12} lg={8} key={room.id}>
              <Card className={`rounded-2xl border-none shadow-sm border-l-4 ${room.is_occupied ? 'border-l-rose-400' : 'border-l-emerald-400'}`}>
                <div className="flex justify-between">
                  <Title level={5}>Room {room.room_number}</Title>
                  <Space>
                    <Edit3 size={16} className="cursor-pointer" onClick={() => handleOpenModal(room)} />
                    <Trash2 size={16} className="cursor-pointer text-rose-500" />
                  </Space>
                </div>
                <Text type="secondary">{room.Hostel?.name} • Floor {room.floor}</Text>
                <div className="mt-3 flex justify-between items-center">
                  <Tag color="blue">{room.RoomType?.name}</Tag>
                  <Badge status={room.is_occupied ? "error" : "success"} text={room.is_occupied ? "Occupied" : "Available"} />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title={editingId ? 'Modify Room' : 'Add Room'} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} centered>
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hostel_id" label="Hostel" rules={[{ required: true }]}>
                <Select placeholder="Select Hostel">
                  {hostels.map(h => <Select.Option key={h.id} value={h.id}>{h.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="room_type_id" label="Room Type" rules={[{ required: true }]}>
                <Select placeholder="Select Type">
                  {roomTypes.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="room_number" label="Room Number" rules={[{ required: true }]}>
            <Input placeholder="e.g., A-101" />
          </Form.Item>
          <Form.Item name="floor" label="Floor" rules={[{ required: true }]}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Button type="primary" block htmlType="submit" loading={btnLoading} className="h-10 rounded-lg">
            Confirm Room
          </Button>
        </Form>
      </Modal>

      {/* 2. Floating Add Button */}
      <FloatButton icon={<Plus />} type="primary" onClick={() => handleOpenModal()} tooltip="Quick Register" />
    </div>
  );
};

export default ManageRooms;