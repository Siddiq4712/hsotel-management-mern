import React from 'react';
import { Tabs, ConfigProvider, theme, App as AntdApp } from 'antd';
import { Utensils, Building2 } from 'lucide-react';
import MyMessCharges from './MyMessCharges';
import MyHostelFee from './MyHostelFee';
// import MyFeeHistory from './MyFeeHistory';

const StudentFeeTabs = () => {
  const items = [
    {
      key: 'mess',
      label: (
        <span className="flex items-center gap-2">
          <Utensils size={18} />
          Mess Charges
        </span>
      ),
      children: <MyMessCharges isTabbed={true} />,
    },
    {
      key: 'hostel',
      label: (
        <span className="flex items-center gap-2">
          <Building2 size={18} />
          Hostel Fees
        </span>
      ),
      children: <MyHostelFee isTabbed={true} />,
    },
  ];

  return (
    <ConfigProvider 
      theme={{ 
        algorithm: theme.defaultAlgorithm, 
        token: { colorPrimary: '#2563eb', borderRadius: 12 } 
      }}
    >
      <AntdApp>
        <div className="bg-slate-50 min-h-screen">
          <Tabs 
            defaultActiveKey="mess" 
            items={items} 
            className="fee-management-tabs"
            type="card"
            size="large"
          />
        </div>
        {/* Standard style tag to avoid React boolean attribute warnings */}
        <style>{`
          .fee-management-tabs .ant-tabs-nav {
            margin-bottom: 0 !important;
            padding: 8px 2rem 0 2rem;
            background: white;
            border-bottom: 1px solid #e2e8f0;
          }
          .fee-management-tabs .ant-tabs-tab {
            border: none !important;
            background: transparent !important;
            padding: 12px 24px !important;
            transition: all 0.3s;
          }
          .fee-management-tabs .ant-tabs-tab-active {
            border-bottom: 3px solid #2563eb !important;
            background: #f8fafc !important;
          }
          .fee-management-tabs .ant-tabs-tab:hover {
            color: #2563eb !important;
          }
        `}</style>
      </AntdApp>
    </ConfigProvider>
  );
};

export default StudentFeeTabs;