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
        <div className="module-page bg-slate-50 min-h-screen">
          <Tabs 
            defaultActiveKey="mess" 
            items={items} 
            className="fee-management-tabs"
            type="card"
            size="large"
          />
        </div>
        {/* Standard style tag to avoid React boolean attribute warnings */}
      </AntdApp>
    </ConfigProvider>
  );
};

export default StudentFeeTabs;