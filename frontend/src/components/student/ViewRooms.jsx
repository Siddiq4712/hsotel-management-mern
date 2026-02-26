import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Bed, ShieldCheck, ShowerHead, Laptop,
  Layers, Square, X, Home, 
  Loader2, CheckCircle2, AlertCircle, Clock,
  ChevronRight, Users, User as UserIcon
} from "lucide-react";
import { studentAPI } from "../../services/api";

/* ---------- ARCHITECTURAL CONSTANTS ---------- */
const ROOM_TYPES = {
  STUDENT: { key: "STUDENT", name: "Student Room", icon: Bed },
  WARDEN: { key: "WARDEN", name: "Warden Office", icon: ShieldCheck },
  FACULTY_ROOM: { key: "FACULTY_ROOM", name: "Faculty (Ensuite)", icon: Laptop },
  WASHROOM: { key: "WASHROOM", name: "Common Toilets", icon: ShowerHead },
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

  if (hasTop) for (let i = 1; i <= top_rooms; i++) { setType(0, i, "ROOM"); setType(1, i, "WALK_t"); }
  if (hasBottom) for (let i = 1; i <= bottom_rooms; i++) { setType(height - 1, i, "ROOM"); setType(height - 2, i, "WALK_b"); }
  if (hasLeft) for (let j = 1; j <= left_rooms; j++) { setType(j, 0, "ROOM"); setType(j, 1, "WALK_l"); }
  if (hasRight) for (let j = 1; j <= right_rooms; j++) { setType(j, width - 1, "ROOM"); setType(j, width - 2, "WALK_r"); }
  
  return grid;
};

const ViewRooms = () => {
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

  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [hoverOccupants, setHoverOccupants] = useState([]);
  const [occupantCache, setOccupantCache] = useState({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
          // NORMALIZATION: DB '0-1-0' (Floor-Row-Col) -> Grid '1-0' (Row-Col)
          const parts = room.layout_slot.split('-');
          const normalizedSlot = parts.length === 3 ? `${parts[1]}-${parts[2]}` : room.layout_slot;
          liveMap[normalizedSlot] = room; 
        }
      });
      setRoomsLiveMap(liveMap);

      setMyRequests(requestsRes.data?.data || []);
      const activeAllotment = profileRes.data?.data?.tbl_RoomAllotments?.[0];
      setHasActiveAllotment(!!activeAllotment);
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const grid = useMemo(() => {
    return layoutConfig ? generateArchitecturalGrid(layoutConfig) : [];
  }, [layoutConfig]);

  const handleMouseEnter = async (e, room) => {
    if (!room || room.occupancy_count === 0) return;
    setHoveredRoom(room);
    setMousePos({ x: e.clientX, y: e.clientY });
    if (occupantCache[room.id]) {
        setHoverOccupants(occupantCache[room.id]);
        return;
    }
    try {
        const res = await studentAPI.getRoomOccupants(room.id);
        const data = res.data?.data || [];
        setOccupantCache(prev => ({ ...prev, [room.id]: data }));
        setHoverOccupants(data);
    } catch (err) { console.error("Hover Error", err); }
  };

  const handleRoomClick = async (room) => {
    setSelectedRoom(room);
    setOccupants([]);
    setOccupantsLoading(true);
    try {
      const res = await studentAPI.getRoomOccupants(room.id);
      setOccupants(res.data?.data || []);
    } catch (err) { console.error("Occupant Fetch Error:", err); } finally { setOccupantsLoading(false); }
  };

  const handleRequestRoom = async (roomId) => {
    setRequestingRoomId(roomId);
    try {
      const payload = { room_id: roomId, is_change_request: hasActiveAllotment };
      const res = await studentAPI.requestRoom(payload);
      alert(res.data.message || "Request Submitted!");
      await loadData();
      setSelectedRoom(null);
    } catch (err) {
      alert(err.response?.data?.message || "Booking failed.");
    } finally { setRequestingRoomId(null); }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-blue-900" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">Syncing Blueprint...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdff] p-4 md:p-8 font-serif">
      <header className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-blue-900 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-900 text-white rounded-sm shadow-xl"><Layers size={24} /></div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-blue-900 italic">Blueprint Explorer</h1>
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Hover to see occupants • Click to initialize booking</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 bg-white p-3 border border-blue-50">
           <LegendItem icon={Bed} label="Available" color="text-blue-900" />
           <LegendItem icon={Clock} label="Requested" color="text-green-600" />
           <LegendItem icon={AlertCircle} label="Full" color="text-orange-500" />
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto bg-white p-4 md:p-12 border-2 border-blue-100 shadow-2xl relative overflow-auto">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col items-center min-w-max">
          <EntranceLabel side={layoutConfig?.entrance_side} />
          <div className="flex items-center">
             {layoutConfig?.entrance_side === 'l' && <SideEntranceLabel side="l" />}
             <div className="inline-block bg-white border-[4px] border-blue-900 shadow-2xl">
               {grid.map((row, rIdx) => (
                 <div key={rIdx} className="flex">
                   {row.map((type, cIdx) => (
                     <div key={`${rIdx}-${cIdx}`} className="w-[105px] h-[125px]">
                       <BlueprintCell
                         slotKey={`${rIdx}-${cIdx}`}
                         type={type}
                         blueprint={blueprintData[`${rIdx}-${cIdx}`]}
                         liveRoom={roomsLiveMap[`${rIdx}-${cIdx}`]}
                         myRequests={myRequests}
                         onSelect={handleRoomClick}
                         onMouseEnter={handleMouseEnter}
                         onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                         onMouseLeave={() => { setHoveredRoom(null); setHoverOccupants([]); }}
                       />
                     </div>
                   ))}
                 </div>
               ))}
             </div>
             {layoutConfig?.entrance_side === 'r' && <SideEntranceLabel side="r" />}
          </div>
          {layoutConfig?.entrance_side === 'b' && <EntranceLabel side="b" />}
        </div>
      </main>

      {hoveredRoom && <OccupantTooltip occupants={hoverOccupants} pos={mousePos} roomNumber={hoveredRoom.room_number} />}
      
      {selectedRoom && (
        <RoomInteractionModal
          room={selectedRoom}
          occupants={occupants}
          occupantsLoading={occupantsLoading}
          request={myRequests.find(r => r.room_id === selectedRoom.id && r.status !== 'cancelled')}
          isRequesting={requestingRoomId === selectedRoom.id}
          hasActiveAllotment={hasActiveAllotment}
          onClose={() => setSelectedRoom(null)}
          onConfirm={() => handleRequestRoom(selectedRoom.id)}
        />
      )}
    </div>
  );
};

