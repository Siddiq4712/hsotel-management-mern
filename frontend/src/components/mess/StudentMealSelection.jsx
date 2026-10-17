import React, { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Table, Typography } from 'antd';
import { Filter, Search } from 'lucide-react';

const { Text } = Typography;
export default function StudentMealSelection({ students, selectedIds, onChange, disabled, loading }) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [college, setCollege] = useState('all');
  const filtered = useMemo(() => students.filter(s => {
    const text = query.trim().toLowerCase();
    return (college === 'all' || s.college === college) &&
      (!text || String(s.userName || '').toLowerCase().includes(text) || String(s.roll_number || '').toLowerCase().includes(text));
  }), [students, query, college]);
  const colleges = [...new Set(students.map(s => s.college).filter(Boolean))];
  const toggle = id => onChange(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]);
  return <div className="ssm-panel" style={{ marginTop: 28 }}>
    <div className="ssm-panel-header"><span>Select Students</span></div>
    <p>Click a row or its checkbox. Every selected student receives the same dishes and quantities entered above.</p>
    <Space wrap style={{ marginBottom: 16 }}>
      <Input aria-label="Search students" placeholder="Search by roll number or name" allowClear value={query}
        disabled={disabled} prefix={<Search size={15} />} onChange={e => setQuery(e.target.value)} style={{ width: 280 }} />
      <Button disabled={disabled} icon={<Filter size={15} />} onClick={() => setShowFilters(value => !value)}>Add Filter</Button>
      {showFilters && <Select aria-label="College filter" value={college} disabled={disabled} style={{ width: 190 }}
        onChange={setCollege} options={[{label:'All colleges',value:'all'},...colleges.map(value => ({label:value.toUpperCase(),value}))]} />}
      {college !== 'all' && <Button disabled={disabled} onClick={() => { setCollege('all'); setShowFilters(false); }}>Clear Filter</Button>}
      <Button disabled={disabled || loading || !filtered.length} onClick={() => onChange([...new Set([...selectedIds, ...filtered.map(s => s.id)])])}>
        Select all filtered ({filtered.length})
      </Button>
      <Button disabled={disabled || !selectedIds.length} onClick={() => onChange([])}>Clear Selection</Button>
      <Text strong>{selectedIds.length} students selected</Text>
    </Space>
    <Table rowKey="id" dataSource={filtered} loading={loading} size="small" scroll={{ x: 550 }}
      rowSelection={{ selectedRowKeys: selectedIds, preserveSelectedRowKeys: true,
        onChange: keys => onChange(keys.map(Number)), getCheckboxProps: () => ({ disabled }) }}
      onRow={student => ({ onClick: event => {
        if (disabled || event.target.closest('input,button,a,label,.ant-checkbox-wrapper')) return;
        toggle(student.id);
      }, style: { cursor: disabled ? 'default' : 'pointer' } })}
      pagination={{ pageSize: 10, showSizeChanger: false, showTotal: total => `${total} matching students` }}
      columns={[{ title:'Roll Number',dataIndex:'roll_number',render:value => value || 'Not supplied' },
        {title:'Student Name',dataIndex:'userName'}, {title:'College',dataIndex:'college',render:value => value?.toUpperCase() || '—'}]} />
    <Text type="secondary">Selections are kept when searching, filtering, or changing pages.</Text>
  </div>;
}
