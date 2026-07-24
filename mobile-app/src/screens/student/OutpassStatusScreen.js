import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { outpassAPI } from '../../api/api';
import { QrCode, Clock, CheckCircle2, AlertTriangle, ChevronRight, Plus, RefreshCw, XCircle } from 'lucide-react-native';
import moment from 'moment';

const OutpassStatusScreen = ({ navigation }) => {
  const [currentOutpass, setCurrentOutpass] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        outpassAPI.getCurrentOutpass(),
        outpassAPI.getMyOutpasses()
      ]);
      setCurrentOutpass(currentRes.data.data);
      setHistory(historyRes.data.data || []);
    } catch (error) {
      console.error('Error fetching student outpasses:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleCancel = async () => {
    if (!currentOutpass) return;
    Alert.alert(
      'Cancel Outpass',
      'Are you sure you want to cancel this outpass request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await outpassAPI.cancelOutpass(currentOutpass.id);
              Alert.alert('Cancelled', 'Outpass request has been cancelled.');
              fetchData();
            } catch (error) {
              Alert.alert('Error', error.message.replace('API Error: ', ''));
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-amber-500 bg-amber-50',
      approved: 'text-blue-500 bg-blue-50',
      outside: 'text-violet-500 bg-violet-50',
      completed: 'text-emerald-500 bg-emerald-50',
      cancelled: 'text-gray-400 bg-gray-50',
      rejected: 'text-rose-500 bg-rose-50',
      expired: 'text-red-500 bg-red-50',
      late_return: 'text-red-500 bg-red-50'
    };
    return colors[status] || 'text-gray-500 bg-gray-50';
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      {/* Current/Active Outpass Card */}
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" className="my-10" />
      ) : currentOutpass ? (
        <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6 items-center">
          <View className="w-full flex-row justify-between items-center mb-4">
            <Text className="text-gray-900 font-extrabold text-lg">Active Gate Pass</Text>
            <View className={`px-3 py-1 rounded-full ${getStatusColor(currentOutpass.status)}`}>
              <Text className="text-xs font-bold uppercase">{currentOutpass.status}</Text>
            </View>
          </View>

          {/* Details */}
          <View className="w-full space-y-2 mb-6">
            <Text className="text-gray-800 font-bold text-sm">Purpose: <Text className="font-normal text-gray-600">{currentOutpass.purpose}</Text></Text>
            <Text className="text-gray-800 font-bold text-sm">To: <Text className="font-normal text-gray-600">{currentOutpass.destination}</Text></Text>
            <Text className="text-gray-800 font-bold text-sm">Exit: <Text className="font-normal text-gray-600">{moment(currentOutpass.from_date).format('lll')}</Text></Text>
            <Text className="text-gray-800 font-bold text-sm">Expect Return: <Text className="font-normal text-gray-600">{moment(currentOutpass.to_date).format('lll')}</Text></Text>
          </View>

          {/* QR Display if approved or outside */}
          {(currentOutpass.status === 'approved' || currentOutpass.status === 'outside') && currentOutpass.qr_token ? (
            <View className="items-center mb-6">
              <View className="p-4 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 mb-3">
                <Image 
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${currentOutpass.qr_token}` }}
                  className="w-48 h-48"
                />
              </View>
              <Text className="text-gray-400 text-xs font-semibold text-center px-4">
                Present this QR code to the gate security officer on exit and return.
              </Text>
            </View>
          ) : currentOutpass.status === 'pending' ? (
            <View className="w-full items-center p-6 bg-amber-50/50 border border-amber-100 rounded-3xl mb-6">
              <Clock size={40} color="#D97706" />
              <Text className="text-amber-800 font-bold text-center mt-3">Pending Warden Approval</Text>
              <Text className="text-amber-600 text-xs text-center mt-1">Your outpass request is currently in the review queue.</Text>
            </View>
          ) : null}

          {/* Cancel button for pending */}
          {currentOutpass.status === 'pending' && (
            <TouchableOpacity 
              onPress={handleCancel}
              disabled={cancelling}
              className="w-full bg-rose-50 border border-rose-100 p-4 rounded-2xl items-center flex-row justify-center space-x-2"
            >
              <XCircle size={18} color="#EF4444" />
              <Text className="text-rose-600 font-extrabold">Cancel Request</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm mb-6 items-center">
          <QrCode size={60} color="#9CA3AF" />
          <Text className="text-gray-800 font-bold text-lg mt-4 text-center">No Active Outpass</Text>
          <Text className="text-gray-400 text-sm text-center mt-2 mb-6">
            You don't have any active outpass request. Submit a request if you need to leave the hostel.
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('OutpassRequest')}
            className="bg-indigo-600 px-6 py-4 rounded-2xl flex-row items-center space-x-2"
          >
            <Plus size={18} color="#fff" />
            <Text className="text-white font-extrabold">Request Outpass</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Outpass History */}
      <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-8">
        <Text className="text-gray-900 font-extrabold text-base mb-4">Outpass Logs History</Text>
        
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View className="flex-row justify-between items-center py-3.5 border-b border-gray-50">
              <View className="space-y-1">
                <Text className="text-gray-800 font-bold text-sm">{item.purpose}</Text>
                <Text className="text-gray-400 text-xs font-semibold">To: {item.destination}</Text>
                <Text className="text-gray-400 text-[10px]">
                  {moment(item.from_date).format('ll')} - {moment(item.to_date).format('ll')}
                </Text>
              </View>
              <View className={`px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                <Text className="text-[10px] font-bold uppercase">{item.status.replace('_', ' ')}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-gray-400 text-sm text-center py-6">No previous outpass logs found</Text>
          }
        />
      </View>
    </ScrollView>
  );
};

export default OutpassStatusScreen;