/* ---------- INTERNAL UI COMPONENTS ---------- */
function BlueprintCell({ type, blueprint, liveRoom, myRequests, onSelect, onMouseEnter, onMouseMove, onMouseLeave }) {
  if (type === "EMPTY") return <div className="w-full h-full" />;
  if (type === "VOID") return <div className="w-full h-full bg-blue-50/20 border border-blue-50 flex items-center justify-center"><X size={14} className="text-blue-100" /></div>;
  if (type.startsWith("WALK_")) return <div className="w-full h-full relative border-[0.5px] border-blue-50/50 flex items-center justify-center"><div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z' fill='%231e3a8a'/%3E%3C/svg%3E")` }} /></div>;

  // FIX: Support both 'typeKey' and 'key' from DB JSON
  const typeKey = blueprint?.typeKey || blueprint?.key;
  const roomConfig = typeKey ? ROOM_TYPES[typeKey] : null;
  const Icon = roomConfig?.icon || Home;
  
  const activeRequest = liveRoom ? myRequests.find(r => r.room_id === liveRoom.id && r.status !== 'cancelled') : null;
  const capacity = liveRoom?.RoomType?.capacity || 0;
  const isFull = liveRoom && liveRoom.occupancy_count >= capacity;

  return (
    <div
      onClick={() => liveRoom && onSelect(liveRoom)}
      onMouseEnter={(e) => onMouseEnter(e, liveRoom)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`w-full h-full p-1 transition-all ${liveRoom ? 'cursor-pointer hover:scale-105 hover:z-20' : 'cursor-default'}`}
    >
      <div className={`w-full h-full border-[1.5px] flex flex-col transition-all
        ${activeRequest ? 'border-green-600 bg-green-50' : isFull ? 'border-orange-500 bg-orange-50/30' : 'border-blue-900 bg-white shadow-sm'}
        ${!liveRoom ? 'border-dashed border-slate-100 opacity-20' : 'opacity-100'} 
      `}>
        <div className="px-1 border-b border-blue-50 text-[7px] font-bold text-blue-900 py-1 flex justify-between">
            <span>{liveRoom?.room_number || blueprint?.room_number || '---'}</span>
            {activeRequest && <Clock size={8} className="text-green-600 animate-pulse" />}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
            <Icon size={18} className={`${activeRequest ? 'text-green-600' : isFull ? 'text-orange-500' : 'text-blue-900'} opacity-40`} />
            {liveRoom && <span className="text-[6px] font-black text-slate-400">{liveRoom.occupancy_count}/{capacity}</span>}
        </div>
        <div className={`text-[6px] font-black uppercase text-center py-1 text-white ${activeRequest ? 'bg-green-600' : isFull ? 'bg-orange-500' : 'bg-blue-900'}`}>
          {activeRequest ? "Requested" : roomConfig?.name || "Utility"}
        </div>
      </div>
    </div>
  );
}

