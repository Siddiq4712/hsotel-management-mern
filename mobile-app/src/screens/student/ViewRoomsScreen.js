import { withScreenPermission } from '../../auth/PermissionContext';
import { Text } from "../../components/common/ReferenceDesign";
import colors from '../../theme/colors';
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions, Modal, Image, Alert } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Bed, ShieldCheck, ShowerHead, Laptop, 
  Layers, X, Home, Clock, AlertCircle, 
  ChevronRight, Users, User as UserIcon 
} from 'lucide-react-native';
import { studentAPI } from "../../api/api";
import Header from '../../components/student/StudentHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ---------- ARCHITECTURAL CONSTANTS ---------- */
const ROOM_TYPES = {
  STUDENT: { key: "STUDENT", name: "Student", icon: Bed },
  WARDEN: { key: "WARDEN", name: "Warden", icon: ShieldCheck },
  FACULTY_ROOM: { key: "FACULTY", name: "Faculty", icon: Laptop },
  WASHROOM: { key: "UTILITY", name: "Utility", icon: ShowerHead },
};

/* ---------- DYNAMIC ARCHITECTURAL GRID GENERATOR ---------- */
const generateArchitecturalGrid = (config) => {
  const { building_type, top_rooms, bottom_rooms, left_rooms, right_rooms, orientation, open_side } = config;
  const width = Math.max(top_rooms || 0, bottom_rooms || 0) + 2;
  const height = Math.max(left_rooms || 0, right_rooms || 0) + 2;
  const grid = Array(height).fill(0).map(() => Array(width).fill("EMPTY"));
  
  const setType = (r, c, type) => { if (grid[r] && grid[r][c] !== undefined) grid[r][c] = type; };
  
  const hasTop = building_type === 'square' || (building_type === 'u' && open_side !== 't') || (building_type === 'l' && orientation?.includes('t')) || building_type === 'single';
  const hasBottom = building_type === 'square' || (building_type === 'u' && open_side !== 'b') || (building_type === 'l' && orientation?.includes('b'));
  const hasLeft = building_type === 'square' || (building_type === 'u' && open_side !== 'l') || (building_type === 'l' && orientation?.includes('l'));
  const hasRight = building_type === 'square' || (building_type === 'u' && open_side !== 'r') || (building_type === 'l' && orientation?.includes('r'));

  setType(0, 0, "VOID"); setType(0, width - 1, "VOID");
  setType(height - 1, 0, "VOID"); setType(height - 1, width - 1, "VOID");

  if (hasTop) for (let i = 1; i <= top_rooms; i++) { setType(0, i, "ROOM"); setType(1, i, "WALK"); }
  if (hasBottom) for (let i = 1; i <= bottom_rooms; i++) { setType(height - 1, i, "ROOM"); setType(height - 2, i, "WALK"); }
  if (hasLeft) for (let j = 1; j <= left_rooms; j++) { setType(j, 0, "ROOM"); setType(j, 1, "WALK"); }
  if (hasRight) for (let j = 1; j <= right_rooms; j++) { setType(j, width - 1, "ROOM"); setType(j, width - 2, "WALK"); }
  
  return grid;
};

const ViewRoomsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [layoutConfig, setLayoutConfig] = useState(null);
  const [blueprintData, setBlueprintData] = useState({});
  const [roomsLiveMap, setRoomsLiveMap] = useState({});
  const [myRequests, setMyRequests] = useState([]);
  const [hasActiveAllotment, setHasActiveAllotment] = useState(false);
  
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [occupants, setOccupants] = useState([]);
  const [occupantsLoading, setOccupantsLoading] = useState(false);
  const [requestingRoomId, setRequestingRoomId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [layoutRes, roomsRes, requestsRes, profileRes] = await Promise.all([
        studentAPI.getLayout(),
        studentAPI.getRooms(),
        studentAPI.getMyRoomRequests(),
        studentAPI.getProfile(),
      ]);

      const config = layoutRes.data?.data;
      if (config) {
        setLayoutConfig(config);
        if (config.layout_json) setBlueprintData(JSON.parse(config.layout_json));
      }

      const liveRooms = roomsRes.data?.data || [];
      const liveMap = {};
      liveRooms.forEach(room => {
        if (room.layout_slot) {
          const parts = room.layout_slot.split('-');
          // Normalize Floor-Row-Col to Row-Col for grid mapping
          const slot = parts.length === 3 ? `${parts[1]}-${parts[2]}` : room.layout_slot;
          liveMap[slot] = room;
        }
      });
      setRoomsLiveMap(liveMap);
      setMyRequests(requestsRes.data?.data || []);
      setHasActiveAllotment(!!profileRes.data?.data?.tbl_RoomAllotments?.[0]);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const grid = useMemo(() => layoutConfig ? generateArchitecturalGrid(layoutConfig) : [], [layoutConfig]);

  const handleRoomClick = async (room) => {
    setSelectedRoom(room);
    setOccupantsLoading(true);
    try {
      const res = await studentAPI.getRoomOccupants(room.id);
      setOccupants(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setOccupantsLoading(false);
    }
  };

  const handleRequestRoom = async (roomId) => {
    setRequestingRoomId(roomId);
    try {
      await studentAPI.requestRoom({ room_id: roomId, is_change_request: hasActiveAllotment });
      Alert.alert("Success", "Room request submitted.");
      setSelectedRoom(null);
      loadData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Booking failed.");
    } finally {
      setRequestingRoomId(null);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primaryDark} /><Text style={styles.syncText}>Syncing Blueprint...</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Header title="Room details" back />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
        
        {/* Header Section */}
        <View style={styles.header}>
            <View style={styles.headerTitleRow}>
                <View style={styles.iconBox}><Layers size={20} color={colors.card} /></View>
                <View>
                    <Text style={styles.title}>BLUEPRINT EXPLORER</Text>
                    <Text style={styles.subtitle}>TAP ROOM TO INITIALIZE BOOKING</Text>
                </View>
            </View>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
            <LegendItem icon={Bed} label="Available" color={colors.primaryDark} />
            <LegendItem icon={Clock} label="Requested" color={colors.success} />
            <LegendItem icon={AlertCircle} label="Full" color={colors.warning} />
        </View>

        {/* Blueprint Grid Area */}
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} style={styles.gridOuter}>
           <View style={styles.gridContainer}>
              <EntranceLabel side={layoutConfig?.entrance_side} pos="top" />
              
              <View style={styles.blueprintFrame}>
                {grid.map((row, rIdx) => (
                  <View key={`row-${rIdx}`} style={styles.row}>
                    {row.map((type, cIdx) => (
                      <BlueprintCell
                        key={`${rIdx}-${cIdx}`}
                        type={type}
                        blueprint={blueprintData[`${rIdx}-${cIdx}`]}
                        liveRoom={roomsLiveMap[`${rIdx}-${cIdx}`]}
                        myRequests={myRequests}
                        onPress={handleRoomClick}
                      />
                    ))}
                  </View>
                ))}
              </View>

              <EntranceLabel side={layoutConfig?.entrance_side} pos="bottom" />
           </View>
        </ScrollView>
      </ScrollView>

      {/* Interaction Modal */}
      <RoomModal 
        visible={!!selectedRoom}
        room={selectedRoom}
        occupants={occupants}
        loading={occupantsLoading}
        isRequesting={requestingRoomId === selectedRoom?.id}
        hasRequested={myRequests.some(r => r.room_id === selectedRoom?.id && r.status !== 'cancelled')}
        hasActiveAllotment={hasActiveAllotment}
        onClose={() => setSelectedRoom(null)}
        onConfirm={() => handleRequestRoom(selectedRoom.id)}
      />
    </SafeAreaView>
  );
};

/* ---------- SUB-COMPONENTS ---------- */

