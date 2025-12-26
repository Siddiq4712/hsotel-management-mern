import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { wardenAPI } from '../../api/api';
import Header from '../../components/common/Header';
import { MapPin, Save } from 'lucide-react-native';
import { layoutUtils } from '../../utils/layoutUtils';

const ViewLayoutScreen = () => {
  const [layout, setLayout] = useState(null);
  const [grid, setGrid] = useState([]);

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    try {
      const res = await wardenAPI.getLayout();
      if (res.data.data) {
        setLayout(res.data.data);
        const shape = layoutUtils.generateGridShape({
          buildingType: res.data.data.building_type,
          topRooms: res.data.data.top_rooms || 0,
          bottomRooms: res.data.data.bottom_rooms || 0,
          leftRooms: res.data.data.left_rooms || 0,
          rightRooms: res.data.data.right_rooms || 0,
          uOpenSide: res.data.data.open_side,
          lOrientation: res.data.data.orientation
        });
        setGrid(shape);
      }
    } catch (error) {
      console.error('Layout load error:', error);
    }
  };

  const renderFloor = (floorIdx) => (
    <View key={floorIdx}>
      <Text className="font-bold mb-2">Floor {layout.floors - floorIdx}</Text>
      <FlatList
        data={grid}
        horizontal
        renderItem={({ item: row, index: rowIdx }) => (
          <View className="flex-row">
            {row.map((cell, colIdx) => {
              const slot = `${floorIdx}-${rowIdx}-${colIdx}`;
              return <View key={slot} className={`w-16 h-16 border rounded m-1 ${cell !== 'EMPTY' ? 'bg-blue-100' : 'bg-gray-100'}`} />;
            })}
          </View>
        )}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <View className="p-4">
        <TouchableOpacity onPress={() => navigation.navigate('CreateRoom')} className="bg-blue-600 p-3 rounded mb-4">
          <Text className="text-white text-center">Edit Layout</Text>
        </TouchableOpacity>
        <FlatList
          data={Array.from({ length: layout?.floors || 1 })}
          renderItem={({ item, index }) => renderFloor(index)}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>
    </View>
  );
};

export default ViewLayoutScreen;