import { useEffect, useState } from 'react';
import { Card, DatePicker, Table, Button, message } from 'antd';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { messAPI } from '../../services/api';

const columns = [
  { title: 'Item', dataIndex: 'item_name', key: 'item_name' },
  { title: 'Current Stock', dataIndex: 'current_stock', key: 'current_stock' },
  { title: 'Required Stock', dataIndex: 'quantity_needed', key: 'quantity_needed' },
];

const PurchaseOrder = () => {
  const [loading, setLoading] = useState(false);
  const [pickerValue, setPickerValue] = useState(dayjs());
  const [data, setData] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        month: pickerValue.month() + 1,
        year: pickerValue.year(),
      };
      const response = await messAPI.getPurchaseOrders(params);
      setData(response.data.data || []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) {
      message.warning('Nothing to export.');
      return;
    }

    const rows = data.map((row) => ({
      Item: row.item_name,
      'Current Stock': row.current_stock,
      'Required Stock': row.quantity_needed,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Suggestions');

    const label = pickerValue.format('YYYY-MM');
    XLSX.writeFile(workbook, `purchase_suggestions_${label}.xlsx`);
  };

  useEffect(() => {
    fetchData();
  }, [pickerValue]);

  return (
    <Card
      title="Purchase Suggestions"
      extra={
        <>
          <DatePicker
            picker="month"
            allowClear={false}
            value={pickerValue}
            onChange={(value) => setPickerValue(value || dayjs())}
            style={{ marginRight: 8 }}
          />
          <Button onClick={handleExport}>Export to Excel</Button>
        </>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
      />
    </Card>
  );
};

export default PurchaseOrder;
