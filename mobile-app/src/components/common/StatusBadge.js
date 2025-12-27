import React from 'react';
import { View, Text } from 'react-native';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react-native';

const STATUS_MAP = {
  leave: {
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: '#F59E0B' },
    approved: { label: 'Approved', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: '#10B981' },
    rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, color: '#EF4444' },
  },

  complaint: {
    submitted: { label: 'Submitted', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: '#F59E0B' },
    in_progress: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, color: '#3B82F6' },
    resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: '#10B981' },
    closed: { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, color: '#6B7280' },
  },

  foodOrder: {
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: '#F59E0B' },
    confirmed: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, color: '#3B82F6' },
    preparing: { label: 'Preparing', bg: 'bg-purple-100', text: 'text-purple-800', icon: Clock, color: '#A855F7' },
    ready: { label: 'Ready', bg: 'bg-cyan-100', text: 'text-cyan-800', icon: CheckCircle, color: '#06B6D4' },
    delivered: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: '#10B981' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, color: '#EF4444' },
  },

  transaction: {
    completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: '#10B981' },
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: '#F59E0B' },
    failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, color: '#EF4444' },
    cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, color: '#6B7280' },
  },

  bill: {
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: '#F59E0B' },
    paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: '#10B981' },
    overdue: { label: 'Overdue', bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle, color: '#EF4444' },
  },
};

const StatusBadge = ({ status, type = 'leave' }) => {
  const data = STATUS_MAP[type]?.[status];

  if (!data) {
    return (
      <View className="px-2 py-1 rounded-full bg-gray-100">
        <Text className="text-xs font-semibold text-gray-800">Unknown</Text>
      </View>
    );
  }

  const Icon = data.icon;

  return (
    <View className={`px-2 py-1 rounded-full flex-row items-center ${data.bg}`}>
      {Icon && (
        <View className="mr-1">
          <Icon size={14} color={data.color} />
        </View>
      )}
      <Text className={`text-xs font-semibold ${data.text}`}>
        {data.label}
      </Text>
    </View>
  );
};

export default StatusBadge;
