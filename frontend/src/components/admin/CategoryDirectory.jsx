import React, { useEffect, useRef, useState } from 'react';
import { Alert, Card, Empty, Form, Input, Modal, Skeleton, Space, Typography } from 'antd';
import { Archive, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import WorkspaceToolbar from '../common/WorkspaceToolbar';
import { PermissionButton as Button } from '../common/PermissionControls';

const { Text } = Typography;
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CategoryDirectory({ title, description, categoryLabel, icon, api }) {
  const [form] = Form.useForm();
  const request = useRef(0);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const sequence = ++request.current;
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.list();
      if (sequence === request.current) setCategories(data.data || []);
    } catch (error) {
      if (sequence === request.current) setLoadError(error.message || 'Please try again.');
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => { request.current += 1; };
  }, []);

  const query = search.trim().toLowerCase();
  const visible = categories.filter(item => [item.name, item.description].some(value => value?.toLowerCase().includes(query)));
  const deactivating = dialog?.action === 'deactivate';
  const editing = dialog?.action === 'edit';

  function open(action, category) {
    setSaveError('');
    setDialog({ action, category });
  }

  function close() {
    if (!saving) setDialog(null);
  }

  async function save(values) {
    if (saving || !dialog) return;
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      if (deactivating) {
        await api.deactivate(dialog.category.id);
        setNotice(`${dialog.category.name} was deactivated.`);
      } else {
        const category = { name: values.name.trim(), description: values.description?.trim() || '' };
        if (editing) await api.update(dialog.category.id, category);
        else await api.create(category);
        setNotice(`${category.name} was ${editing ? 'updated' : 'created'}.`);
      }
      setDialog(null);
      await load();
    } catch (error) {
      setSaveError(error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module-page" aria-labelledby={`${categoryLabel}-categories-title`}>
      <WorkspacePageHeader id={`${categoryLabel}-categories-title`} title={title} description={description} icon={icon}>
        <Button permissionAction="create" type="primary" icon={<Plus size={16} />} onClick={() => open('create')}>
          Create category
        </Button>
      </WorkspacePageHeader>

      {notice && <div role="status" className="mb-4">
        <Alert type="success" showIcon title={notice} closable={{ 'aria-label': 'Dismiss confirmation' }} onClose={() => setNotice('')} />
      </div>}

      <Card title={`${categoryLabel[0].toUpperCase()}${categoryLabel.slice(1)} categories`}>
        <WorkspaceToolbar className="mb-4">
          <Input aria-label={`Search ${categoryLabel} categories`} className="workspace-search" prefix={<Search size={16} aria-hidden="true" />}
            placeholder="Search by name or description" allowClear value={search} onChange={event => setSearch(event.target.value)} />
          <Button icon={<RefreshCw size={16} />} loading={loading} disabled={saving} onClick={load}>Refresh</Button>
          {!loadError && !loading && <Text type="secondary" aria-live="polite" className="sm:ml-auto">
            {query ? `${visible.length} of ` : ''}{categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </Text>}
        </WorkspaceToolbar>
        {loadError ? (
          <Alert type="error" showIcon title={`Could not load ${categoryLabel} categories`} description={loadError}
            action={<Button onClick={load}>Retry</Button>} />
        ) : loading ? (
          <div role="status" aria-label={`Loading ${categoryLabel} categories`}><Skeleton active paragraph={{ rows: 4 }} /></div>
        ) : !visible.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={query ? 'No categories match your search.' : `No ${categoryLabel} categories yet.`}>
            {query ? <Button onClick={() => setSearch('')}>Clear search</Button>
              : <Button permissionAction="create" onClick={() => open('create')}>Create category</Button>}
          </Empty>
        ) : (
          <ul aria-label={`${categoryLabel} categories`} className="m-0 list-none divide-y divide-slate-200 border-y border-slate-200 p-0">
            {visible.map(category => (
              <li key={category.id} className="grid gap-3 px-2 py-4 sm:px-3 lg:grid-cols-[minmax(0,1fr)_8rem_auto] lg:items-center lg:gap-5">
                <div className="min-w-0">
                  <Text strong className="block break-words">{category.name}</Text>
                  {category.description && <Text type="secondary" className="mt-1 block whitespace-pre-wrap break-words">{category.description}</Text>}
                </div>
                {category.createdAt && Number.isFinite(Date.parse(category.createdAt)) ? (
                  <Text type="secondary"><time dateTime={category.createdAt}>{dateFormat.format(new Date(category.createdAt))}</time></Text>
                ) : <span aria-hidden="true" />}
                <Space wrap size={4} className="lg:justify-self-end">
                  <Button permissionAction="edit" type="text" icon={<Pencil size={15} />} aria-label={`Edit ${category.name}`}
                    onClick={() => open('edit', category)}>Edit</Button>
                  <Button permissionAction="delete" type="text" danger icon={<Archive size={15} />} aria-label={`Deactivate ${category.name}`}
                    onClick={() => open('deactivate', category)}>Deactivate</Button>
                </Space>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(dialog)}
        destroyOnHidden
        title={deactivating ? 'Deactivate category' : editing ? 'Edit category' : 'Create category'}
        onCancel={close}
        closable={!saving}
        keyboard={!saving}
        mask={{ closable: !saving }}
        footer={[
          <Button key="cancel" disabled={saving} onClick={close}>Cancel</Button>,
          <Button key="save" permissionAction={deactivating ? 'delete' : editing ? 'edit' : 'create'} type="primary"
            danger={deactivating} loading={saving} onClick={() => deactivating ? save() : form.submit()}>
            {deactivating ? 'Deactivate' : editing ? 'Save changes' : 'Create category'}
          </Button>,
        ]}
      >
        {deactivating ? (
          <p><strong>{dialog.category.name}</strong> will stop appearing as an option for new {categoryLabel} entries.</p>
        ) : (
          <Form form={form} layout="vertical" preserve={false} initialValues={dialog?.category}
            disabled={saving} onFinish={save}>
            <Form.Item name="name" label="Category name" rules={[
              { required: true, whitespace: true, message: 'Enter a category name.' },
              { max: 255, message: 'Use 255 characters or fewer.' },
            ]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description (optional)">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        )}
        {saveError && <Alert type="error" showIcon title={deactivating ? 'Could not deactivate category' : 'Could not save category'}
          description={saveError} />}
      </Modal>
    </section>
  );
}
