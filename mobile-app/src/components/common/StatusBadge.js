import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react-native';

const StatusBadge = ({ status, type = 'default' }) => {
  let classes = "";
  let label = "";
  let Icon = null;
  let iconColor = "";

  if (type === 'leave') {
    switch (status) {
      case 'pending':
        classes = 'bg-yellow-100 text-yellow-800';
        label = 'Pending';
        Icon = Clock;
        iconColor = "#F59E0B"; // Yellow-500
        break;
      case 'approved':
        classes = 'bg-green-100 text-green-800';
        label = 'Approved';
        Icon = CheckCircle;
        iconColor = "#10B981"; // Green-500
        break;
      case 'rejected':
        classes = 'bg-red-100 text-red-800';
        label = 'Rejected';
        Icon = XCircle;
        iconColor = "#EF4444"; // Red-500
        break;
      default:
        classes = 'bg-gray-100 text-gray-800';
        label = 'Unknown';
        break;
    }
  } else if (type === 'complaint') {
    switch (status) {
      case 'submitted':
        classes = 'bg-yellow-100 text-yellow-800';
        label = 'Submitted';
        Icon = Clock;
        iconColor = "#F59E0B";
        break;
      case 'in_progress':
        classes = 'bg-blue-100 text-blue-800';
        label = 'In Progress';
        Icon = Clock; // Or another appropriate icon
        iconColor = "#3B82F6"; // Blue-500
        break;
      case 'resolved':
        classes = 'bg-green-100 text-green-800';
        label = 'Resolved';
        Icon = CheckCircle;
        iconColor = "#10B981";
        break;
      case 'closed':
        classes = 'bg-gray-100 text-gray-800';
        label = 'Closed';
        Icon = XCircle;
        iconColor = "#6B7280";
        break;
      default:
        classes = 'bg-gray-100 text-gray-800';
        label = 'Unknown';
        break;
    }
  } else if (type === 'foodOrder') {
     switch (status) {
      case 'pending':
        classes = 'bg-yellow-100 text-yellow-800';
        label = 'Pending';
        Icon = Clock;
        iconColor = "#F59E0B";
        break;
      case 'confirmed':
        classes = 'bg-blue-100 text-blue-800';
        label = 'Confirmed';
        Icon = CheckCircle; // Different icon maybe?
        iconColor = "#3B82F6";
        break;
      case 'preparing':
        classes = 'bg-purple-100 text-purple-800';
        label = 'Preparing';
        Icon = Clock;
        iconColor = "#A855F7";
        break;
      case 'ready':
        classes = 'bg-cyan-100 text-cyan-800';
        label = 'Ready';
        Icon = CheckCircle;
        iconColor = "#06B6D4";
        break;
      case 'delivered':
        classes = 'bg-green-100 text-green-800';
        label = 'Delivered';
        Icon = CheckCircle;
        iconColor = "#10B981";
        break;
      case 'cancelled':
        classes = 'bg-red-100 text-red-800';
        label = 'Cancelled';
        Icon = XCircle;
        iconColor = "#EF4444";
        break;
      default:
        classes = 'bg-gray-100 text-gray-800';
        label = 'Unknown';
        break;
    }
  } else if (type === 'transaction') {
    switch (status) {
      case 'completed':
        classes = 'bg-green-100 text-green-800';
        label = 'Completed';
        Icon = CheckCircle;
        iconColor = "#10B981";
        break;
      case 'pending':
        classes = 'bg-yellow-100 text-yellow-800';
        label = 'Pending';
        Icon = Clock;
        iconColor = "#F59E0B";
        break;
      case 'failed':
        classes = 'bg-red-100 text-red-800';
        label = 'Failed';
        Icon = XCircle;
        iconColor = "#EF4444";
        break;
      case 'cancelled':
        classes = 'bg-gray-100 text-gray-800';
        label = 'Cancelled';
        Icon = XCircle;
        iconColor = "#6B7280";
        break;
      default:
        classes = 'bg-gray-100 text-gray-800';
        label = 'Unknown';
        break;
    }
  } else if (type === 'bill') {
    switch (status) {
      case 'pending':
        classes = 'bg-yellow-100 text-yellow-800';
        label = 'Pending';
        Icon = Clock;
        iconColor = "#F59E0B";
        break;
      case 'paid':
        classes = 'bg-green-100 text-green-800';
        label = 'Paid';
        Icon = CheckCircle;
        iconColor = "#10B981";
        break;
      case 'overdue':
        classes = 'bg-red-100 text-red-800';
        label = 'Overdue';
        Icon = AlertTriangle;
        iconColor = "#EF4444";
        break;
      default:
        classes = 'bg-gray-100 text-gray-800';
        label = 'Unknown';
        break;
    }
  }

  return (
    <View className={`px-2 py-1 rounded-full flex-row items-center justify-center ${classes}`}>
      {Icon && <Icon size={14} className="mr-1" color={iconColor} />}
      <Text className={`text-xs font-semibold ${classes.includes('text-') ? classes.split(' ').find(cls => cls.startsWith('text-')) : ''}`}>{label}</Text>
    </View>
  );
};

export default StatusBadge;
