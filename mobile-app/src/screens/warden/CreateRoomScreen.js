import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, FlatList } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { Building2, DoorRight, Layers, Save } from 'lucide-react-native';
import { layoutUtils } from '../../utils/layoutUtils'; // Use existing utils

const CreateRoomScreen = () => {
  const [layout, setLayout] = useState(null);
  const [floors, setFloors] = useState(1);
  const [buildingType, setBuildingType] = useState('single');
  const [roomsPerSide, setRoomsPerSide] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [grid, setGrid] = useState([]);

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    try {
      const res = await wardenAPI.getLayout();
      if (res.data.data) {
        const data = res.data.data;
        setLayout(data);
        setFloors(data.floors || 1);
        setBuildingType(data.building_type || 'single');
        setRoomsPerSide({
          top: data.top_rooms || 0,
          bottom: data.bottom_rooms || 0,
          left: data.left_rooms || 0,
          right: data.right_rooms || 0
        });
        setGrid(layoutUtils.generateGridShape({ buildingType: data.building_type, ...roomsPerSide, uOpenSide: data.open_side, lOrientation: data.orientation }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load layout');
    }
  };

  const saveLayout = async () => {
    try {
      await wardenAPI.saveLayout({ floors, building_type: buildingType, ...roomsPerSide });
      Alert.alert('Success', 'Layout saved');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderGridCell = (slot, active) => (
    <View className={`w-16 h-16 border rounded ${active ? 'bg-blue-100 border-blue-400' : 'bg-gray-100 border-gray-300'}`} />
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold mb-4">Hostel Layout</Text>
        <View className="space-y-4">
          <View className="flex-row space-x-2">
            <TextInput value={floors.toString()} onChangeText={(v) => setFloors(parseInt(v))} keyboardType="numeric" className="flex-1 border p-2 rounded" />
            <TouchableOpacity onPress={saveLayout} className="bg-green-600 p-3 rounded">
              <Save size={20} color="white" />
            </TouchableOpacity>
          </View>
          {/* Simplified grid render - loop over floors and grid */}
          {Array.from({ length: floors }).map((_, floor) => (
            <View key={floor}>
              <Text className="font-bold mb-2">Floor {floors - floor}</Text>
              <FlatList
                data={grid}
                renderItem={({ item: row }) => (
                  <View className="flex-row">
                    {row.map((cell, col) => renderGridCell(`${floor}-${0}-${col}`, cell !== 'EMPTY'))}
                  </View>
                )}
                horizontal
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default CreateRoomScreen;