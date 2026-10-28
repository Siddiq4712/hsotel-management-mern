import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Form, Modal, Select, message } from 'antd';
import { Building2, Warehouse } from 'lucide-react';
import './WorkspaceScope.css';

const ScopeContext = createContext(null);
const DraftContext = createContext(null);
export const useWorkspaceScope = () => useContext(ScopeContext);

// Getters read the latest form state when the user actually changes scope.
export function useScopeDraft(dirty, busy = false) {
  const register = useContext(DraftContext);
  const id = useId();
  const latest = useRef();
  latest.current = { dirty: typeof dirty === 'function' ? dirty : () => dirty, busy };
  useEffect(() => register?.(id, () => ({ dirty: Boolean(latest.current.dirty()), busy: latest.current.busy })), [register, id]);
}

export function useScopeForm(form, active = true, busy = false) {
  useScopeDraft(() => active && form.isFieldsTouched(), busy);
}

export function ScopeControls({ children }) {
  const scope = useWorkspaceScope();
  return scope?.controlsTarget ? createPortal(children, scope.controlsTarget)
    : <div className="scope-report-controls">{children}</div>;
}

export function ScopeAnchor() {
  const scope = useWorkspaceScope();
  return scope ? <div className="workspace-scope-anchor" ref={scope.setAnchorTarget} /> : null;
}

export default function WorkspaceScope({ scope, value, options, onChange, label, selectLabel, description, loading, disabled, actions, children }) {
  const drafts = useRef(new Map());
  const forms = useRef({});
  const [controlsTarget, setControlsTarget] = useState(null);
  const [anchorTarget, setAnchorTarget] = useState(null);
  const [register] = useState(() => (id, getter) => {
    drafts.current.set(id, getter);
    return () => drafts.current.delete(id);
  });
  const change = next => {
    if (next === value) return;
    const states = [...drafts.current.values()].map(getter => getter());
    if (states.some(state => state.busy)) { message.info('Wait for the current action to finish before changing scope.'); return; }
    const apply = () => { forms.current = {}; onChange(next); };
    const dirty = states.some(state => state.dirty) || Object.values(forms.current).some(form => form.isFieldsTouched());
    if (dirty) Modal.confirm({ title: `Change ${label.toLowerCase()}?`,
      content: 'You have unsaved changes. Switching will discard this draft.',
      okText: 'Discard and switch', cancelText: 'Keep editing', onOk: apply });
    else apply();
  };
  const Icon = scope.kind === 'inventory' ? Warehouse : Building2;
  const bar = <section className="workspace-scope-bar" aria-label={`${label} scope`}>
        <div className="workspace-scope-main">
          <span className="workspace-scope-icon"><Icon size={19} aria-hidden="true" /></span>
          <div className="workspace-scope-choice"><span className="workspace-scope-label">{label}</span>
            {options ? <Select aria-label={selectLabel || label} placeholder={`Choose ${label.toLowerCase()}`} value={value ?? undefined}
              options={options} loading={loading} disabled={disabled || loading} onChange={change} showSearch optionFilterProp="label" />
              : <strong>{scope.name || 'No assignment'}</strong>}
            {description && <div className="workspace-scope-description">{description}</div>}
          </div>
        </div>
        <div ref={setControlsTarget} className="workspace-scope-controls" />
        {actions && <div className="workspace-scope-actions">{actions}</div>}
      </section>;
  return <ScopeContext.Provider value={{ ...scope, controlsTarget, setAnchorTarget }}>
    <DraftContext.Provider value={register}>
      {anchorTarget ? createPortal(bar, anchorTarget) : bar}
      <Form.Provider onFormChange={(_, info) => { forms.current = info.forms; }}>
        <div key={`${scope.kind}-${scope.id ?? 'all'}`} className="workspace-scope-content">{children}</div>
      </Form.Provider>
    </DraftContext.Provider>
  </ScopeContext.Provider>;
}
