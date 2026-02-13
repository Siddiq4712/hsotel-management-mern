import React from 'react';
import { Tabs, ConfigProvider, theme } from 'antd';
import { Bed, LayoutGrid } from 'lucide-react';
import ManageRoomTypes from './ManageRoomTypes';
import ManageRooms from './ManageRooms';

const RoomManagementTabs = () => {
  const items = [
    {
      key: 'types',
      label: (
        <span className="flex items-center gap-2">
          <LayoutGrid size={18} />
          Room Types (Templates)
        </span>
      ),
      children: <ManageRoomTypes isTabbed={true} />,
    },
    {
      key: 'rooms',
      label: (
        <span className="flex items-center gap-2">
          <Bed size={18} />
          Manage Rooms
        </span>
      ),
      children: <ManageRooms isTabbed={true} />,
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb' } }}>
      <div className="bg-slate-50 min-h-screen">
        <Tabs 
          defaultActiveKey="types" 
          items={items} 
          className="custom-admin-tabs"
          type="card"
          size="large"
        />
      </div>
      <style jsx global>{`
        .custom-admin-tabs .ant-tabs-nav {
          margin-bottom: 0 !important;
          padding: 0 2rem;
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }
        .custom-admin-tabs .ant-tabs-tab {
          border: none !important;
          background: transparent !important;
          padding: 12px 20px !important;
        }
        .custom-admin-tabs .ant-tabs-tab-active {
          border-bottom: 2px solid #2563eb !important;
        }
      `}</style>
    </ConfigProvider>
  );
};

export default RoomManagementTabs;