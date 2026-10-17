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
      <div className="module-page bg-slate-50 min-h-screen">
        <Tabs 
          defaultActiveKey="types" 
          items={items} 
          className="custom-admin-tabs"
          type="card"
          size="large"
        />
      </div>
    </ConfigProvider>
  );
};

export default RoomManagementTabs;