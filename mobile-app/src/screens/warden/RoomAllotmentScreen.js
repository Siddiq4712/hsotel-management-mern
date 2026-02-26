import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { Bed, User, Users, Search, CheckCircle, ChevronRight, Info, Home } from 'lucide-react-native';

const RoomAllotmentScreen = () => {
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Selection States
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [step, setStep] = useState(1); // 1: Room Select, 2: Student Select, 3: Confirm

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const roomRes = await wardenAPI.getAvailableRooms();
      const studentRes = await wardenAPI.getStudents();
      
      setRooms(roomRes.data.data.filter(r => r.spacesLeft > 0));
      // Filter only unassigned students
      setStudents(studentRes.data.data.filter(s => 
        !s.tbl_RoomAllotments || s.tbl_RoomAllotments.length === 0
      ));
    } catch (e) {
      Alert.alert("Error", "Failed to load allotment data");
    } finally {
      setLoading(false);
    }
  };

  const handleAllotment = async () => {
    setLoading(true);
    try {
      for (const studentId of selectedStudents) {
        await wardenAPI.allotRoom({
          student_id: studentId,
          room_id: selectedRoom.id
        });
      }
      Alert.alert("Success", "Room allotment completed successfully!");
      resetFlow();
      loadInitialData();
    } catch (e) {
      Alert.alert("Error", e.message || "Allotment failed");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setSelectedRoom(null);
    setSelectedStudents([]);
    setStep(1);
  };

  const toggleStudent = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(sid => sid !== id));
    } else {
      if (selectedStudents.length >= selectedRoom.spacesLeft) {
        Alert.alert("Limit Reached", `This room only has ${selectedRoom.spacesLeft} spaces left.`);
        return;
      }
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  // --- UI Renders ---

  const renderRoomStep = () => (
    <View className="flex-1">
      <Text className="text-gray-500 mb-4">Select an available room to begin</Text>
      <FlatList
        data={rooms}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => { setSelectedRoom(item); setStep(2); }}
            className="bg-white p-4 rounded-2xl mb-3 border border-gray-100 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="bg-green-100 p-3 rounded-xl mr-4">
                <Home size={20} color="#10B981" />
              </View>
              <View>
                <Text className="font-bold text-gray-900 text-lg">Room {item.room_number}</Text>
                <Text className="text-gray-500 text-xs">{item.RoomType?.name} • Floor {item.floor}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-green-600 font-bold text-sm">{item.spacesLeft} Available</Text>
              <ChevronRight size={18} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderStudentStep = () => (
    <View className="flex-1">
      <View className="bg-indigo-50 p-4 rounded-2xl mb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-indigo-800 font-bold">Room {selectedRoom.room_number}</Text>
          <Text className="text-indigo-600 text-xs">Capacity: {selectedRoom.spacesLeft} more students</Text>
        </View>
        <Text className="text-indigo-800 font-black text-lg">{selectedStudents.length}/{selectedRoom.spacesLeft}</Text>
      </View>

      <TextInput 
        placeholder="Search unassigned students..."
        value={search}
        onChangeText={setSearch}
        className="bg-white p-4 rounded-xl border border-gray-200 mb-4"
      />

      <FlatList
        data={students.filter(s => s.userName.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => toggleStudent(item.id)}
            className={`p-4 rounded-2xl mb-3 border flex-row items-center justify-between ${
              selectedStudents.includes(item.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'
            }`}
          >
            <View className="flex-row items-center">
              <User size={20} color={selectedStudents.includes(item.id) ? "#4F46E5" : "#9CA3AF"} />
              <View className="ml-3">
                <Text className={`font-bold ${selectedStudents.includes(item.id) ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {item.userName}
                </Text>
                <Text className="text-gray-500 text-xs">Roll: {item.roll_number || 'N/A'}</Text>
              </View>
            </View>
            {selectedStudents.includes(item.id) && <CheckCircle size={20} color="#4F46E5" />}
          </TouchableOpacity>
        )}
      />

      <View className="flex-row space-x-3 mt-4">
        <TouchableOpacity onPress={() => setStep(1)} className="flex-1 bg-gray-200 p-4 rounded-2xl items-center">
          <Text className="font-bold text-gray-600">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          disabled={selectedStudents.length === 0}
          onPress={() => setStep(3)} 
          className={`flex-1 p-4 rounded-2xl items-center ${selectedStudents.length > 0 ? 'bg-indigo-600' : 'bg-indigo-300'}`}
        >
          <Text className="font-bold text-white">Next Step</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConfirmStep = () => (
    <ScrollView className="flex-1">
      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <Text className="text-xl font-bold text-gray-900 mb-4 text-center">Summary</Text>
        
        <View className="items-center mb-6">
          <View className="bg-indigo-100 p-4 rounded-full mb-2">
            <Bed size={32} color="#4F46E5" />
          </View>
          <Text className="text-2xl font-black text-gray-900">Room {selectedRoom.room_number}</Text>
          <Text className="text-gray-500">Floor {selectedRoom.floor} • {selectedRoom.RoomType?.name}</Text>
        </View>

        <Text className="font-bold text-gray-700 mb-3">Allocating to:</Text>
        {selectedStudents.map(id => {
          const student = students.find(s => s.id === id);
          return (
            <View key={id} className="flex-row items-center bg-gray-50 p-3 rounded-xl mb-2">
              <User size={16} color="#6B7280" />
              <Text className="ml-3 font-medium text-gray-800">{student?.userName}</Text>
            </View>
          );
        })}

        <View className="mt-8 flex-row space-x-3">
          <TouchableOpacity onPress={() => setStep(2)} className="flex-1 bg-gray-100 p-4 rounded-2xl items-center">
            <Text className="font-bold text-gray-600">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAllotment} className="flex-1 bg-green-600 p-4 rounded-2xl items-center">
            <Text className="font-bold text-white">Confirm & Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <View className="p-4 flex-1">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Room Allotment</Text>
          <View className="bg-gray-200 px-3 py-1 rounded-full">
            <Text className="text-[10px] font-bold text-gray-600 uppercase">Step {step}/3</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" className="mt-20" />
        ) : (
          <>
            {step === 1 && renderRoomStep()}
            {step === 2 && renderStudentStep()}
            {step === 3 && renderConfirmStep()}
          </>
        )}
      </View>
    </View>
  );
};

export default RoomAllotmentScreen;