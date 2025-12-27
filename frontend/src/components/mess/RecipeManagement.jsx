import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Space, Divider, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, CoffeeOutlined, EditOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';

const { Title } = Typography;

const RecipeManagement = () => {
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // 1. ADD THIS MISSING STATE
  const [editingRecipe, setEditingRecipe] = useState(null); 
  
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
      message.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // 2. UPDATED ONFINISH (Handles both Create and Update)
  const onFinish = async (values) => {
    try {
      setLoading(true);
      if (editingRecipe) {
        await messAPI.updateRecipe(editingRecipe.id, values);
        message.success('Recipe updated successfully');
      } else {
        await messAPI.createRecipe(values);
        message.success('Recipe created successfully');
      }
      setIsModalVisible(false);
      setEditingRecipe(null);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. DEFINE THE MISSING FUNCTIONS
  const handleEdit = (record) => {
    setEditingRecipe(record); // Now defined!
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      items: record.Ingredients.map(ing => ({
        item_id: ing.item_id,
        quantity_per_serving: ing.quantity_per_serving,
        unit_id: ing.unit_id
      }))
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteRecipe(id);
      message.success('Recipe deleted');
      fetchData();
    } catch (error) {
      message.error('Delete failed');
    }
  };

  const showCreateModal = () => {
    setEditingRecipe(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const columns = [
    { title: 'Dish Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Ingredients (Per Serving)',
      key: 'ingredients',
      render: (_, record) => (
        record.Ingredients?.map(ing => (
          <div key={ing.id} style={{ fontSize: '12px' }}>
            • {ing.ItemDetail?.name}: {ing.quantity_per_serving} {ing.UOMDetail?.abbreviation}
          </div>
        ))
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          <Popconfirm title="Delete this recipe?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <Card 
        title={<Title level={4}><CoffeeOutlined /> Recipe Master</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>Create Recipe</Button>}
      >
        <Table dataSource={recipes} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={editingRecipe ? "Edit Recipe" : "Create New Recipe"}
        open={isModalVisible}
        onCancel={() => {
            setIsModalVisible(false);
            setEditingRecipe(null);
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Dish Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Sambar" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          
          <Divider orientation="left">Ratio per Single Person</Divider>
          
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline">
                    <Form.Item {...restField} name={[name, 'item_id']} rules={[{ required: true }]}>
                      <Select placeholder="Select Item" style={{ width: 220 }} showSearch optionFilterProp="children">
                        {items.map(i => (
                            <Select.Option key={i.id} value={i.id}>
                                {i.name} ({i.stock_quantity} {i.UOM?.abbreviation})
                            </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    
                    <Form.Item {...restField} name={[name, 'quantity_per_serving']} rules={[{ required: true }]}>
                      <InputNumber placeholder="Qty/Person" step={0.001} precision={3} />
                    </Form.Item>

                    <Form.Item {...restField} name={[name, 'unit_id']} rules={[{ required: true }]}>
                      <Select placeholder="Unit" style={{ width: 100 }}>
                        {uoms.map(u => <Select.Option key={u.id} value={u.id}>{u.abbreviation}</Select.Option>)}
                      </Select>
                    </Form.Item>

                    <DeleteOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Ingredient</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default RecipeManagement;