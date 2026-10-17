import React, { useEffect, useState } from 'react';
import { Alert, App, Card, Table, Tag, Typography } from 'antd';
import { wardenAPI } from '../../services/api';

export default function LegacyRebateHistory() {
  const { message } = App.useApp();
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true);
  useEffect(() => {
    wardenAPI.getRebates().then(response => setRows(response.data.data || [])).catch(error => message.error(error.message)).finally(() => setLoading(false));
  }, []);
  return <div className="p-4 lg:p-8 space-y-5">
    <Typography.Title level={2}>Legacy Rebate History</Typography.Title>
    <Alert type="info" showIcon message="Existing records are read-only"
      description="Use Mess Reductions for new requests, supporting documents, and warden/admin decisions. These legacy records do not grant a new reduction under the approval-based food billing rules." />
    <Card><Table rowKey="id" dataSource={rows} loading={loading} scroll={{x:700}} columns={[
      {title:'Student',key:'student',render:(_,row)=>row.RebateStudent?.userName || `Student #${row.student_id}`},
      {title:'Category',dataIndex:'rebate_type',key:'category'},
      {title:'Dates',key:'dates',render:(_,row)=>`${row.from_date} → ${row.to_date}`},
      {title:'Status',dataIndex:'status',key:'status',render:value=><Tag>{value}</Tag>},
      {title:'Recorded amount',dataIndex:'amount',key:'amount',render:value=>`₹${Number(value || 0).toFixed(2)}`},
      {title:'Reason',dataIndex:'reason',key:'reason'}
    ]}/></Card>
  </div>;
}
