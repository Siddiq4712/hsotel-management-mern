import React, { useState } from 'react';
import { Tabs } from 'antd';
import { Bed } from 'lucide-react';
import ManageRoomTypes from './ManageRoomTypes';
import ManageRooms from './ManageRooms';
import WorkspacePageHeader from '../common/WorkspacePageHeader';

const RoomManagementTabs = () => {
  const [activeTab, setActiveTab] = useState('types');
  const items = [
    {
      key: 'types',
      label: 'Room Types',
      children: <ManageRoomTypes active={activeTab === 'types'} />,
    },
    {
      key: 'rooms',
      label: 'Rooms',
      children: <ManageRooms active={activeTab === 'rooms'} />,
    },
  ];

  return (
    <section className="module-page" aria-labelledby="manage-rooms-title">
      <WorkspacePageHeader id="manage-rooms-title" title="Manage Rooms" icon={Bed}
        description="Manage room types, room numbers, and occupancy across hostels." />
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </section>
  );
};

export default RoomManagementTabs;
