import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Select, InputNumber, 
  Space, Divider, Typography, message, Popconfirm, ConfigProvider, 
  theme, Skeleton, Tag, Empty 
} from 'antd';
import { Plus, Trash2, Edit2, BookOpen, Save, ChefHat, Scale, Beaker, Search } from 'lucide-react';
import { messAPI } from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RecipeManagement = () => {
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recipeRes, itemRes, uomRes] = await Promise.all([
        messAPI.getRecipes(),
        messAPI.getItems(),
        messAPI.getUOMs()
      ]);
      setRecipes(recipeRes.data.data);
      setItems(itemRes.data.data);
      setUoms(uomRes.data.data);
    } catch (error) {
      message.error("Failed to load recipes");
    } finally {
      // Small timeout to demonstrate skeleton if data is local
      setTimeout(() => setLoading(false), 600);
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      if (editingRecipe) {
        await messAPI.updateRecipe(editingRecipe.id, values);
        message.success('Recipe updated');
      } else {
        await messAPI.createRecipe(values);
        message.success('Recipe created');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error("Operation failed");
      setLoading(false);
    }
  };

  // Pre-mapping columns for Skeleton support
  const columns = [
    { 
      title: 'Dish Name', 
      dataIndex: 'name', 
      render: (t) => loading ? <Skeleton.Input active size="small" /> : <Text strong className="text-slate-700">{t}</Text>
    },
    {
      title: 'Composition (Qty / 1 Person)',
      key: 'ingredients',
      render: (_, record) => loading ? <Skeleton.Button active size="small" block /> : (
        <div className="flex flex-wrap gap-1">
          {record.Ingredients?.map(ing => (
            <Tag key={ing.id} bordered={false} className="bg-slate-100 text-slate-500 rounded-md">
              {ing.ItemDetail?.name}: <span className="text-blue-600 font-bold">{parseFloat(ing.quantity_per_serving).toFixed(2)} {ing.UOMDetail?.abbreviation}</span>
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, record) => loading ? <Skeleton.Avatar active size="small" /> : (
        <Space>
          <Button icon={<Edit2 size={14} />} onClick={() => { setEditingRecipe(record); form.setFieldsValue(record); setIsModalVisible(true); }} />
          <Popconfirm title="Delete Recipe?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<Trash2 size={14} />} danger ghost />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const handleDelete = async (id) => {
    await messAPI.deleteRecipe(id);
    fetchData();
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Recipe Master</Title>
              <Text type="secondary">Standard yield ratios for single person servings</Text>
            </div>
          </div>
          <Button 
            type="primary" size="large" icon={<Plus size={18}/>} 
            onClick={() => { setEditingRecipe(null); form.resetFields(); setIsModalVisible(true); }}
            className="flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            Create Recipe
          </Button>
        </div>

        {/* Search Bar Skeleton */}
        <Card className="mb-6 border-none shadow-sm rounded-2xl">
          <div className="flex items-center gap-4">
            <Search size={18} className="text-slate-400" />
            <Input 
              placeholder="Search recipes..." 
              className="w-full max-w-md rounded-full bg-slate-50 border-slate-200"
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
        </Card>

        {/* Table / Skeleton Rows */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden" bodyStyle={{ padding: 0 }}>
          <Table 
            dataSource={loading ? Array(6).fill({}) : recipes.filter(r => r.name.toLowerCase().includes(searchText.toLowerCase()))} 
            columns={columns} 
            rowKey={(r) => r.id || Math.random()} 
            pagination={loading ? false : { pageSize: 8 }}
          />
        </Card>

        {/* Modal with Skeletons */}
        <Modal
          title={<div className="flex items-center gap-2"><ChefHat size={18} className="text-blue-600" /> {editingRecipe ? "Edit Recipe" : "New Recipe"}</div>}
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          onOk={() => form.submit()}
          width={750}
        >
          {loading && editingRecipe ? (
            <div className="p-4 space-y-4">
              <Skeleton active />
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ) : (
            <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
              <Form.Item name="name" label="Dish Name" rules={[{ required: true }]}><Input placeholder="e.g. Tomato Rice" /></Form.Item>
              <Form.Item name="description" label="Notes"><TextArea rows={2} /></Form.Item>
              
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-4 flex justify-between items-center">
                  <div>
                    <Text strong className="block text-blue-800">Standard Portioning</Text>
                    <Text className="text-blue-600 text-xs italic">Define values for exactly 1 serving.</Text>
                  </div>
                  <Beaker size={20} className="text-blue-300" />
              </div>

              <Form.List name="items">
                {(fields, { add, remove }) => (
                  <div className="space-y-3">
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <Form.Item {...restField} name={[name, 'item_id']} className="mb-0 flex-1" rules={[{ required: true }]}>
                          <Select placeholder="Select Item" showSearch optionFilterProp="children">
                            {items.map(i => <Select.Option key={i.id} value={i.id}>{i.name} (Stock: {parseFloat(i.stock_quantity).toFixed(2)})</Select.Option>)}
                          </Select>
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'quantity_per_serving']} className="mb-0 w-32" rules={[{ required: true }]}>
                          <InputNumber placeholder="Qty" precision={2} step={0.01} className="w-full" />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'unit_id']} className="mb-0 w-24" rules={[{ required: true }]}>
                          <Select placeholder="Unit">
                            {uoms.map(u => <Select.Option key={u.id} value={u.id}>{u.abbreviation}</Select.Option>)}
                          </Select>
                        </Form.Item>
                        <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => remove(name)} />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<Plus size={16} />}>Add Component</Button>
                  </div>
                )}
              </Form.List>
            </Form>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default RecipeManagement;