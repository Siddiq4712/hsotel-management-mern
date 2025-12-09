import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal, Image } from "react-native";
import { studentAPI } from "../../api/api";
import { Home, Users, Bed, DoorOpen, XCircle } from 'lucide-react-native';
import Header from '../../components/common/Header';
import { indexToLetters, lettersToIndex, parseSlot, deriveSlotFromRoomNumber, generateGridShape } from '../../utils/layoutUtils';
import RoomGridCell from '../../components/student/RoomGridCell';

const EntranceLabel = ({ side }) => {
  if (!side) return null;
  const label = <Text className="font-bold text-xs text-red-600">ENTRANCE</Text>;
  if (side === "t") return <View className="text-center mb-1">{label}</View>;
  if (side === "b") return <View className="text-center mt-1">{label}</View>;
  if (side === "l")
    return (
      <View className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full rotate-90">
        {label}
      </View>
    );
  if (side === "r")
    return (
      <View className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full -rotate-90">
        {label}
      </View>
    );
  return null;
};

const ViewRoomsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(null);
  const [grid, setGrid] = useState([]);
  const [cellMap, setCellMap] = useState({});
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [requestingRoomId, setRequestingRoomId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [layoutRes, roomsRes, typesRes, requestsRes] = await Promise.all([
        studentAPI.getLayout(),
        studentAPI.getRooms(),
        studentAPI.getRoomTypes(),
        studentAPI.getMyRoomRequests(),
      ]);

      const layoutData = layoutRes.data?.data;
      if (!layoutData) {
        setLayout(null);
        setGrid([]);
        setCellMap({});
        setMyRequests([]);
        return;
      }

      setLayout(layoutData);
      setGrid(
        generateGridShape({
          buildingType: layoutData.building_type,
          topRooms: layoutData.top_rooms ?? 0,
          bottomRooms: layoutData.bottom_rooms ?? 0,
          leftRooms: layoutData.left_rooms ?? 0,
          rightRooms: layoutData.right_rooms ?? 0,
          uOpenSide: layoutData.open_side,
          lOrientation: layoutData.orientation,
        }),
      );

      const rooms = roomsRes.data?.data || [];
      const types = typesRes.data?.data || [];
      const requests = requestsRes.data?.data || [];

      const roomPromises = rooms.map(async (room) => {
        const slot = room.layout_slot || deriveSlotFromRoomNumber(room.room_number, layoutData.floors);
        if (!slot) return null;

        const type = types.find((t) => t.id === room.room_type_id);
        let occupants = [];
        try {
          const occRes = await studentAPI.getRoomOccupants(room.id);
          occupants = occRes.data?.data || [];
        } catch (occErr) {
          console.warn("Failed to load occupants for room", room.id, occErr);
        }

        return {
          slot,
          data: {
            room_id: room.id,
            room_number: room.room_number,
            name: type?.name || room.room_number || "Room",
            capacity: type?.capacity || room.capacity || 1,
            inactive: !room.is_active,
            occupants,
            description: type?.description || "",
            floor: room.floor,
            remaining: Math.max(0, (type?.capacity || room.capacity || 1) - occupants.length),
            occupancy: occupants.length,
          },
        };
      });

      const resolved = (await Promise.all(roomPromises)).filter(Boolean);
      const mapping = resolved.reduce((acc, item) => {
        acc[item.slot] = item.data;
        return acc;
      }, {});

      setCellMap(mapping);
      setMyRequests(requests);
    } catch (err) {
      console.error("Failed to load layout for student:", err);
      setError(err?.message || "Failed to load room layout. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentRequestForRoom = useCallback(
    (roomId) => myRequests.find((req) => req.room_id === roomId && !["cancelled", "rejected"].includes(req.status)),
    [myRequests],
  );

  const handleRequestRoom = async (room) => {
    if (!room || room.remaining <= 0) return;
    if (currentRequestForRoom(room.room_id)) return;

    setRequestingRoomId(room.room_id);
    try {
      await studentAPI.requestRoomBooking({ room_id: room.room_id });
      await loadData();
      Alert.alert("Success", "Room request submitted! You will receive an update once the warden reviews it.");
      setSelectedRoom(null);
    } catch (err) {
      console.error("Room request failed:", err);
      Alert.alert("Error", err?.message || "Unable to request this room right now. Please try again.");
    } finally {
      setRequestingRoomId(null);
    }
  };

  const RoomLayoutDisplay = useMemo(() => {
    if (!layout) return null;
    return (
      <View className="relative">
        <EntranceLabel side={layout.entrance_side} />
        {Array.from({ length: layout.floors }).map((_, floorIdx) => (
          <View key={floorIdx} className="mb-10">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold">Floor {layout.floors - floorIdx}</Text>
            </View>

            {grid.map((row, rowIdx) => (
              <View key={`${floorIdx}-${rowIdx}`} className="flex-row">
                {row.map((cell, colIdx) => {
                  const slot = `${floorIdx}-${rowIdx}-${colIdx}`;
                  const data = cellMap[slot];
                  if (cell === "EMPTY") {
                    return <View key={slot} className="w-20 h-20 m-1" />; // Placeholder for empty cells
                  }
                  return (
                    <RoomGridCell
                      key={slot}
                      roomData={data}
                      currentRequestForRoom={currentRequestForRoom}
                      onPress={data ? () => setSelectedRoom({ ...data, slot }) : null}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }, [layout, grid, cellMap, currentRequestForRoom]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-lg text-gray-700">Loading rooms...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-4 bg-gray-100">
        <View className="rounded border border-red-200 bg-red-50 p-6 text-center">
          <Text className="text-sm text-red-600">{error}</Text>
          <TouchableOpacity
            onPress={loadData}
            className="mt-3 rounded bg-red-600 px-4 py-2 shadow"
          >
            <Text className="text-white text-sm font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!layout) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-gray-100">
        <Text className="text-sm text-gray-500">No layout has been published yet.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Browse Rooms & Book a Bed</Text>
        <Text className="mt-1 text-gray-600 mb-6">
          Tap a room to view occupants and send a booking request. Your request goes to the warden for approval.
        </Text>

        <View className="rounded border bg-white p-4 shadow-sm">
          {RoomLayoutDisplay}
        </View>

        {selectedRoom && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={!!selectedRoom}
            onRequestClose={() => setSelectedRoom(null)}
          >
            <View className="flex-1 justify-center items-center bg-black/40 p-4">
              <View className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <View className="mb-4 flex-row items-start justify-between">
                  <View>
                    <Text className="text-xl font-semibold">{selectedRoom.name}</Text>
                    <Text className="text-sm text-gray-500">Room number: {selectedRoom.room_number}</Text>
                    {selectedRoom.description && (
                      <Text className="mt-1 text-sm text-gray-600">{selectedRoom.description}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRoom(null)} className="p-1">
                    <XCircle size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row justify-between mb-4">
                  <View className="rounded border border-gray-200 bg-gray-50 p-3 w-[48%]">
                    <Text className="text-gray-500 text-sm">Capacity</Text>
                    <Text className="text-lg font-semibold text-gray-800">{selectedRoom.capacity}</Text>
                  </View>
                  <View className="rounded border border-gray-200 bg-gray-50 p-3 w-[48%]">
                    <Text className="text-gray-500 text-sm">Currently occupied</Text>
                    <Text className="text-lg font-semibold text-gray-800">
                      {selectedRoom.occupancy}/{selectedRoom.capacity}
                    </Text>
                  </View>
                </View>

                <View className="mt-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Occupants</Text>
                  <ScrollView className="max-h-40 rounded border border-gray-200 bg-gray-50 p-3">
                    {selectedRoom.occupants.length === 0 ? (
                      <Text className="text-gray-500 text-sm">No one has been allotted yet.</Text>
                    ) : (
                      <View className="space-y-2">
                        {selectedRoom.occupants.map((occ) => (
                          <View key={occ.user_id} className="rounded border border-gray-200 bg-white p-2 shadow-sm">
                            <Text className="font-medium text-gray-800">{occ.name || occ.username}</Text>
                            <Text className="text-xs text-gray-500">
                              {occ.roll_number ? `Roll: ${occ.roll_number}` : "Roll number not available"}
                            </Text>
                            {occ.email && <Text className="text-xs text-gray-500">Email: {occ.email}</Text>}
                            {occ.phone && <Text className="text-xs text-gray-500">Phone: {occ.phone}</Text>}
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                </View>

                <View className="mt-6 flex-row gap-3 justify-end">
                  <TouchableOpacity
                    onPress={() => setSelectedRoom(null)}
                    className="rounded border border-gray-300 px-4 py-2"
                  >
                    <Text className="text-sm text-gray-700">Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRequestRoom(selectedRoom)}
                    disabled={
                      selectedRoom.inactive ||
                      selectedRoom.remaining <= 0 ||
                      Boolean(currentRequestForRoom(selectedRoom.room_id)) ||
                      requestingRoomId === selectedRoom.room_id
                    }
                    className={`rounded px-4 py-2 text-sm font-medium shadow flex-row items-center justify-center ${
                      selectedRoom.inactive
                        ? "bg-gray-400"
                        : selectedRoom.remaining <= 0
                        ? "bg-amber-500"
                        : currentRequestForRoom(selectedRoom.room_id)
                        ? "bg-blue-400"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {requestingRoomId === selectedRoom.room_id ? (
                      <ActivityIndicator size="small" color="#fff" className="mr-2" />
                    ) : (
                      <Text className="text-white text-sm font-semibold">
                        {selectedRoom.inactive
                          ? "Unavailable"
                          : selectedRoom.remaining <= 0
                          ? "Room full"
                          : currentRequestForRoom(selectedRoom.room_id)
                          ? `Request ${currentRequestForRoom(selectedRoom.room_id).status}`
                          : "Request this room"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </View>
  );
};

export default ViewRoomsScreen;