const BlueprintCell = ({ type, blueprint, liveRoom, myRequests, onPress }) => {
  if (type === "EMPTY") return <View style={styles.cell} />;
  if (type === "VOID") return <View style={[styles.cell, styles.voidCell]}><X size={12} color={colors.borderStrong} /></View>;
  if (type === "WALK") return <View style={[styles.cell, styles.walkCell]} />;

  const typeKey = blueprint?.typeKey || blueprint?.key;
  const config = ROOM_TYPES[typeKey] || ROOM_TYPES.STUDENT;
  const Icon = config.icon;

  const isRequested = liveRoom && myRequests.some(r => r.room_id === liveRoom.id && r.status !== 'cancelled');
  const capacity = liveRoom?.RoomType?.capacity || 0;
  const isFull = liveRoom && liveRoom.occupancy_count >= capacity;

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      disabled={!liveRoom}
      onPress={() => onPress(liveRoom)}
      style={[
        styles.cell, 
        styles.roomCell,
        isRequested && styles.requestedCell,
        isFull && styles.fullCell,
        !liveRoom && styles.inactiveCell
      ]}
    >
      <View style={styles.cellHeader}>
        <Text style={[styles.cellNo, isRequested && { color: colors.success }]}>{liveRoom?.room_number || '---'}</Text>
        {isRequested && <Clock size={8} color={colors.success} />}
      </View>
      <View style={styles.cellBody}>
        <Icon size={16} color={isRequested ? colors.success : isFull ? colors.warning : colors.primaryDark} opacity={0.4} />
        {liveRoom && <Text style={styles.occCount}>{liveRoom.occupancy_count}/{capacity}</Text>}
      </View>
      <View style={[styles.cellFooter, isRequested && { backgroundColor: colors.success }, isFull && { backgroundColor: colors.warning }]}>
        <Text style={styles.footerText}>{isRequested ? "REQD" : config.name.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
};

const RoomModal = ({ visible, room, occupants, loading, isRequesting, hasRequested, hasActiveAllotment, onClose, onConfirm }) => {
  if (!room) return null;
  const capacity = room.RoomType?.capacity || 1;
  const isFull = room.occupancy_count >= capacity;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
                <Text style={styles.modalLabel}>INDEX</Text>
                <Text style={styles.modalTitle}>{room.room_number}</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X color={colors.primaryDark} size={24} /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" style={styles.occupantList}>
            <Text style={styles.sectionTitle}><Users size={12} color={colors.primaryDark} /> OCCUPANTS</Text>
            {loading ? <ActivityIndicator /> : occupants.length === 0 ? <Text style={styles.emptyText}>EMPTY ROOM</Text> : 
              occupants.map(occ => (
                <View key={occ.user_id} style={styles.occCard}>
                  <View style={styles.occAvatar}>
                    {occ.profileImage ? <Image source={{uri: occ.profileImage}} style={styles.fullImg} /> : <UserIcon size={14} color={colors.primaryDark} />}
                  </View>
                  <View>
                    <Text style={styles.occName}>{occ.userName.toUpperCase()}</Text>
                    <Text style={styles.occRoll}>ROLL: {occ.roll_number || 'N/A'}</Text>
                  </View>
                </View>
              ))
            }
          </ScrollView>

          <View style={styles.modalFooter}>
             <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>CLASS</Text>
                <Text style={styles.infoVal}>{room.RoomType?.name.toUpperCase()}</Text>
             </View>
             <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>BEDS AVAILABLE</Text>
                <Text style={[styles.infoVal, { color: isFull ? colors.danger : colors.success }]}>{capacity - room.occupancy_count} OF {capacity}</Text>
             </View>

             {hasRequested ? (
               <View style={styles.statusBanner}><Text style={styles.statusText}>ACTIVE REQUEST</Text></View>
             ) : isFull ? (
               <View style={[styles.statusBanner, { backgroundColor: colors.warning }]}><Text style={styles.statusText}>ROOM FULL</Text></View>
             ) : (
               <TouchableOpacity style={styles.bookingBtn} onPress={onConfirm} disabled={isRequesting}>
                 {isRequesting ? <ActivityIndicator color={colors.card} /> : <><ChevronRight color={colors.card} size={18} /><Text style={styles.bookingText}>{hasActiveAllotment ? 'REQUEST CHANGE' : 'INITIALIZE BOOKING'}</Text></>}
               </TouchableOpacity>
             )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const LegendItem = ({ icon: Icon, label, color }) => (
  <View style={styles.legendItem}><Icon size={10} color={color} /><Text style={styles.legendText}>{label.toUpperCase()}</Text></View>
);

const EntranceLabel = ({ side, pos }) => {
  const isMatch = (side === 't' && pos === 'top') || (side === 'b' && pos === 'bottom');
  if (!isMatch) return null;
  return <View style={styles.entranceLabel}><Text style={styles.entranceText}>ENTRANCE</Text></View>;
};

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  syncText: { marginTop: 10, fontSize: 10, fontWeight: '900', color: colors.primaryDark, letterSpacing: 2 },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: colors.primaryDark, paddingBottom: 10 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { backgroundColor: colors.primaryDark, padding: 8, borderRadius: 4 },
  title: { fontSize: 18, fontWeight: '900', color: colors.primaryDark, fontStyle: 'italic' },
  subtitle: { fontSize: 8, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  legendRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 8, fontWeight: '900', color: colors.mutedText },
  gridOuter: { marginHorizontal: -16 },
  gridContainer: { paddingHorizontal: 40, alignItems: 'center' },
  blueprintFrame: { borderWidth: 4, borderColor: colors.primaryDark, backgroundColor: colors.card },
  row: { flexDirection: 'row' },
  cell: { width: 85, height: 105, borderWidth: 1, borderColor: colors.surface },
  voidCell: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  walkCell: { backgroundColor: colors.surface, borderStyle: 'dotted', borderWidth: 1, borderColor: colors.borderStrong },
  roomCell: { borderWeight: 1.5, borderColor: colors.primaryDark, padding: 4 },
  requestedCell: { borderColor: colors.success, backgroundColor: colors.successSoft },
  fullCell: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
  inactiveCell: { opacity: 0.1 },
  cellHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 2 },
  cellNo: { fontSize: 8, fontWeight: '900', color: colors.primaryDark },
  cellBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  occCount: { fontSize: 7, fontWeight: '900', color: colors.mutedText, marginTop: 2 },
  cellFooter: { backgroundColor: colors.primaryDark, paddingVertical: 2, marginHorizontal: -4, marginBottom: -4 },
  footerText: { color: colors.card, fontSize: 7, fontWeight: '900', textAlign: 'center' },
  entranceLabel: { backgroundColor: colors.warning, paddingHorizontal: 30, paddingVertical: 6, marginVertical: 10 },
  entranceText: { color: colors.card, fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  modalOverlay: { flex: 1, backgroundColor: colors.withOpacity(colors.primaryDark, 0.7), justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.card, borderWidth: 4, borderColor: colors.primaryDark },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.surface },
  modalLabel: { fontSize: 8, fontWeight: '800', color: colors.primary },
  modalTitle: { fontSize: 32, fontWeight: '900', color: colors.primaryDark },
  occupantList: { padding: 20, maxHeight: 300 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: colors.primaryDark, marginBottom: 15 },
  emptyText: { fontSize: 10, fontWeight: '800', color: colors.borderStrong },
  occCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, padding: 10, borderWidth: 1, borderColor: colors.surface },
  occAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fullImg: { width: '100%', height: '100%' },
  occName: { fontSize: 11, fontWeight: '900', color: colors.primaryDark },
  occRoll: { fontSize: 8, fontWeight: '700', color: colors.mutedText },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: colors.surface },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.background, paddingBottom: 5 },
  infoLabel: { fontSize: 9, fontWeight: '800', color: colors.mutedText },
  infoVal: { fontSize: 10, fontWeight: '900', color: colors.primaryDark },
  bookingBtn: { backgroundColor: colors.buttonBackground, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  bookingText: { color: colors.card, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  statusBanner: { padding: 16, backgroundColor: colors.success, alignItems: 'center' },
  statusText: { color: colors.card, fontSize: 12, fontWeight: '900' }
});

export default withScreenPermission(ViewRoomsScreen, 'my-rooms');