function OccupantTooltip({ occupants, pos, roomNumber }) {
    return (
      <div className="fixed z-[100] pointer-events-none" style={{ top: pos.y + 15, left: pos.x + 15 }}>
        <div className="bg-blue-900 border-l-4 border-orange-500 shadow-2xl p-3 min-w-[180px]">
          <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-2 border-b border-blue-800 pb-1">Room {roomNumber} Occupants</p>
          <div className="space-y-2">
            {occupants.length > 0 ? (
              occupants.map((occ) => (
                <div key={occ.user_id} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-[8px] font-bold text-white overflow-hidden">
                    {occ.profileImage ? <img src={occ.profileImage} alt="" className="w-full h-full object-cover"/> : occ.userName.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase">{occ.userName}</span>
                    <span className="text-[7px] text-blue-300 uppercase leading-none">{occ.roll_number}</span>
                  </div>
                </div>
              ))
            ) : <span className="text-[9px] text-white italic">Loading...</span>}
          </div>
        </div>
      </div>
    );
}

function RoomInteractionModal({ room, occupants, occupantsLoading, request, isRequesting, onClose, onConfirm, hasActiveAllotment }) {
  const capacity = room.RoomType?.capacity || 1;
  const isFull = room.occupancy_count >= capacity;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl border-[4px] border-blue-900 shadow-2xl flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-1/2 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-900 mb-4 flex items-center gap-2"><Users size={14} /> Occupants</h3>
            <div className="flex-1 overflow-auto space-y-3">
                {occupantsLoading ? <Loader2 className="animate-spin" /> : occupants.length === 0 ? <p className="text-[9px] font-bold uppercase text-slate-300">Empty Room</p> : 
                  occupants.map(occ => (
                    <div key={occ.user_id} className="bg-white p-3 border border-slate-200 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 overflow-hidden">
                            {occ.profileImage ? <img src={occ.profileImage} alt="" className="w-full h-full object-cover"/> : <UserIcon size={14}/>}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-900 uppercase leading-none">{occ.userName}</p>
                            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Roll: {occ.roll_number || 'N/A'}</p>
                        </div>
                    </div>
                  ))
                }
            </div>
        </div>
        <div className="w-full md:w-1/2 p-8 flex flex-col">
            <div className="flex justify-between items-start mb-8">
                <div><p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Index</p><h3 className="text-4xl font-black text-blue-900 leading-none">{room.room_number}</h3></div>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-4 mb-8">
                <div className="flex justify-between border-b pb-2"><span className="text-[10px] font-bold text-slate-400 uppercase">Class</span><span className="text-[10px] font-black text-blue-900 uppercase">{room.RoomType?.name}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[10px] font-bold text-slate-400 uppercase">Beds</span><span className={`text-[10px] font-black uppercase ${isFull ? 'text-red-600' : 'text-green-600'}`}>{capacity - room.occupancy_count} of {capacity}</span></div>
            </div>
            <div className="flex-1 flex flex-col justify-end">
                {request ? <div className="bg-green-600 text-white p-4 flex items-center gap-3"><CheckCircle2 size={20} /><div><p className="text-[10px] font-black uppercase">Active Request</p></div></div> :
                 isFull ? <div className="bg-orange-500 text-white p-4 text-center"><p className="text-[10px] font-black uppercase">Full</p></div> :
                    <button onClick={onConfirm} disabled={isRequesting} className="w-full bg-blue-900 text-white py-5 font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3">
                      {isRequesting ? <Loader2 className="animate-spin" size={16}/> : <ChevronRight size={18}/>}
                      {hasActiveAllotment ? 'Request Room Change' : 'Initialize Booking'}
                    </button>
                }
            </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ icon: Icon, label, color }) { return (<div className="flex items-center gap-2"><Icon size={12} className={color} /><span className="text-[9px] font-black uppercase text-slate-500">{label}</span></div>); }
function EntranceLabel({ side }) { if (!['t', 'b'].includes(side)) return null; return <div className={`bg-orange-600 text-white px-10 py-2 text-[10px] font-black uppercase tracking-[0.4em] shadow-xl ${side === 't' ? 'mb-6' : 'mt-6'}`}>Entrance</div>; }
function SideEntranceLabel({ side }) { return <div className={`${side === 'l' ? 'mr-10 rotate-180' : 'ml-10'} bg-orange-600 text-white px-2 py-10 text-[10px] font-black uppercase tracking-[0.4em] [writing-mode:vertical-lr] shadow-xl`}>Entrance</div>; }

export default ViewRooms;