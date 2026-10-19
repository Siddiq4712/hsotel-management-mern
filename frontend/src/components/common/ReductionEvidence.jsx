import React, { useEffect, useState } from 'react';
import { Modal, Button, App, Spin } from 'antd';
import { reductionAPI } from '../../services/api';

export default function ReductionEvidence({ role, request }) {
  const { message } = App.useApp();
  const [preview, setPreview] = useState(null), [loading, setLoading] = useState(false);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);
  const open = async () => {
    setLoading(true);
    try {
      const response = await reductionAPI.document(role, request.id);
      setPreview({ url: URL.createObjectURL(response.data), mime: request.document.mime });
    } catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  };
  return <>
    <Button size="small" loading={loading} disabled={!request.document} onClick={open}>{request.document ? 'View document' : 'No document (legacy)'}</Button>
    <Modal open={Boolean(preview)} title={request.document?.name || 'Supporting document'} footer={null} width={900} onCancel={() => setPreview(null)} destroyOnHidden>
      {loading && <Spin />}
      {preview && (preview.mime === 'application/pdf'
        ? <iframe title="Supporting document" src={preview.url} style={{ width: '100%', height: '65vh', border: 0 }} />
        : <img src={preview.url} alt="Supporting document" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} />)}
      {preview && <a href={preview.url} download={request.document.name}>Download document</a>}
    </Modal>
  </>;
}
