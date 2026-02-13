import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Modal, Form, Input, Select, InputNumber, 
  Space, Typography, message, Popconfirm, ConfigProvider,Divider, Row,Col, 
  Skeleton, Tag, Tooltip 
} from 'antd';
import { Plus, Trash2, Edit2, BookOpen, ChefHat, Beaker, Search, RefreshCw } from 'lucide-react';
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipeRes, itemRes, uomRes] = await Promise.all([
        messAPI.getRecipes(),
        messAPI.getItems(),
        messAPI.getUOMs()
      ]);
      setRecipes(recipeRes.data.data || []);
      setItems(itemRes.data.data || []);
      setUoms(uomRes.data.data || []);
    } catch (error) {
      console.error(error);
      message.error("Failed to sync recipe data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      // Ensure the payload matches your backend expectation 
      // (Mapping 'items' from form to 'ingredients' if needed)
      const payload = {
        name: values.name,
        description: values.description,
        ingredients: values.items // Mapping Form.List 'items' to 'ingredients'
      };

      if (editingRecipe) {
        await messAPI.updateRecipe(editingRecipe.id, payload);
        message.success('Recipe updated successfully');
      } else {
        await messAPI.createRecipe(payload);
        message.success('New recipe created successfully');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteRecipe(id);
      message.success("Recipe removed");
      fetchData();
    } catch (error) {
      message.error("Delete failed");
    }
  };

  const columns = [
    { 
      title: 'Dish Name', 
      dataIndex: 'name',
      key: 'name',
      render: (t) => <Text strong className="text-slate-800 text-base">{t}</Text>
    },
    {
      title: 'Recipe Composition (Per Serving)',
      key: 'ingredients',
      render: (_, record) => (
        <div className="flex flex-wrap gap-2">
          {(record.Ingredients || record.ingredients || []).map((ing, idx) => (
            <Tag key={idx} color="blue" className="rounded-lg px-2 py-1 border-none bg-blue-50 text-blue-700 font-medium">
              {ing.ItemDetail?.name || 'Item'}: {parseFloat(ing.quantity_per_serving).toFixed(3)} {ing.UOMDetail?.abbreviation}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button 
              icon={<Edit2 size={16} />} 
              onClick={() => { 
                setEditingRecipe(record); 
                // Map Ingredients back to 'items' for Form.List
                form.setFieldsValue({
                  ...record,
                  items: record.Ingredients || record.ingredients
                }); 
                setIsModalVisible(true); 
              }} 
            />
          </Tooltip>
          <Popconfirm title="Delete this recipe?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
            <Button icon={<Trash2 size={16} />} danger ghost />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-10 bg-[#f8fafc] min-h-screen">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <BookOpen className="text-white" size={28} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Recipe Master</Title>
              <Text className="text-slate-500 text-lg">Manage standard ingredient ratios for mess meals</Text>
            </div>
          </div>
          
          <Space size="middle">
            <Button 
              icon={<RefreshCw size={18} />} 
              onClick={fetchData} 
              className="h-12 px-5 rounded-xl border-slate-200"
            />
            <Button 
              type="primary" 
              size="large" 
              icon={<Plus size={20}/>} 
              onClick={() => { 
                setEditingRecipe(null); 
                form.resetFields(); 
                setIsModalVisible(true); 
              }}
              className="h-12 px-8 shadow-lg shadow-blue-200 font-bold flex items-center gap-2 rounded-xl"
            >
              Create New Recipe
            </Button>
          </Space>
        </div>

        {/* --- SEARCH & FILTERS --- */}
        <Card className="mb-8 border-none shadow-sm rounded-3xl">
          <div className="flex items-center gap-4">
            <Search size={20} className="text-slate-400" />
            <Input 
              placeholder="Search by dish name (e.g. Sambar, Dal Tadka)..." 
              variant="borderless"
              className="text-lg w-full"
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
        </Card>

        {/* --- DATA TABLE --- */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden" bodyStyle={{ padding: 0 }}>
          {loading ? (
            <div className="p-10"><Skeleton active paragraph={{ rows: 10 }} /></div>
          ) : (
            <Table 
              dataSource={recipes.filter(r => r.name?.toLowerCase().includes(searchText.toLowerCase()))} 
              columns={columns} 
              rowKey="id" 
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              className="recipe-table"
              locale={{ emptyText: <div className="p-20"><Text type="secondary">No recipes found. Create your first one!</Text></div> }}
            />
          )}
        </Card>

        {/* --- CREATE/EDIT MODAL --- */}
        <Modal
          title={
            <div className="flex items-center gap-3 py-2">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <ChefHat size={20} />
              </div>
              <Text strong className="text-xl">{editingRecipe ? "Update Recipe" : "Configure New Recipe"}</Text>
            </div>
          }
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          onOk={() => form.submit()}
          width={800}
          okText={editingRecipe ? "Update" : "Create Recipe"}
          confirmLoading={loading}
          centered
        >
          <Form form={form} layout="vertical" onFinish={onFinish} className="mt-6">
            <Row gutter={24}>
              <Col span={24}>
                <Form.Item 
                  name="name" 
                  label={<Text strong>Dish Name</Text>} 
                  rules={[{ required: true, message: 'Please enter dish name' }]}
                >
                  <Input placeholder="e.g. Vegetable Biryani" size="large" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label={<Text strong>Preparation Notes / Description</Text>}>
                  <TextArea rows={3} placeholder="Briefly describe the recipe..." />
                </Form.Item>
              </Col>
            </Row>
            
            <Divider />
            
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 mb-6 flex items-start gap-4">
                <Beaker size={24} className="text-amber-500 mt-1" />
                <div>
                  <Text strong className="text-amber-800 block text-base">Ingredient Composition</Text>
                  <Text className="text-amber-700 text-sm">
                    Enter the exact quantity required to serve <strong>one (1) person</strong>. 
                    The system will automatically multiply these values during bulk menu scheduling.
                  </Text>
                </div>
            </div>

            <Form.List name="items">
              {(fields, { add, remove }) => (
                <div className="space-y-4">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 items-start group">
                      <Form.Item 
                        {...restField} 
                        name={[name, 'item_id']} 
                        label="Raw Material"
                        className="mb-0 flex-1" 
                        rules={[{ required: true, message: 'Select item' }]}
                      >
                        <Select placeholder="Choose item" showSearch optionFilterProp="children" size="large">
                          {items.map(i => (
                            <Select.Option key={i.id} value={i.id}>
                              {i.name} <Text type="secondary" style={{ fontSize: 11 }}>(Stock: {parseFloat(i.stock_quantity).toFixed(1)})</Text>
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item 
                        {...restField} 
                        name={[name, 'quantity_per_serving']} 
                        label="Qty / Person"
                        className="mb-0 w-40" 
                        rules={[{ required: true, message: 'Req' }]}
                      >
                        <InputNumber placeholder="0.00" precision={3} step={0.001} size="large" className="w-full" />
                      </Form.Item>

                      <Form.Item 
                        {...restField} 
                        name={[name, 'unit_id']} 
                        label="Unit"
                        className="mb-0 w-32" 
                        rules={[{ required: true, message: 'Req' }]}
                      >
                        <Select placeholder="Unit" size="large">
                          {uoms.map(u => <Select.Option key={u.id} value={u.id}>{u.abbreviation}</Select.Option>)}
                        </Select>
                      </Form.Item>

                      <Button 
                        type="text" 
                        danger 
                        icon={<Trash2 size={20} />} 
                        onClick={() => remove(name)} 
                        className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  ))}
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    block 
                    icon={<Plus size={18} />} 
                    size="large"
                    className="h-14 rounded-2xl border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300"
                  >
                    Add Ingredient Component
                  </Button>
                </div>
              )}
            </Form.List>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default RecipeManagement;