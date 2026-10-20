import MoreSectionNav from '../../components/common/MoreSectionNav';
import Screen from '../../components/common/Screen';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Picker, Alert } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import StatusBadge from '../../components/common/StatusBadge';
import { Bed, User, Calendar } from 'lucide-react-native';

const RoomRequestsScreen = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await wardenAPI.getRoomRequests();
      setRequests(res.data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const processRequest = async () => {
    try {
      await wardenAPI.decideRoomRequest(selectedRequest.id, { decision, remarks });
      Alert.alert('Success', `Request ${decision}`);
      setModalVisible(false);
      fetchRequests();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderRequest = ({ item }) => (
    <Card className="bg-white p-4 rounded-2xl mb-3 border border-gray-100">
      <View className="flex-row justify-between">
        <Text className="font-bold text-gray-900">{item.Student?.userName}</Text>
        <StatusBadge status={item.status} type="leave" />
      </View>
      <Text className="text-gray-600">Room {item.Room?.room_number}</Text>
      <Button onPress={() => { setSelectedRequest(item); setModalVisible(true); }} className="bg-blue-600 p-2 rounded mt-2">
        <Text className="text-white text-center">Process</Text>
      </Button>
    </Card>
  );

  return (
    <Screen className="flex-1 bg-background">
      <Header />
      <MoreSectionNav />
      <View className="p-4">
        <FlatList data={requests} renderItem={renderRequest} keyExtractor={item => item.id.toString()} />
      </View>
      <Modal visible={modalVisible} animationType="slide">
        <View className="flex-1 bg-white p-6">
          <Text className="text-xl font-bold mb-4">Process Request</Text>
          <Picker selectedValue={decision} onValueChange={setDecision}>
            <Picker.Item label="Approve" value="approved" />
            <Picker.Item label="Reject" value="rejected" />
          </Picker>
          <Input placeholder="Remarks" value={remarks} onChangeText={setRemarks} multiline className="border p-3 rounded mt-3" />
          <Button onPress={processRequest} className="bg-indigo-600 p-4 rounded mt-4">
            <Text className="text-white text-center font-bold">Confirm</Text>
          </Button>
        </View>
      </Modal>
    </Screen>
  );
};

export default RoomRequestsScreen;