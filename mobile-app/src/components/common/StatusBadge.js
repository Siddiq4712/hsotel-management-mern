import { Text } from "./ReferenceDesign";
import colors from '../../theme/colors';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react-native';

const STATUS_MAP = {
  leave: {
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: colors.warning },
    approved: { label: 'Approved', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: colors.success },
    rejected: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, color: colors.danger },
  },

  complaint: {
    submitted: { label: 'Submitted', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: colors.warning },
    in_progress: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, color: colors.primary },
    resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: colors.success },
    closed: { label: 'Closed', bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, color: colors.mutedText },
  },

  foodOrder: {
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: colors.warning },
    confirmed: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, color: colors.primary },
    preparing: { label: 'Preparing', bg: 'bg-purple-100', text: 'text-purple-800', icon: Clock, color: colors.primary },
    ready: { label: 'Ready', bg: 'bg-cyan-100', text: 'text-cyan-800', icon: CheckCircle, color: colors.accent },
    delivered: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: colors.success },
    cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, color: colors.danger },
  },

  transaction: {
    completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: colors.success },
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: colors.warning },
    failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, color: colors.danger },
    cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, color: colors.mutedText },
  },

  bill: {
    pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, color: colors.warning },
    paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, color: colors.success },
    overdue: { label: 'Overdue', bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle, color: colors.danger },
  },
};

const StatusBadge = ({ status, type = 'leave' }) => {
  const data = STATUS_MAP[type]?.[status];

  if (!data) {
    return (
      <View className="bg-gray-100" style={styles.badge}>
        <Text className="text-xs font-semibold text-gray-800" style={styles.label}>Unknown</Text>
      </View>
    );
  }

  const Icon = data.icon;

  return (
    <View className={data.bg} style={styles.badge}>
      {Icon && (
        <View style={styles.icon}>
          <Icon size={14} color={data.color} />
        </View>
      )}
      <Text className={`text-xs font-semibold ${data.text}`} style={styles.label}>
        {data.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', flexShrink: 1,
    maxWidth: '100%', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  icon: { flexShrink: 0 },
  label: { flexShrink: 1, paddingEnd: 2 },
});

export default StatusBadge;
