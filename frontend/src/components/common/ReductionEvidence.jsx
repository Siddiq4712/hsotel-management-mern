import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, App, Spin } from 'antd';
import { reductionAPI } from '../../services/api';

export default function ReductionEvidence({ role, request }) {
  const { message } = App.useApp();
  const [preview, setPreview] = useState(null), [loading, setLoading] = useState(false);
  const version = useRef(0), previewUrl = useRef(null);
  const releasePreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  };
  useEffect(() => {
    setPreview(null);
    setLoading(false);
    return () => { ++version.current; releasePreview(); };
  }, [role, request.id]);
  const close = () => {
    ++version.current;
    releasePreview();
    setPreview(null);
    setLoading(false);
  };
  const open = async () => {
    const current = ++version.current;
    setLoading(true);
    try {
      const response = await reductionAPI.document(role, request.id);
      if (current !== version.current) return;
      releasePreview();
      previewUrl.current = URL.createObjectURL(response.data);
      setPreview({ url: previewUrl.current, mime: request.document.mime });
    } catch (error) { if (current === version.current) message.error(error.message); }
    finally { if (current === version.current) setLoading(false); }
  };
  return <>
    <Button size="small" loading={loading} disabled={!request.document} onClick={open}>{request.document ? 'View document' : 'No document (legacy)'}</Button>
    <Modal open={Boolean(preview)} title={request.document?.name || 'Supporting document'} footer={null} width={900} onCancel={close} destroyOnHidden>
      {loading && <Spin />}
      {preview && (preview.mime === 'application/pdf'
        ? <iframe title="Supporting document" src={preview.url} style={{ width: '100%', height: '65vh', border: 0 }} />
        : <img src={preview.url} alt="Supporting document" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} />)}
      {preview && <a href={preview.url} download={request.document.name}>Download document</a>}
    </Modal>
  </>;
}
