import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput
} from 'react-native';

import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { User, Search, ChevronRight } from 'lucide-react-native';

const ManageStudentsScreen = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getStudents();
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoomInfo = (student) => {
    const allotment = student.tbl_RoomAllotments?.[0];
    return allotment
      ? {
          roomNumber: allotment.HostelRoom?.room_number,
          type: allotment.HostelRoom?.RoomType?.name
        }
      : null;
  };

  const renderStudent = ({ item }) => {
    const roomInfo = getRoomInfo(item);

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedStudent(item);
          setModalVisible(true);
        }}
        className="bg-white p-4 rounded-2xl mb-3 border border-gray-100 flex-row items-center justify-between"
      >
        <View className="flex-row items-center flex-1">
          <View className="bg-blue-100 p-3 rounded-full mr-4">
            <User size={20} color="#3B82F6" />
          </View>
          <View>
            <Text className="font-bold text-gray-900">{item.username}</Text>
            <Text className="text-gray-500 text-sm">
              Roll: {item.roll_number || 'N/A'}
            </Text>
          </View>
        </View>

        <View className="items-end">
          {roomInfo ? (
            <>
              <Text className="font-medium text-gray-900">
                Room {roomInfo.roomNumber}
              </Text>
              <Text className="text-gray-500 text-xs">{roomInfo.type}</Text>
            </>
          ) : (
            <Text className="text-orange-600 text-sm font-medium">
              Not Assigned
            </Text>
          )}
          <ChevronRight size={18} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const filteredStudents = students.filter(
    (s) =>
      s.username?.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />

      <View className="p-4 flex-1">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Manage Students
        </Text>

        <View className="relative mb-4">
          <Search
            size={20}
            color="#9CA3AF"
            style={{ position: 'absolute', left: 12, top: 14 }}
          />
          <TextInput
            placeholder="Search by name or roll..."
            value={search}
            onChangeText={setSearch}
            className="pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" />
        ) : (
          <FlatList
            data={filteredStudents}
            renderItem={renderStudent}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={
              <Text className="text-center text-gray-400 mt-10">
                No students found
              </Text>
            }
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide">
        <View className="flex-1 bg-white">
          <View className="p-4 border-b flex-row justify-between">
            <Text className="text-xl font-bold">Student Details</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text className="text-gray-500">Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="p-4">
            {selectedStudent && (
              <>
                <Text className="text-2xl font-bold">
                  {selectedStudent.username}
                </Text>
                <Text className="text-gray-500 mb-4">
                  Roll: {selectedStudent.roll_number || 'N/A'}
                </Text>

                <Text className="font-bold mb-2">Room Assignment</Text>
                {getRoomInfo(selectedStudent) ? (
                  <Text className="text-green-600">
                    Room {getRoomInfo(selectedStudent).roomNumber}
                  </Text>
                ) : (
                  <Text className="text-orange-600">Not Assigned</Text>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default ManageStudentsScreen;
