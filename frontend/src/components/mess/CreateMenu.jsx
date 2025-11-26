import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  message,
  Space,
  Typography,
  Divider,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
  Empty,
  Tooltip,
  Modal,
} from "antd";
import {
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  CalculatorOutlined,
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { messAPI } from "../../services/api";
import moment from "moment";

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const mealTypes = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
];

// Debounce utility
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const CreateMenu = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [menus, setMenus] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [menuItems, setMenuItems] = useState([]);
  const [calculationDetails, setCalculationDetails] = useState({});
  const [costCalculation, setCostCalculation] = useState({
    totalCost: 0,
    costPerServing: 0,
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const debouncedSetSearchText = useCallback(
    debounce((value) => setSearchText(value), 300),
    []
  );

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    calculateCosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (item) => item.category_id === selectedCategory
      );
    }
    if (searchText) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (item.tbl_ItemCategory?.name || "")
            .toLowerCase()
            .includes(searchText.toLowerCase())
      );
    }
    return filtered;
  }, [items, selectedCategory, searchText]);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      total: filteredItems.length,
      current: 1,
    }));
  }, [filteredItems]);

  async function fetchMenus() {
    try {
      const response = await messAPI.getMenus();
      setMenus(response.data.data || []);
    } catch (error) {
      message.error("Failed to fetch menus");
    }
  }

  async function fetchItems() {
    setDataLoading(true);
    try {
      const response = await messAPI.getItems();
      setItems(
        (response.data.data || []).map((item) => ({
          ...item,
          quantity: 0,
          preparation_notes: "",
          fifo_price: null,
          multi_batch_price: null,
          multi_batch_breakdown: null,
          average_unit_price: null,
          is_multi_batch: false,
          key: item.id,
        }))
      );
    } catch (error) {
      message.error("Failed to fetch items");
    } finally {
      setDataLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const response = await messAPI.getItemCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      message.error("Failed to fetch categories");
    }
  }

  /**
   * Weighted-average price calculator
   */
  const calculateMultiBatchPrice = async (itemId, requestedQuantity) => {
    try {
      console.log(
        `[CreateMenu] Calculating weighted avg for item ${itemId} (qty ${requestedQuantity})`
      );
      const response = await messAPI.getItemBatches(itemId);
      const batches = (response.data?.data || [])
        .filter(
          (batch) =>
            batch.status === "active" &&
            parseFloat(batch.quantity_remaining) > 0
        )
        .sort(
          (a, b) =>
            new Date(a.purchase_date).getTime() -
            new Date(b.purchase_date).getTime()
        );

      if (!batches.length || requestedQuantity <= 0) {
        return {
          totalCost: 0,
          batchBreakdown: [],
          averageUnitPrice: 0,
          consumedQuantity: 0,
          shortage: requestedQuantity,
        };
      }

      const totalAvailable = batches.reduce(
        (sum, batch) => sum + parseFloat(batch.quantity_remaining),
        0
      );
      const totalValue = batches.reduce(
        (sum, batch) =>
          sum +
          parseFloat(batch.quantity_remaining) * parseFloat(batch.unit_price),
        0
      );

      const averageUnitPrice =
        totalAvailable > 0 ? totalValue / totalAvailable : 0;

      console.log(
        `[CreateMenu] -> totalQty=${totalAvailable.toFixed(
          3
        )}, totalValue=${totalValue.toFixed(2)}, avg=${averageUnitPrice.toFixed(
          4
        )}`
      );

      let remaining = requestedQuantity;
      const batchBreakdown = [];

      for (const batch of batches) {
        if (remaining <= 0) break;

        const availableQty = parseFloat(batch.quantity_remaining);
        const consumeQty = Math.min(remaining, availableQty);

        batchBreakdown.push({
          batch_id: batch.id,
          quantity_used: consumeQty,
          unit_price: parseFloat(batch.unit_price),
          cost: consumeQty * averageUnitPrice, // cost booked at avg
          purchase_date: batch.purchase_date,
        });

        console.log(
          `[CreateMenu]   using ${consumeQty.toFixed(
            3
          )} from batch #${batch.id} (actual price ₹${parseFloat(
            batch.unit_price
          ).toFixed(2)})`
        );
        remaining -= consumeQty;
      }

      const consumedQuantity = requestedQuantity - Math.max(0, remaining);
      const totalCost = consumedQuantity * averageUnitPrice;
      const shortage = Math.max(0, remaining);

      if (shortage > 0) {
        console.warn(
          `[CreateMenu]   !!! shortage => requested ${requestedQuantity}, consumed ${consumedQuantity}`
        );
      }

      return {
        totalCost,
        batchBreakdown,
        averageUnitPrice,
        consumedQuantity,
        shortage,
      };
    } catch (error) {
      console.error(
        `[CreateMenu] Weighted average calculation error for item ${itemId}:`,
        error
      );
      return {
        totalCost: 0,
        batchBreakdown: [],
        averageUnitPrice: 0,
        consumedQuantity: 0,
        shortage: requestedQuantity,
        error: error.message,
      };
    }
  };

  const handleMenuSelect = async (menuId) => {
    if (!menuId) {
      setSelectedMenuId(null);
      form.resetFields();
      resetQuantities();
      setMenuItems([]);
      setCalculationDetails({});
      return;
    }
    setLoading(true);
    try {
      setSelectedMenuId(menuId);
      const resp = await messAPI.getMenuWithItems(menuId);
      const { menu, menu_items } = resp?.data?.data || {};
      form.setFieldsValue({
        name: menu.name,
        meal_type: menu.meal_type,
        description: menu.description,
        estimated_servings: menu.estimated_servings,
        preparation_time: menu.preparation_time,
        date: menu.date ? moment(menu.date) : null,
      });

      const calcDetails = {};
      const updatedItems = await Promise.all(
        items.map(async (item) => {
          const matched = (menu_items || []).find(
            (mi) => mi.item_id === item.id && mi.quantity
          );
          if (matched) {
            const calc = await calculateMultiBatchPrice(
              item.id,
              matched.quantity
            );
            if (matched.quantity > 0) {
              calcDetails[item.id] = {
                requestedQuantity: matched.quantity,
                averageUnitPrice: parseFloat(calc.averageUnitPrice || 0),
                totalCost: parseFloat(calc.totalCost || 0),
                consumedQuantity: calc.consumedQuantity,
                shortage: calc.shortage || 0,
                breakdown: calc.batchBreakdown,
              };
            }
            return {
              ...item,
              quantity: matched.quantity,
              preparation_notes: matched.preparation_notes || "",
              multi_batch_price: calc.totalCost,
              multi_batch_breakdown: calc.batchBreakdown,
              average_unit_price: calc.averageUnitPrice,
              fifo_price:
                calc.batchBreakdown.length > 0
                  ? calc.batchBreakdown[0].unit_price
                  : null,
              is_multi_batch: calc.batchBreakdown.length > 1,
            };
          }
          return {
            ...item,
            quantity: 0,
            preparation_notes: "",
            fifo_price: null,
            multi_batch_price: null,
            multi_batch_breakdown: null,
            average_unit_price: null,
            is_multi_batch: false,
          };
        })
      );
      setItems(updatedItems);
      setCalculationDetails(calcDetails);
      updateMenuItems(updatedItems);
    } catch (error) {
      message.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (itemId, value) => {
    let updatedItems;
    if (value > 0) {
      setDataLoading(true);
      try {
        const idx = items.findIndex((item) => item.id === itemId);
        const currentItem = items[idx];
        const calc = await calculateMultiBatchPrice(itemId, value);

        updatedItems = [...items];
        updatedItems[idx] = {
          ...currentItem,
          quantity: value,
          multi_batch_price: calc.totalCost,
          multi_batch_breakdown: calc.batchBreakdown,
          average_unit_price: calc.averageUnitPrice,
          fifo_price:
            calc.batchBreakdown.length > 0
              ? calc.batchBreakdown[0].unit_price
              : null,
          is_multi_batch: calc.batchBreakdown.length > 1,
        };

        setCalculationDetails((prev) => ({
          ...prev,
          [itemId]: {
            requestedQuantity: value,
            averageUnitPrice: parseFloat(calc.averageUnitPrice || 0),
            totalCost: parseFloat(calc.totalCost || 0),
            consumedQuantity: calc.consumedQuantity,
            shortage: calc.shortage || 0,
            breakdown: calc.batchBreakdown,
          },
        }));
      } catch (error) {
        console.error("Quantity change error", error);
        updatedItems = items.map((item) =>
          item.id === itemId ? { ...item, quantity: value } : item
        );
      } finally {
        setDataLoading(false);
      }
    } else {
      updatedItems = items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: 0,
              fifo_price: null,
              multi_batch_price: null,
              multi_batch_breakdown: null,
              average_unit_price: null,
              is_multi_batch: false,
            }
          : item
      );
      setCalculationDetails((prev) => {
        const clone = { ...prev };
        delete clone[itemId];
        return clone;
      });
    }
    setItems(updatedItems);
    updateMenuItems(updatedItems);
  };

  const handleNotesChange = (itemId, value) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, preparation_notes: value } : item
    );
    setItems(updatedItems);
    updateMenuItems(updatedItems);
  };

  const updateMenuItems = (updatedItems) => {
    const selectedItems = updatedItems
      .filter((item) => item.quantity > 0)
      .map((item) => {
        let totalCost, unitPrice;
        if (
          item.multi_batch_price !== null &&
          item.multi_batch_price !== undefined
        ) {
          totalCost = parseFloat(item.multi_batch_price);
          unitPrice = parseFloat(item.average_unit_price || 0);
        } else {
          const fallback =
            item.fifo_price !== null
              ? parseFloat(item.fifo_price)
              : parseFloat(item.unit_price || 0);
          unitPrice = fallback;
          totalCost = fallback * parseFloat(item.quantity || 0);
        }

        let batchDetails = null;
        if (item.multi_batch_breakdown?.length) {
          batchDetails = item.multi_batch_breakdown
            .map((b) => {
              const actualPrice = parseFloat(b.unit_price ?? unitPrice).toFixed(
                2
              );
              const chargedPrice = parseFloat(
                item.average_unit_price ?? unitPrice
              ).toFixed(2);
              const qty =
                b.quantity_used !== undefined
                  ? b.quantity_used.toFixed(3)
                  : b.quantity?.toFixed(3);
              return `${qty} × ₹${chargedPrice} (batch price ₹${actualPrice})`;
            })
            .join(", ");
        }

        return {
          item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.UOM?.abbreviation || "unit",
          unit_price: unitPrice,
          average_unit_price: item.average_unit_price,
          is_fifo_price: item.fifo_price !== null,
          is_multi_batch: item.is_multi_batch,
          batch_details: batchDetails,
          category: item.tbl_ItemCategory?.name || "N/A",
          preparation_notes: item.preparation_notes || "",
          total_cost: totalCost,
        };
      });

    setMenuItems(selectedItems);
  };

  const calculateCosts = () => {
    const totalCost = menuItems.reduce(
      (sum, item) => sum + (parseFloat(item.total_cost) || 0),
      0
    );
    const estimatedServings = form.getFieldValue("estimated_servings") || 1;
    const costPerServing = totalCost / estimatedServings;
    setCostCalculation({
      totalCost,
      costPerServing,
    });
  };

  const handleSubmit = async () => {
    try {
      const menuValues = await form.validateFields();
      const selectedItems = items.filter((item) => item.quantity > 0);

      if (selectedItems.length === 0) {
        return message.error("Please add at least one ingredient to the menu");
      }

      const insufficientStock = selectedItems.filter(
        (item) => item.quantity > (item.stock_quantity || 0)
      );

      if (insufficientStock.length > 0) {
        const names = insufficientStock.map((item) => item.name).join(", ");
        return message.error(`Insufficient stock for: ${names}`);
      }

      const formattedMenuData = {
        ...menuValues,
        date: menuValues.date
          ? menuValues.date.format("YYYY-MM-DD")
          : undefined,
        items: selectedItems.map((item) => ({
          item_id: item.id,
          quantity: item.quantity,
          unit: item.UOM?.abbreviation || "unit",
          preparation_notes: item.preparation_notes || "",
        })),
      };

      setLoading(true);

      if (selectedMenuId) {
        await messAPI.updateMenuWithItems(selectedMenuId, formattedMenuData);
        message.success("Menu updated successfully");
      } else {
        await messAPI.createMenu(formattedMenuData);
        message.success("Menu created successfully with ingredients!");
      }

      setSelectedMenuId(null);
      form.resetFields();
      resetQuantities();
      setMenuItems([]);
      setCalculationDetails({});
      setCostCalculation({ totalCost: 0, costPerServing: 0 });
      fetchMenus();
    } catch (error) {
      message.error(
        (selectedMenuId ? "Failed to update menu: " : "Failed to create menu: ") +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const resetQuantities = () => {
    const resetItems = items.map((item) => ({
      ...item,
      quantity: 0,
      preparation_notes: "",
      fifo_price: null,
      multi_batch_price: null,
      multi_batch_breakdown: null,
      average_unit_price: null,
      is_multi_batch: false,
    }));
    setItems(resetItems);
    setMenuItems([]);
    setCalculationDetails({});
  };

  const handleDeleteMenu = (menuId) => {
    Modal.confirm({
      title: "Delete Menu",
      content:
        "Are you sure you want to delete this menu? This action cannot be undone.",
      onOk: async () => {
        setLoading(true);
        try {
          await messAPI.deleteMenu(menuId);
          message.success("Menu deleted.");
          fetchMenus();
          setSelectedMenuId(null);
          form.resetFields();
          resetQuantities();
          setMenuItems([]);
        } catch (err) {
          message.error("Failed to delete menu.");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handlePaginationChange = (page, pageSize) => {
    setPagination({ ...pagination, current: page, pageSize });
  };

  const columns = [
    {
      title: "Item Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary">{record.tbl_ItemCategory?.name}</Text>
        </Space>
      ),
    },
    {
      title: "Unit",
      key: "unit",
      width: 80,
      render: (_, record) => record.UOM?.abbreviation || "unit",
    },
    {
      title: "Price/Unit",
      key: "unit_price",
      width: 140,
      render: (_, record) => {
        if (record.multi_batch_price !== null) {
          const avg = parseFloat(record.average_unit_price || 0).toFixed(2);
          const breakdownMessage = record.multi_batch_breakdown
            ?.map((b) => {
              const actual = parseFloat(b.unit_price || avg).toFixed(2);
              const qty =
                b.quantity_used !== undefined
                  ? b.quantity_used.toFixed(3)
                  : b.quantity?.toFixed(3);
              return `Batch #${b.batch_id}: ${qty} @ ₹${actual}`;
            })
            .join("; ");

          return (
            <Tooltip
              title={`Weighted avg ₹${avg}. ${breakdownMessage || ""}`}
            >
              <Text type="success">
                ₹{parseFloat(record.average_unit_price || 0).toFixed(2)}
              </Text>
            </Tooltip>
          );
        }
        if (record.fifo_price !== null) {
          return (
            <Tooltip title="Derived from batches">
              <Text type="success">
                ₹{parseFloat(record.fifo_price).toFixed(2)}
              </Text>
            </Tooltip>
          );
        }
        return `₹${parseFloat(record.unit_price || 0).toFixed(2)}`;
      },
    },
    {
      title: "Stock Level",
      key: "stock_level",
      width: 120,
      render: (_, record) => {
        const stock = record.stock_quantity || 0;
        const minStock = record.minimum_stock || 0;
        return (
          <Space>
            <Text>
              {stock} {record.UOM?.abbreviation || "unit"}
            </Text>
            {stock <= minStock && stock > 0 && <Tag color="warning">Low</Tag>}
            {stock === 0 && <Tag color="error">Out</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Quantity",
      key: "quantity",
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.stock_quantity || Infinity}
          step={0.1}
          precision={2}
          value={record.quantity}
          onChange={(value) => handleQuantityChange(record.id, value)}
          style={{ width: "100%" }}
          placeholder="Qty"
        />
      ),
    },
    {
      title: "Notes",
      key: "notes",
      width: 180,
      render: (_, record) => (
        <Input.TextArea
          rows={1}
          value={record.preparation_notes}
          onChange={(e) => handleNotesChange(record.id, e.target.value)}
          placeholder="Prep notes (optional)"
        />
      ),
    },
    {
      title: "Cost",
      key: "cost",
      width: 140,
      render: (_, record) => {
        if (
          record.multi_batch_price !== null &&
          record.multi_batch_breakdown?.length
        ) {
          const avg = parseFloat(record.average_unit_price || 0).toFixed(2);
          const title = record.multi_batch_breakdown
            .map((b) => {
              const qty =
                b.quantity_used !== undefined
                  ? b.quantity_used.toFixed(3)
                  : b.quantity?.toFixed(3);
              return `Batch #${b.batch_id}: ${qty} @ avg ₹${avg}`;
            })
            .join("; ");
          return (
            <Tooltip title={title || `Avg ₹${avg}`}>
              <Text
                style={{ textDecoration: "underline" }}
              >{`₹${parseFloat(record.multi_batch_price).toFixed(2)}`}</Text>
            </Tooltip>
          );
        }
        const price =
          record.fifo_price !== null
            ? record.fifo_price
            : record.unit_price || 0;
        const cost = price * (record.quantity || 0);
        return `₹${cost.toFixed(2)}`;
      },
    },
  ];

  const selectedColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          <Tag color="blue">{record.category}</Tag>
        </Space>
      ),
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      render: (text, record) => `${text} ${record.unit}`,
    },
    {
      title: "Unit Price",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (price, record) => {
        const shown = parseFloat(price || 0).toFixed(2);
        if (record.is_multi_batch) {
          return (
            <Tooltip title={record.batch_details || ""}>
              <Space>
                <Text style={{ textDecoration: "underline" }}>
                  ₹{shown}
                </Text>
                <Tag color="orange">AVG</Tag>
              </Space>
            </Tooltip>
          );
        }
        return (
          <span>
            ₹{shown}
            {record.is_fifo_price && <Tag color="green">FIFO</Tag>}
          </span>
        );
      },
    },
    {
      title: "Total Cost",
      dataIndex: "total_cost",
      key: "total_cost",
      render: (cost, record) => {
        const displayed = parseFloat(cost || 0).toFixed(2);
        if (record.is_multi_batch && record.batch_details) {
          return (
            <Tooltip title={record.batch_details}>
              <Text style={{ textDecoration: "underline" }}>
                ₹{displayed}
              </Text>
            </Tooltip>
          );
        }
        return `₹${displayed}`;
      },
    },
    {
      title: "Notes",
      dataIndex: "preparation_notes",
      key: "preparation_notes",
      ellipsis: true,
    },
  ];

  const menuDropdown = (
    <Select
      style={{ width: 300 }}
      showSearch
      allowClear
      placeholder="Select existing menu to view/update"
      value={selectedMenuId || undefined}
      onChange={handleMenuSelect}
      optionFilterProp="children"
      filterOption={(input, option) =>
        option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
    >
      {menus.map((m) => (
        <Option key={m.id} value={m.id}>
          {m.name} (
          {mealTypes.find((mt) => mt.value === m.meal_type)?.label ||
            m.meal_type}
          )
        </Option>
      ))}
    </Select>
  );

  const renderCalculationCard = () => {
    const entries = Object.entries(calculationDetails);
    if (!entries.length)
      return <Empty description="Adjust quantities to see calculations" />;

    return (
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {entries.map(([itemId, detail]) => {
          const baseItem = items.find((item) => item.id === Number(itemId));
          return (
            <div
              key={itemId}
              style={{
                background: "#f9f9f9",
                borderRadius: 8,
                padding: 12,
                width: "100%",
              }}
            >
              <Space direction="vertical" style={{ width: "100%" }} size="small">
                <Space>
                  <Text strong>
                    {baseItem?.name || `Item #${itemId}`}
                  </Text>
                  {baseItem?.tbl_ItemCategory?.name && (
                    <Tag color="blue">{baseItem.tbl_ItemCategory.name}</Tag>
                  )}
                </Space>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="Requested Qty"
                      value={detail.requestedQuantity}
                      precision={3}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Used Qty"
                      value={detail.consumedQuantity}
                      precision={3}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Shortage"
                      value={detail.shortage}
                      precision={3}
                      valueStyle={{
                        color: detail.shortage > 0 ? "#d4380d" : undefined,
                      }}
                    />
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Average Unit Price"
                      prefix="₹"
                      value={detail.averageUnitPrice}
                      precision={2}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Total Cost"
                      prefix="₹"
                      value={detail.totalCost}
                      precision={2}
                    />
                  </Col>
                </Row>

                {Array.isArray(detail.breakdown) &&
                  detail.breakdown.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">Batch breakdown:</Text>
                      <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                        {detail.breakdown.map((batch) => (
                          <li key={batch.batch_id}>
                            Batch #{batch.batch_id} (
                            {moment(batch.purchase_date).format("DD-MMM-YYYY")})
                            – used{" "}
                            {batch.quantity_used?.toFixed(3) ?? "0.000"}{" "}
                            {baseItem?.UOM?.abbreviation || "unit"} at actual price ₹
                            {parseFloat(batch.unit_price || 0).toFixed(2)}; booked cost ₹
                            {parseFloat(batch.cost || 0).toFixed(2)} (avg)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {!detail.breakdown?.length && (
                  <Text type="secondary">
                    No active batches – using base price.
                  </Text>
                )}
              </Space>
            </div>
          );
        })}
      </Space>
    );
  };

  return (
    <Card
      title={
        <Space>
          <Title level={3}>Menu Management</Title>
          {menuDropdown}
          {selectedMenuId && (
            <Button
              size="small"
              danger
              style={{ marginLeft: 12 }}
              onClick={() => handleDeleteMenu(selectedMenuId)}
            >
              Delete Menu
            </Button>
          )}
          {selectedMenuId && (
            <Button
              size="small"
              icon={<CloseOutlined />}
              style={{ marginLeft: 8 }}
              onClick={() => handleMenuSelect(null)}
            >
              New Menu
            </Button>
          )}
        </Space>
      }
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={selectedMenuId ? "Edit Menu Details" : "Menu Details"}
            bordered={false}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                estimated_servings: 50,
              }}
            >
              <Form.Item
                name="name"
                label="Menu Name"
                rules={[{ required: true, message: "Please enter menu name" }]}
              >
                <Input placeholder="Enter menu name" />
              </Form.Item>

              <Form.Item
                name="meal_type"
                label="Meal Type"
                rules={[{ required: true, message: "Please select meal type" }]}
              >
                <Select placeholder="Select meal type">
                  {mealTypes.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="date"
                label="Menu Date"
                rules={[{ required: true, message: "Please select date" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                name="estimated_servings"
                label="Estimated Servings"
                rules={[
                  { required: true, message: "Please enter estimated servings" },
                  { type: "number", min: 1, message: "Must be at least 1" },
                ]}
                tooltip={{
                  title: "Number of people expected to be served with this menu",
                  icon: <InfoCircleOutlined />,
                }}
              >
                <InputNumber min={1} style={{ width: "100%" }} onChange={calculateCosts} />
              </Form.Item>

              <Form.Item name="preparation_time" label="Preparation Time (minutes)">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <TextArea rows={4} placeholder="Enter menu description (optional)" />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<Space><CalculatorOutlined /> Cost Calculation</Space>} bordered={false}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Ingredients Cost"
                  value={costCalculation.totalCost}
                  precision={2}
                  prefix="₹"
                  formatter={(value) => `₹${parseFloat(value || 0).toFixed(2)}`}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Cost Per Serving"
                  value={costCalculation.costPerServing}
                  precision={2}
                  prefix="₹"
                  formatter={(value) => `₹${parseFloat(value || 0).toFixed(2)}`}
                />
              </Col>
            </Row>
          </Card>

          <Card
            title={<Space><PlusOutlined /> Selected Ingredients</Space>}
            style={{ marginTop: 16 }}
            bordered={false}
          >
            {menuItems.length > 0 ? (
              <Table
                size="small"
                dataSource={menuItems}
                columns={selectedColumns}
                rowKey="item_id"
                pagination={false}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <strong>Total Cost</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong>₹{costCalculation.totalCost.toFixed(2)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}></Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="No ingredients selected yet" />
            )}
          </Card>

          <Card
            title={<Space><CalculatorOutlined /> Item Cost Breakdown</Space>}
            style={{ marginTop: 16 }}
            bordered={false}
          >
            {renderCalculationCard()}
          </Card>
        </Col>
      </Row>

      <Divider />

      <Card
        title="Select Ingredients"
        bordered={false}
        extra={
          <Space>
            <Select
              placeholder="Filter by category"
              style={{ width: 180 }}
              value={selectedCategory}
              onChange={setSelectedCategory}
            >
              <Option value="all">All Categories</Option>
              {categories.map((category) => (
                <Option key={category.id} value={category.id}>
                  {category.name}
                </Option>
              ))}
            </Select>
            <Input
              placeholder="Search items..."
              allowClear
              value={searchText}
              onChange={(e) => debouncedSetSearchText(e.target.value)}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
          </Space>
        }
      >
        <Table
          dataSource={filteredItems}
          columns={columns}
          rowKey="id"
          loading={dataLoading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            onChange: handlePaginationChange,
            onShowSizeChange: (page, pageSize) => handlePaginationChange(1, pageSize),
          }}
          size="middle"
          scroll={{ x: 1000 }}
        />
      </Card>

      <Divider />

      <div style={{ textAlign: "right", marginTop: 24 }}>
        <Space>
          <Button
            onClick={() => {
              form.resetFields();
              resetQuantities();
              setMenuItems([]);
              setCostCalculation({ totalCost: 0, costPerServing: 0 });
              setSelectedMenuId(null);
              setSearchText("");
              setSelectedCategory("all");
            }}
            icon={<CloseOutlined />}
          >
            Reset All
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!menuItems.length}
            icon={selectedMenuId ? <EditOutlined /> : <SaveOutlined />}
          >
            {selectedMenuId ? "Update Menu" : "Create Menu"}
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default CreateMenu;
