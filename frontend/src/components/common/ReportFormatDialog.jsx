import React, { useEffect, useState } from 'react';
import { Modal, Radio, Space, Typography } from 'antd';
import { REPORT_FORMAT_EVENT } from '../../services/reportFormat';

const labels = { preview: 'On-screen preview', xlsx: 'Excel (.xlsx)', csv: 'CSV (.csv)', pdf: 'PDF / Print (save as PDF in the print dialog)' };
export default function ReportFormatDialog() {
  const [queue, setQueue] = useState([]);
  const [format, setFormat] = useState();
  const request = queue[0];
  useEffect(() => {
    const receive = event => setQueue(previous => [...previous, event.detail]);
    window.addEventListener(REPORT_FORMAT_EVENT, receive);
    return () => window.removeEventListener(REPORT_FORMAT_EVENT, receive);
  }, []);
  const finish = value => { request.resolve(value); setQueue(previous => previous.slice(1)); setFormat(undefined); };
  return <Modal title={request?.title || 'Choose report format'} open={Boolean(request)} onCancel={() => finish(null)}
    onOk={() => finish(format)} okText="Generate report" okButtonProps={{ disabled: !format }} destroyOnHidden>
    <Typography.Paragraph>Select a format to continue. Cancel closes this request without generating or downloading a report.</Typography.Paragraph>
    <Radio.Group value={format} onChange={event => setFormat(event.target.value)}><Space orientation="vertical">
      {(request?.formats || []).map(value => <Radio key={value} value={value}>{labels[value]}</Radio>)}
    </Space></Radio.Group>
  </Modal>;
}
