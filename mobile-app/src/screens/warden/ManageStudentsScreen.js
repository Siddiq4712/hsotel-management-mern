import { Text } from "../../components/common/ReferenceDesign";
import MoreSectionNav from '../../components/common/MoreSectionNav';
import Screen from '../../components/common/Screen';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import colors from '../../theme/colors';
import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';

import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { User, Search, ChevronRight } from 'lucide-react-native';

const ManageStudentsScreen = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [enrollmentYear, setEnrollmentYear] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async (yearOverride) => {
    setLoading(true);
    try {
      const yearValue =
        typeof yearOverride === 'string' ? yearOverride : enrollmentYear;
      const trimmedYear = yearValue?.trim();
      const response = await wardenAPI.getStudents(
        trimmedYear ? { enrollment_year: trimmedYear } : undefined
      );
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
            <User size={20} color={colors.primary} />
          </View>
          <View>
            <Text className="font-bold text-gray-900">{item.userName}</Text>
            <Text className="text-gray-500 text-sm">
              Roll: {item.roll_number || 'N/A'}
            </Text>
            <Text className="text-gray-500 text-xs">
              Enrollment Year: {item.enrollment_year || 'N/A'}
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
          <ChevronRight size={18} color={colors.mutedText} />
        </View>
      </TouchableOpacity>
    );
  };

  const filteredStudents = students.filter(
    (s) =>
      s.userName?.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Screen className="flex-1 bg-background">
      <Header />
      <MoreSectionNav />

      <View className="p-4 flex-1">
        <Text className="text-2xl font-bold text-indigo-900 mb-4">
          Manage Students
        </Text>

        <View className="relative mb-4">
          <Search
            size={20}
            color={colors.mutedText}
            style={{ position: 'absolute', left: 12, top: 14 }}
          />
          <Input
            placeholder="Search by name or roll..."
            value={search}
            onChangeText={setSearch}
            className="pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200"
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Filter by Enrollment Year
          </Text>
          <View className="flex-row flex-wrap items-center">
            <Input
              placeholder="e.g. 2025"
              value={enrollmentYear}
              onChangeText={setEnrollmentYear}
              keyboardType="number-pad"
              maxLength={4}
              className="w-full mb-3 px-4 py-3 bg-white rounded-xl border border-gray-200"
            />
            <Button
              onPress={() => fetchStudents()}
              className="flex-1 mr-2 px-4 py-3 bg-blue-600 rounded-xl"
            >
              <Text className="text-white font-semibold">Apply</Text>
            </Button>
            <Button variant="secondary"
              onPress={() => {
                setEnrollmentYear('');
                fetchStudents('');
              }}
              className="flex-1 ml-2 px-4 py-3 bg-gray-100 rounded-xl"
            >
              <Text className="text-gray-700 font-semibold">Clear</Text>
            </Button>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
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

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" className="p-4">
            {selectedStudent && (
              <>
                <Text className="text-2xl font-bold">
                  {selectedStudent.userName}
                </Text>
                <Text className="text-gray-500 mb-4">
                  Roll: {selectedStudent.roll_number || 'N/A'}
                </Text>
                <Text className="text-gray-500 mb-4">
                  Enrollment Year: {selectedStudent.enrollment_year || 'N/A'}
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
    </Screen>
  );
};

export default ManageStudentsScreen;
