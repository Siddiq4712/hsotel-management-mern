import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Building, MapPin, Phone, Mail, Users, Bed } from 'lucide-react';

const ManageHostels = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    try {
      const response = await adminAPI.getHostels();
      setHostels(response.data.data || []);
    } catch (error) {
      console.error('Error fetching hostels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manage Hostels</h1>
        <p className="text-gray-600 mt-2">View and manage all hostels in the system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hostels.map((hostel) => (
          <div key={hostel.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Building className="text-blue-600" size={24} />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{hostel.name}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {hostel.address && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={16} className="mr-2" />
                  {hostel.address}
                </div>
              )}

              {hostel.contact_number && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-2" />
                  {hostel.contact_number}
                </div>
              )}

              {hostel.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail size={16} className="mr-2" />
                  {hostel.email}
                </div>
              )}

              <div className="flex items-center text-sm text-gray-600">
                <Users size={16} className="mr-2" />
                Capacity: {hostel.capacity}
              </div>

              <div className="text-sm text-gray-600">
                <div className="flex items-center">
                  <Bed size={16} className="mr-2" />
                  Rooms: {hostel.tbl_HostelRooms?.length || 0}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Created: {new Date(hostel.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hostels.length === 0 && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hostels</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new hostel.
          </p>
        </div>
      )}
    </div>
  );
};

export default ManageHostels;
