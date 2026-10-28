import { PermissionButton as Button, PermissionModal as Modal } from '../common/PermissionControls';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Card, Checkbox, Empty, Input, InputNumber, Select, Space, Spin, Table, Tabs, Tag, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { menuPlanningAPI } from '../../services/api';
import './WeeklyMenuWorkspace.css';

const { Text, Title } = Typography;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snacks'];
export const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const clone = value => JSON.parse(JSON.stringify(value));
const errorMessage = error => error.response?.data?.message || 'Unable to complete this action. Please retry.';
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const Field = ({ label, children }) => <label className="weekly-field"><span>{label}</span>{children}</label>;

export default function WeeklyMenuWorkspace({ initialTab = 'today' }) {
  const { user } = useAuth();
  const [hostels, setHostels] = useState([]);
  const [hostel, setHostel] = useState(null);
  const [date, setDate] = useState(localToday);
  const [tab, setTab] = useState(initialTab);
  const [metadata, setMetadata] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [planDraft, setPlanDraft] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [override, setOverride] = useState(null);
  const [consumption, setConsumption] = useState(null);
  const [configuration, setConfiguration] = useState(null);
  const [settingsReason, setSettingsReason] = useState('');
  const request = useRef(0);
  const scopeRef = useRef('');
  scopeRef.current = `${hostel}:${date}`;
  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => {
    let cancelled = false;
    menuPlanningAPI.hostels().then(response => {
      if (cancelled) return;
      const available = response.data.data;
      setHostels(available);
      setHostel(available[0]?.id || null);
      if (!available.length) { setLoadError('No hostel is assigned to this account.'); setLoading(false); }
    }).catch(error => { if (!cancelled) { setLoadError(errorMessage(error)); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);
  async function load() {
    if (!hostel) return;
    const sequence = ++request.current;
    const scope = `${hostel}:${date}`;
    setLoading(true); setLoadError('');
    try {
      const [meta, daily] = await Promise.all([menuPlanningAPI.metadata(hostel), menuPlanningAPI.day(hostel, date)]);
      if (sequence !== request.current || scopeRef.current !== scope) return;
      setMetadata(meta.data.data); setMeals(daily.data.data);
      setConfiguration(clone(meta.data.data.settings)); setSettingsReason('');
    } catch (error) {
      if (sequence === request.current && scopeRef.current === scope) setLoadError(errorMessage(error));
    } finally { if (sequence === request.current && scopeRef.current === scope) setLoading(false); }
  }
  useEffect(() => { setMetadata(null); setMeals([]); setPlanDraft(null); setOverride(null); setConsumption(null); load(); }, [hostel, date]); // eslint-disable-line react-hooks/exhaustive-deps
  async function run(action, success, close) {
    setBusy(true);
    try { const result = await action(); message.success(success); close?.(); await load(); return result; }
    catch (error) { message.error(errorMessage(error)); }
    finally { setBusy(false); }
  }
  const permissions = metadata?.permissions || {};
  const items = metadata?.items || [];
  const itemOptions = items.map(item => ({ value: item.id, label: `${item.name} (${item.unit}) — ${item.current_stock} available` }));
  const itemName = id => items.find(item => item.id === id);
  function startPlan(source) {
    const saved = source?.meals || [];
    setShowTemplates(saved.some(entry => entry.menu_id));
    setPlanDraft({ name: source ? `${source.name} — revised` : 'Regular weekly menu', kind: 'regular', effective_from: localToday(),
      effective_to: '', default_count: source?.default_count ?? metadata.settings.default_count, reason: '',
      settings_revision: metadata.settings_revision,
      meals: saved.filter(entry => metadata.settings.slots.some(slot => slot.key === entry.slot_key)).map(entry => ({ ...entry })) });
  }
  function updateDraftMeal(day, slot_key, patch) {
    setPlanDraft(previous => {
      const next = clone(previous);
      let entry = next.meals.find(meal => meal.day === day && meal.slot_key === slot_key);
      if (!entry) { entry = { day, slot_key, dishes: '', menu_id: null }; next.meals.push(entry); }
      Object.assign(entry, patch);
      return next;
    });
  }
  function openConsumption(meal) {
    setConsumption({ meal, reason: 'Daily kitchen consumption', items: meal.ingredients.map((ingredient, index) => ({ _key: `ingredient-${index}`, item_id: ingredient.item_id,
      quantity: Number((ingredient.quantity_per_serving * meal.expected_count).toFixed(2)) })) });
  }
  function submitConsumption() {
    if (!consumption.items.length || consumption.items.some(row => !row.item_id || !(row.quantity > 0))) return message.error('Add ingredients with positive quantities actually used.');
    Modal.confirm({ title: 'Confirm actual stock consumption?', content: 'This deducts the entered quantities from inventory and locks this meal’s consumption record.', okText: 'Confirm consumption',
      onOk: async () => {
        setBusy(true);
        try {
          const result = await menuPlanningAPI.consume(hostel, date, consumption.meal.slot_key, {
            source_key: consumption.meal.source_key, reason: consumption.reason, items: consumption.items });
          message.success(`Consumption recorded: ${money(result.data.data.total_cost)}`);
          const low = result.data.data.lowStockItems || [];
          if (low.length) message.warning(`Low stock: ${low.map(item => item.name).join(', ')}`, 8);
          setConsumption(null); await load();
        } catch (error) { message.error(errorMessage(error)); throw error; }
        finally { setBusy(false); }
      } });
  }
  const dayPanel = <>
    <div className="weekly-toolbar"><Field label="Menu date"><Input aria-label="Menu date" type="date" value={date} disabled={busy} onChange={event => event.target.value && setDate(event.target.value)} /></Field>
      <Button disabled={busy} onClick={() => setDate(localToday())}>Today</Button><Button disabled={busy} onClick={load}>Refresh</Button></div>
    <Alert type="info" showIcon title="Your weekly plan repeats automatically" description="Change a meal or student count for this date only. Record the ingredients actually used after preparation." />
    {!metadata?.plans.length && <Empty description="Start by creating your regular weekly plan."><Button permissionAction="generate" type="primary" disabled={!permissions.plan} onClick={() => startPlan()}>Create weekly plan</Button></Empty>}
    <div className="weekly-meal-grid">{meals.map(meal => <Card key={meal.slot_key} title={<Space>{meal.slot.label}<Text type="secondary">{meal.slot.time}</Text></Space>}
      extra={<Tag color={meal.status === 'served' ? 'green' : meal.status === 'skipped' ? 'default' : 'blue'}>{meal.status === 'served' ? 'Consumption recorded' : meal.status}</Tag>}>
      <Title level={4}>{meal.dishes || 'No meal planned'}</Title>
      <p><Text strong>{meal.expected_count}</Text> expected students</p>
      <p><Text type="secondary">{meal.plan_name || 'No weekly plan'}{meal.overridden && meal.status !== 'served' ? ' · Date-specific change' : ''}</Text></p>
      {meal.status === 'served' && <><p>Actual ingredient cost: <Text strong>{money(meal.total_cost)}</Text></p>
        {meal.actual_consumption.map(row => <div key={row.item_id}>{itemName(row.item_id)?.name || `Ingredient ${row.item_id}`}: {row.quantity} {itemName(row.item_id)?.unit}</div>)}</>}
      <Space wrap style={{ marginTop: 12 }}>
        <Button permissionAction="edit" disabled={!permissions.override || busy || meal.status === 'served' || date < localToday()} onClick={() => setOverride({ meal, dishes: meal.dishes,
          expected_count: meal.expected_count, status: meal.status, clear_ingredients: false, reason: '' })}>Change menu / count</Button>
        <Button permissionAction="create" type="primary" disabled={!permissions.consume || busy || !meal.configured || meal.status !== 'planned' || date !== localToday()}
          onClick={() => openConsumption(meal)}>Record consumption</Button>
      </Space>
    </Card>)}</div>
  </>;
  const planPanel = <>
    <div className="weekly-toolbar"><Button permissionAction="generate" type="primary" disabled={!permissions.plan} onClick={() => startPlan(metadata?.plans.find(plan => plan.kind === 'regular'))}>Create / revise weekly plan</Button>
      <Text type="secondary">Publish a new version with an effective date. Temporary plans automatically expire.</Text></div>
    {!metadata?.plans.length && <Empty description="No weekly plans yet" />}
    {metadata?.plans.map(plan => <Card key={plan.id} className="weekly-plan-card" title={<Space wrap>{plan.name}<Tag>{plan.kind}</Tag></Space>}
      extra={<Button permissionAction="generate" disabled={!permissions.plan} onClick={() => startPlan(plan)}>Copy into new version</Button>}>
      <p>From {plan.effective_from}{plan.effective_to ? ` through ${plan.effective_to}` : ' onwards'} · Default {plan.default_count} students</p>
      <Table size="small" pagination={false} rowKey="day" scroll={{ x: Math.max(650, plan.slots.length * 180) }} dataSource={DAY_ORDER.map(day => ({ day }))}
        columns={[{ title: 'Day', dataIndex: 'day', width: 110, render: day => DAYS[day] }, ...plan.slots.map(slot => ({ title: `${slot.label} · ${slot.time}`, key: slot.key,
          render: (_, row) => plan.meals.find(meal => meal.day === row.day && meal.slot_key === slot.key)?.dishes || '—' }))]} />
    </Card>)}
  </>;
  const settingsPanel = configuration && <>
    <Alert type="info" showIcon title="Defaults for new weekly plans" description="Published plans keep their saved meal slots, timings and student count. Copy a plan into a new version to apply changed defaults. Administrators manage permissions." />
    <Field label="Default expected students"><InputNumber aria-label="Default expected students" min={0} max={100000} value={configuration.default_count} disabled={!permissions.settings}
      onChange={value => setConfiguration({ ...configuration, default_count: value })} /></Field>
    <Title level={4}>Meal slots and timings</Title>
    <div className="weekly-table-scroll"><table className="weekly-settings-table"><thead><tr><th>Meal name</th><th>Time</th><th>Stock report category</th><th /></tr></thead><tbody>
      {configuration.slots.map((slot, index) => <tr key={index}>
        {['label', 'time', 'category'].map(field => <td key={field}>{field === 'category' ? <Select aria-label={`Stock category ${index + 1}`} value={slot.category} disabled={!permissions.settings}
          options={CATEGORIES.map(value => ({ label: value, value }))} onChange={value => setConfiguration(previous => ({ ...previous, slots: previous.slots.map((s, i) => i === index ? { ...s, category: value } : s) }))} />
          : <Input aria-label={`${field} ${index + 1}`} type={field === 'time' ? 'time' : 'text'} value={slot[field]} disabled={!permissions.settings}
            onChange={event => setConfiguration(previous => ({ ...previous, slots: previous.slots.map((s, i) => i === index ? { ...s, [field]: event.target.value } : s) }))} />}</td>)}
        <td><Button permissionAction="edit" danger disabled={!permissions.settings || configuration.slots.length === 1} onClick={() => setConfiguration({ ...configuration, slots: configuration.slots.filter((_, i) => i !== index) })}>Remove</Button></td>
      </tr>)}</tbody></table></div>
    <Button permissionAction="edit" disabled={!permissions.settings || configuration.slots.length >= 12} onClick={() => setConfiguration({ ...configuration,
      slots: [...configuration.slots, { key: `meal_${Date.now()}`, label: 'New meal', time: '17:00', category: 'snacks' }] })}>Add meal slot</Button>
    <Title level={4}>Permissions</Title>
    <Text type="secondary">Administrators always retain access. Wardens can view menus in their workspace; enable editing here when needed.</Text>
    {Object.entries({ plan: 'Publish weekly plans', override: 'Change daily menu / count', consume: 'Record consumption', settings: 'Change defaults and meal slots' }).map(([action, label]) =>
      <div className="weekly-permission" key={action}><Text>{label}</Text><Checkbox.Group disabled={!metadata.can_manage_permissions}
        options={[{ label: 'Mess staff', value: 'mess' }, { label: 'Warden', value: 'warden' }]} value={configuration.permissions[action]}
        onChange={roles => setConfiguration({ ...configuration, permissions: { ...configuration.permissions, [action]: roles } })} /></div>)}
    <Field label="Reason for settings change"><Input value={settingsReason} onChange={event => setSettingsReason(event.target.value)} disabled={!permissions.settings} maxLength={500} /></Field>
    <Button permissionAction="edit" type="primary" loading={busy} disabled={!permissions.settings || !settingsReason.trim()} onClick={() => run(() => menuPlanningAPI.settings(hostel,
      { configuration, revision: metadata.settings_revision, reason: settingsReason }), 'Menu settings saved')}>Save settings</Button>
  </>;
  return <section className="module-page weekly-workspace">
    <div className="module-page-header"><div><h1>Weekly Menu</h1><Text type="secondary">Set the routine once. Adjust individual meals when needed.</Text></div>
      <Select aria-label="Menu hostel" value={hostel} disabled={hostels.length < 2 || busy} style={{ minWidth: 180 }} options={hostels.map(h => ({ value: h.id, label: h.name }))}
        onChange={setHostel} /></div>
    {loadError ? <Alert type="error" showIcon title={loadError} action={<Button onClick={load}>Retry</Button>} /> : loading ? <Spin description="Loading menu plan"><div style={{ minHeight: 220 }} /></Spin> : metadata &&
      <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'today', label: "Today's Menu", children: dayPanel },
        { key: 'plans', label: 'Weekly Plans', children: planPanel }, { key: 'settings', label: 'Settings', children: settingsPanel },
        { key: 'history', label: 'Change History', children: <Table rowKey="id" dataSource={metadata.history} scroll={{ x: 700 }} pagination={{ pageSize: 10 }} columns={[
          { title: 'When', dataIndex: 'createdAt', render: value => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
          { title: 'By', dataIndex: 'actor_name' }, { title: 'Action', dataIndex: 'action' }, { title: 'Reason', dataIndex: 'reason' },
          { title: 'Date / plan', render: (_, row) => row.details.date || row.details.name || 'Settings' }
        ]} /> }]} />}
    {user?.role !== 'warden' && <details className="weekly-tools"><summary>Recipes, ingredient templates and previous schedules</summary><Space wrap>
      <Link to={`/recipe${user?.role === 'admin' ? '?workspace=mess' : ''}`}>Manage recipes</Link>
      <Link to={`/menu-templates${user?.role === 'admin' ? '?workspace=mess' : ''}`}>Ingredient templates</Link>
      <Link to={`/create-menu${user?.role === 'admin' ? '?workspace=mess' : ''}`}>Create ingredient template</Link>
      <Link to={`/menu-schedule${user?.role === 'admin' ? '?workspace=mess' : ''}`}>Previous schedules</Link>
    </Space></details>}
    <Modal permissionAction="generate" title="Publish weekly menu" open={!!planDraft} onCancel={() => !busy && setPlanDraft(null)} width={1200} confirmLoading={busy}
      okText="Publish plan" okButtonProps={{ disabled: !planDraft?.reason.trim() }} onOk={() => run(() => menuPlanningAPI.publish(hostel,
        { ...planDraft, meals: planDraft.meals.filter(meal => meal.dishes.trim()) }), 'Weekly plan published', () => setPlanDraft(null))}>
      {planDraft && <><Alert type="info" showIcon title="This creates a new plan version" description="Blank cells mean no meal planned. You can enter dishes freely; an ingredient template is optional. Existing daily changes and recorded meals keep their saved details." />
        <div className="weekly-form-grid">
          <Field label="Plan name"><Input aria-label="Plan name" value={planDraft.name} maxLength={120} onChange={e => setPlanDraft({ ...planDraft, name: e.target.value })} /></Field>
          <Field label="Plan type"><Select aria-label="Plan type" value={planDraft.kind} options={[{ value: 'regular', label: 'Regular weekly plan' }, { value: 'temporary', label: 'Temporary plan' }]}
            onChange={kind => setPlanDraft({ ...planDraft, kind })} /></Field>
          <Field label="Effective from"><Input aria-label="Effective from" type="date" min={localToday()} value={planDraft.effective_from} onChange={e => setPlanDraft({ ...planDraft, effective_from: e.target.value })} /></Field>
          <Field label="Effective through (required for temporary)"><Input aria-label="Effective through" type="date" min={planDraft.effective_from} value={planDraft.effective_to} onChange={e => setPlanDraft({ ...planDraft, effective_to: e.target.value })} /></Field>
          <Field label="Default students"><InputNumber aria-label="Plan default students" min={0} max={100000} value={planDraft.default_count} onChange={value => setPlanDraft({ ...planDraft, default_count: value })} /></Field>
        </div>
        <Checkbox checked={showTemplates} onChange={e => setShowTemplates(e.target.checked)}>Use ingredient templates (optional)</Checkbox>
        <div className="weekly-table-scroll"><table className="weekly-editor"><thead><tr><th>Day</th>{metadata.settings.slots.map(slot => <th key={slot.key}>{slot.label} <Text type="secondary">{slot.time}</Text></th>)}</tr></thead>
          <tbody>{DAY_ORDER.map(day => <tr key={day}><th>{DAYS[day]}</th>{metadata.settings.slots.map(slot => {
            const entry = planDraft.meals.find(meal => meal.day === day && meal.slot_key === slot.key);
            return <td key={slot.key}><Input.TextArea aria-label={`${DAYS[day]} ${slot.label} dishes`} placeholder="Enter dishes" value={entry?.dishes || ''} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={1000}
              onChange={e => updateDraftMeal(day, slot.key, { dishes: e.target.value })} />
              {showTemplates && <Select aria-label={`${DAYS[day]} ${slot.label} ingredient template`} allowClear showSearch optionFilterProp="label" placeholder="Ingredient template (optional)" value={entry?.menu_id || undefined}
                options={metadata.menus.map(menu => ({ value: menu.id, label: menu.name }))}
                onChange={menu_id => updateDraftMeal(day, slot.key, { menu_id: menu_id || null,
                  ...(!entry?.dishes && menu_id ? { dishes: metadata.menus.find(menu => menu.id === menu_id)?.name || '' } : {}) })} />}</td>;
          })}</tr>)}</tbody></table></div>
        <Field label="Reason for publishing"><Input aria-label="Reason for publishing" value={planDraft.reason} maxLength={500} onChange={e => setPlanDraft({ ...planDraft, reason: e.target.value })} /></Field>
      </>}
    </Modal>
    <Modal permissionAction="edit" title={`Change ${override?.meal.slot.label || 'meal'} · ${date}`} open={!!override} confirmLoading={busy} onCancel={() => !busy && setOverride(null)}
      okText="Save for this date only" okButtonProps={{ disabled: !override?.reason.trim() }} onOk={() => run(() => menuPlanningAPI.override(hostel, date, override.meal.slot_key,
        { ...override, meal: undefined, source_key: override.meal.source_key }), 'Date-specific change saved', () => setOverride(null))}>
      {override && <><Alert type="info" title="The regular weekly plan continues after this date." />
        <Field label="Dishes"><Input.TextArea aria-label="Override dishes" value={override.dishes} maxLength={1000} onChange={e => setOverride({ ...override, dishes: e.target.value,
          clear_ingredients: override.clear_ingredients || e.target.value !== override.meal.dishes })} /></Field>
        <Field label="Expected students"><InputNumber aria-label="Expected students" min={0} max={100000} value={override.expected_count} onChange={value => setOverride({ ...override, expected_count: value })} /></Field>
        <Field label="Meal status"><Select aria-label="Meal status" value={override.status} options={[{ value: 'planned', label: 'Planned' }, { value: 'skipped', label: 'Skip this meal' }]} onChange={status => setOverride({ ...override, status })} /></Field>
        {!!override.meal.ingredients.length && <Checkbox checked={override.clear_ingredients} onChange={e => setOverride({ ...override, clear_ingredients: e.target.checked })}>Clear ingredient suggestions for replacement dishes</Checkbox>}
        <Field label="Reason"><Input aria-label="Override reason" value={override.reason} maxLength={500} onChange={e => setOverride({ ...override, reason: e.target.value })} /></Field>
      </>}
    </Modal>
    <Modal permissionAction="create" title={`Record consumption · ${consumption?.meal.slot.label || ''}`} open={!!consumption} width={850} onCancel={() => !busy && setConsumption(null)}
      confirmLoading={busy} okText="Review and confirm" onOk={submitConsumption} okButtonProps={{ disabled: !consumption?.reason.trim() || !consumption?.items.length }}>
      {consumption && <><Alert type="info" showIcon title="Enter actual ingredient quantities" description="Suggestions use the expected student count. Adjust them to what the kitchen actually used. This records inventory consumption; student attendance and billing eligibility are managed separately." />
        <p>{consumption.meal.dishes} · {consumption.meal.expected_count} expected students · {date}</p>
        <Table rowKey="_key" pagination={false} dataSource={consumption.items} scroll={{ x: 600 }} columns={[
          { title: 'Ingredient / stock unit', render: (_, row, index) => <Select aria-label={`Consumed ingredient ${index + 1}`} showSearch optionFilterProp="label" style={{ minWidth: 240, width: '100%' }} value={row.item_id || undefined} options={itemOptions}
            onChange={item_id => setConsumption({ ...consumption, items: consumption.items.map((item, i) => i === index ? { ...item, item_id } : item) })} /> },
          { title: 'Actual quantity', render: (_, row, index) => <InputNumber aria-label={`Actual quantity ${index + 1}`} min={0.01} precision={2} value={row.quantity} onChange={quantity => setConsumption({ ...consumption,
            items: consumption.items.map((item, i) => i === index ? { ...item, quantity } : item) })} /> },
          { title: 'Unit', render: (_, row) => itemName(row.item_id)?.unit || '—' },
          { title: '', render: (_, row, index) => <Button danger onClick={() => setConsumption({ ...consumption, items: consumption.items.filter((_, i) => i !== index) })}>Remove</Button> }
        ]} />
        <Button onClick={() => setConsumption({ ...consumption, items: [...consumption.items, { _key: `ingredient-${Date.now()}`, item_id: null, quantity: null }] })}>Add ingredient</Button>
        <Field label="Consumption note"><Input aria-label="Consumption note" value={consumption.reason} maxLength={500} onChange={e => setConsumption({ ...consumption, reason: e.target.value })} /></Field>
      </>}
    </Modal>
  </section>;
}
