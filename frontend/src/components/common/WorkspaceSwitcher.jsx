import React, { useState } from 'react';
import { Dropdown } from 'antd';
import { Check, ChefHat, ChevronDown, ShieldCheck, Users } from 'lucide-react';

const workspaces = [
  { key: 'admin', label: 'Admin', description: 'Manage the system', icon: ShieldCheck, color: 'bg-blue-50 text-blue-600' },
  { key: 'warden', label: 'Warden', description: 'Students, rooms & attendance', icon: Users, color: 'bg-violet-50 text-violet-600' },
  { key: 'mess', label: 'Mess', description: 'Meals, stock & billing', icon: ChefHat, color: 'bg-emerald-50 text-emerald-600' },
];

export default function WorkspaceSwitcher({ workspace = 'admin', onChange }) {
  const [open, setOpen] = useState(false);
  const active = workspaces.find(item => item.key === workspace) || workspaces[0];
  const ActiveIcon = active.icon;

  return <Dropdown autoFocus trigger={['click']} placement="bottomRight" open={open} onOpenChange={setOpen}
    styles={{ root: { paddingTop: 10 } }}
    menu={{ selectable: true, selectedKeys: [active.key],
      style: { boxShadow: 'none', borderRadius: 12, padding: 6 },
      onClick: ({ key }) => { setOpen(false); if (key !== active.key) onChange(key); },
      items: workspaces.map(({ key, label, description, icon: Icon, color }) => ({ key,
        style: { borderRadius: 10, marginBottom: 3, padding: '10px 12px' },
        label: <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={18} /></span>
          <span className="flex-1"><span className="block text-sm font-semibold text-slate-800">{label}</span>
            <span className="block text-xs text-slate-500 mt-0.5">{description}</span></span>
          {key === active.key && <Check size={17} className="text-blue-600 ml-2" aria-label="Active workspace" />}
        </div>,
      })) }}
    popupRender={menu => <div className="w-72 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="px-5 pt-4 pb-3 border-b border-slate-100"><p className="m-0 text-xs font-semibold uppercase tracking-wider text-slate-400">Switch workspace</p></div>
      {menu}
    </div>}>
    <button type="button" aria-label="Workspace" aria-haspopup="menu" aria-expanded={open}
      className={`group flex shrink-0 items-center gap-2.5 rounded-xl border px-2.5 sm:px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${open ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`} title={`Workspace: ${active.label}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active.color}`}><ActiveIcon size={17} /></span>
      <span className="hidden sm:block"><span className="block text-[9px] uppercase tracking-wider text-slate-400">Workspace</span><span className="block text-sm font-semibold text-slate-700">{active.label}</span></span>
      <ChevronDown size={15} className={`text-slate-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
    </button>
  </Dropdown>;
}
