import React from 'react';
import { ArrowLeft, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import './WorkspaceContextHeader.css';

export default function WorkspaceContextHeader({ title, description, scope, backTo, backLabel, actions, headingAs: Heading = 'h2' }) {
  return <header className="workspace-context-header">
    {backTo && backLabel && <Link to={backTo} className="workspace-context-back">
      <ArrowLeft size={14} aria-hidden="true" /> {backLabel}
    </Link>}
    <div className="workspace-context-heading">
      <div>
        <Heading>{title}</Heading>
        <p>{description}</p>
      </div>
      {(scope || actions) && <div className="workspace-context-actions">
        {scope && <span className="workspace-context-scope"><Building size={15} aria-hidden="true" />{scope}</span>}
        {actions}
      </div>}
    </div>
  </header>;
}
