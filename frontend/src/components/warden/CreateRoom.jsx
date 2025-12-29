import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  Bed, ShieldCheck, ShowerHead, Zap, Users, 
  Save, RefreshCw, Home, Layers, Trash2, 
  Waves, DoorOpen, Eraser, Coffee, ShoppingCart, 
  Utensils, Footprints, Square, X, Laptop
} from "lucide-react";
import { wardenAPI } from "../../services/api";

/* ---------- ARCHITECTURAL CONSTANTS ---------- */

const ROOM_TYPES = {
  STUDENT: { key: "STUDENT", name: "Student Room", color: "bg-white border-slate-900 text-slate-800", icon: Bed, defaultCapacity: 2 },
  WARDEN: { key: "WARDEN", name: "Warden Office", color: "bg-indigo-50 border-indigo-600 text-indigo-900", icon: ShieldCheck, defaultCapacity: 1 },
  WASHROOM: { key: "WASHROOM", name: "Washroom", color: "bg-sky-50 border-sky-500 text-sky-900", icon: ShowerHead, defaultCapacity: 3 },
  RESTROOM: { key: "RESTROOM", name: "Common Toilets", color: "bg-blue-50 border-blue-600 text-blue-900", icon: Footprints, defaultCapacity: 4 },
  IRON_ROOM: { key: "IRON_ROOM", name: "Ironing Room", color: "bg-slate-100 border-slate-500 text-slate-700", icon: Waves, defaultCapacity: 2 },
  CONTROL_ROOM: { key: "CONTROL_ROOM", name: "Power Supply", color: "bg-amber-50 border-amber-600 text-amber-900", icon: Zap, defaultCapacity: 1 },
  FACULTY_ROOM: { key: "FACULTY_ROOM", name: "Faculty (Ensuite)", color: "bg-white border-slate-900 text-slate-800", icon: Laptop, defaultCapacity: 1 },
};

/* ---------- DYNAMIC ARCHITECTURAL GRID GENERATOR ---------- */

const generateArchitecturalGrid = ({ buildingType, topCount, bottomCount, leftCount, rightCount }) => {
  // Determine grid dimensions based on the counts + buffer for corners and verandas
  const width = Math.max(topCount, bottomCount) + 2; 
  const height = Math.max(leftCount, rightCount) + 2;
  
  const grid = Array(height).fill(0).map(() => Array(width).fill("EMPTY"));

  // Helper to safely place types
  const setType = (r, c, type) => { if (grid[r] && grid[r][c] !== undefined) grid[r][c] = type; };

  // 1. Mark Corners as Voids (Structural Pillars)
  setType(0, 0, "VOID"); 
  setType(0, width - 1, "VOID");
  setType(height - 1, 0, "VOID");
  setType(height - 1, width - 1, "VOID");

  // 2. Map TOP Side
  if (buildingType !== "linear" || topCount > 0) {
    for (let i = 1; i < width - 1; i++) {
        if (i <= topCount) {
            setType(0, i, "ROOM");
            setType(1, i, "VERANDA");
        }
    }
  }

  // 3. Map BOTTOM Side
  if (buildingType === "square" || buildingType === "u" || bottomCount > 0) {
    for (let i = 1; i < width - 1; i++) {
        if (i <= bottomCount) {
            setType(height - 1, i, "ROOM");
            setType(height - 2, i, "VERANDA");
        }
    }
  }

  // 4. Map LEFT Side
  if (buildingType !== "linear" || leftCount > 0) {
    for (let j = 1; j < height - 1; j++) {
        if (j <= leftCount) {
            setType(j, 0, "ROOM");
            setType(j, 1, "VERANDA");
        }
    }
  }

  // 5. Map RIGHT Side
  if (buildingType === "square" || buildingType === "u" || rightCount > 0) {
    for (let j = 1; j < height - 1; j++) {
        if (j <= rightCount) {
            setType(j, width - 1, "ROOM");
            setType(j, width - 2, "VERANDA");
        }
    }
  }

  return grid;
};

/* ---------- TECHNICAL FURNITURE SYMBOLS ---------- */

const FurnitureOverlay = ({ roomName, capacity, occupancy }) => {
  const WC = () => (
    <div className="flex flex-col items-center scale-[0.6]">
      <div className="w-3 h-1.5 bg-slate-500 rounded-t-sm" />
      <div className="w-3.5 h-4 border-2 border-slate-600 rounded-b-full bg-white shadow-sm" />
    </div>
  );

  switch (roomName) {
    case "Faculty (Ensuite)":
      return (
        <div className="relative w-full h-full p-0.5">
          <div className="flex justify-between items-start">
             <div className="w-7 h-4 border border-slate-400 bg-slate-100 mt-1 shadow-xs" title="Desk" />
             <div className="w-9 h-11 border-l-2 border-b-2 border-slate-400 bg-white/80 flex flex-col items-center justify-center p-0.5" title="Ensuite">
                <div className="w-2 h-2 rounded-full border border-sky-400 mb-1" title="Sink" />
                <WC />
             </div>
          </div>
        </div>
      );
    case "Common Toilets":
      return (
        <div className="flex gap-1 justify-center items-center h-full opacity-60">
          {Array.from({ length: 2 }).map((_, i) => <WC key={i} />)}
        </div>
      );
    case "Student Room":
      return (
        <div className="flex flex-wrap gap-1 justify-center p-1 mt-1">
          {Array.from({ length: capacity }).map((_, i) => (
            <div key={i} className={`w-3 h-5 border border-slate-500 rounded-sm relative ${i < occupancy ? "bg-indigo-600" : "bg-white"}`}>
              <div className="absolute top-0 inset-x-0 h-1 bg-black/10" />
            </div>
          ))}
          <div className="w-7 h-2 bg-slate-200 border border-slate-400 mt-auto" />
        </div>
      );
    case "Power Supply":
      return (
        <div className="flex flex-col items-center justify-center h-full opacity-90">
          <div className="w-10 h-8 border-2 border-slate-900 bg-slate-800 grid grid-rows-3 gap-0.5 p-0.5 shadow-md">
            <div className="bg-amber-400 h-full w-full" />
            <div className="bg-amber-500 h-full w-full" />
            <div className="bg-amber-400 h-full w-full" />
          </div>
          <Zap size={10} className="text-amber-600 mt-1" />
        </div>
      );
    default:
      return <div className="flex items-center justify-center opacity-10 h-full"><Square size={20} /></div>;
  }
};

/* ---------- BLUEPRINT COMPONENTS ---------- */

const RoomBlueprint = ({ data, isDragging }) => {
  if (!data) return (
    <div className="w-full h-full border-2 border-dashed border-slate-200 bg-white/40 flex flex-col items-center justify-center text-slate-300">
      <Eraser size={14} className="opacity-20" />
      <span className="text-[7px] font-black uppercase mt-1">Slot</span>
    </div>
  );

  return (
    <div className={`relative w-full h-full border-2 rounded-sm flex flex-col transition-all bg-white shadow-sm border-slate-900 ${isDragging ? "opacity-20 scale-95" : "opacity-100"}`}>
      <div className="absolute top-0 left-1/4 right-1/4 h-[3.5px] bg-sky-100 border-x border-b border-slate-500" />
      <div className="absolute bottom-0 left-2 w-5 h-[3.5px] bg-orange-600 border-x border-t border-slate-800" />
      <div className="px-1 py-0.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center h-4">
        <span className="text-[8px] font-black tracking-tighter truncate">{data.room_number}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <FurnitureOverlay roomName={data.name} capacity={data.capacity} occupancy={data.occupancy_count} />
      </div>
      <div className="text-[6px] font-black uppercase text-center bg-slate-900 text-white leading-none py-0.5 tracking-tighter truncate">
        {data.name}
      </div>
    </div>
  );
};

const CorridorCell = () => (
  <div className="w-full h-full bg-slate-100/60 border-x border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
    <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }} />
    <Footprints size={12} className="text-slate-400 z-10" />
    <span className="text-[5px] font-black text-slate-500 uppercase tracking-widest mt-1 z-10">Walkway</span>
  </div>
);

const VoidCell = () => (
  <div className="w-full h-full bg-slate-200 flex items-center justify-center border-2 border-slate-300">
    <X size={16} className="text-slate-400 opacity-40" />
  </div>
);

const DropZone = ({ slotId, data, type, onDrop, onClickEdit }) => {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ["roomTemplate", "existingRoom"],
    drop: (item) => onDrop(slotId, item),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [slotId, onDrop]);

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "existingRoom",
    item: data ? { kind: "existing", from: slotId, data } : {},
    canDrag: () => !!data,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [slotId, data]);

  if (type === "EMPTY") return <div className="w-full h-full bg-transparent" />;
  if (type === "VOID") return <VoidCell />;
  if (type === "VERANDA") return <CorridorCell />;

  return (
    <div ref={(n) => { dropRef(n); if (data) dragRef(n); }} onClick={() => data && onClickEdit(slotId, data)} className="w-full h-full cursor-pointer relative">
      <RoomBlueprint data={data} isDragging={isDragging} />
      {isOver && <div className="absolute inset-0 bg-indigo-500/20 border-2 border-indigo-600 animate-pulse z-20" />}
    </div>
  );
};

/* ---------- MAIN INTERFACE ---------- */

const CreateRoom = () => {
  const [buildingType, setBuildingType] = useState("u");
  const [topRooms, setTopRooms] = useState(6);
  const [bottomRooms, setBottomRooms] = useState(0);
  const [leftRooms, setLeftRooms] = useState(4);
  const [rightRooms, setRightRooms] = useState(4);
  const [cellData, setCellData] = useState({});
  const [editSlot, setEditSlot] = useState(null);
  const [editData, setEditData] = useState(null);

  const grid = useMemo(() => generateArchitecturalGrid({ 
    buildingType, 
    topCount: topRooms, 
    bottomCount: bottomRooms, 
    leftCount: leftRooms, 
    rightCount: rightRooms 
  }), [buildingType, topRooms, bottomRooms, leftRooms, rightRooms]);

  const handleUpdateCell = useCallback((slot, updater) => {
    setCellData((prev) => {
      const existing = prev[slot];
      const next = typeof updater === "function" ? updater(existing) : updater;
      if (!next) {
        const { [slot]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [slot]: { ...next, layout_slot: slot } };
    });
  }, []);

  const handleDrop = (slot, item) => {
    if (item.kind === "template") {
      const config = ROOM_TYPES[item.typeKey];
      handleUpdateCell(slot, {
        typeKey: item.typeKey,
        name: config.name,
        capacity: config.defaultCapacity,
        occupancy_count: 0,
        room_number: `R-${Math.floor(Math.random()*900)+100}`,
        inactive: false
      });
    } else {
      if (item.from !== slot) handleUpdateCell(item.from, null);
      handleUpdateCell(slot, item.data);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900 select-none">
        
        <header className="max-w-[1500px] mx-auto flex justify-between items-center border-b-2 border-slate-200 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <Layers size={36} className="text-slate-900" />
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">Blueprint Studio Pro</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ground Floor Plan | Junction-Void Logic</p>
            </div>
          </div>
          <button className="bg-slate-900 text-white px-8 py-3 rounded-sm font-black text-[10px] uppercase shadow-2xl flex items-center gap-2 hover:bg-black transition-all">
            <Save size={14} /> Commit Changes
          </button>
        </header>

        <div className="max-w-[1500px] mx-auto grid grid-cols-12 gap-10">
          
          <aside className="col-span-3 space-y-6">
            <section className="bg-slate-900 p-6 rounded-sm shadow-2xl">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-5 flex items-center gap-2">
                <Square size={14} /> Room Modules
              </h3>
              <div className="space-y-2.5">
                {Object.entries(ROOM_TYPES).map(([key, config]) => (
                  <DraggableItem key={key} typeKey={key} config={config} />
                ))}
              </div>
            </section>

            <section className="bg-white p-6 border-2 border-slate-200 shadow-sm space-y-5">
              <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Home size={14} /> Wing Parameters
              </h3>
              <div className="space-y-4">
                {[['Top', topRooms, setTopRooms], ['Bottom', bottomRooms, setBottomRooms], ['Left', leftRooms, setLeftRooms], ['Right', rightRooms, setRightRooms]].map(([label, val, setter]) => (
                  <div key={label}>
                    <label className="text-[9px] font-black uppercase text-slate-500">{label} Wing Units</label>
                    <input type="number" value={val} onChange={e => setter(Number(e.target.value))} className="w-full border-2 p-2 text-xs font-black mt-1 outline-none focus:border-slate-900" />
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="col-span-9 bg-white p-12 border-2 shadow-2xl overflow-auto min-h-[700px] relative">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-10 bg-slate-800 text-white px-8 py-3 rounded-sm font-black text-[11px] uppercase border-l-4 border-orange-500 shadow-xl flex items-center gap-3">
                <DoorOpen size={18} /> Building Entrance (Level 0)
              </div>

              <div className="inline-block bg-white p-10 border-[4px] border-slate-900 shadow-2xl mx-auto min-w-full">
                {grid.map((row, rIdx) => (
                  <div key={rIdx} className="flex">
                    {row.map((type, cIdx) => (
                      <div key={`${rIdx}-${cIdx}`} className="w-[110px] h-[130px] border-[0.5px] border-slate-100">
                        <DropZone 
                          slotId={`${rIdx}-${cIdx}`} 
                          data={cellData[`${rIdx}-${cIdx}`]} 
                          type={type} 
                          onDrop={handleDrop} 
                          onClickEdit={(s, d) => { setEditSlot(s); setEditData(d); }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Edit Modal */}
      {editSlot && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md border-[3px] border-slate-900 shadow-2xl">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white font-black uppercase italic tracking-tighter">
              Spec Modification <div className="bg-white text-slate-900 px-3 py-1 text-[10px] tracking-widest">{editData.room_number}</div>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">Infrastructure Module</label>
                <select className="w-full border-2 border-slate-300 p-2 text-xs font-black uppercase outline-none focus:border-slate-900" value={editData.name} onChange={e => {
                  const newName = e.target.value;
                  const newKey = Object.keys(ROOM_TYPES).find(k => ROOM_TYPES[k].name === newName);
                  setEditData({...editData, name: newName, typeKey: newKey});
                }}>
                  {Object.values(ROOM_TYPES).map(t => <option key={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Module ID</label>
                    <input className="w-full border-2 border-slate-300 p-2 text-xs font-black outline-none uppercase" value={editData.room_number} onChange={e => setEditData({...editData, room_number: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Max Capacity</label>
                    <input type="number" className="w-full border-2 border-slate-300 p-2 text-xs font-black outline-none" value={editData.capacity} onChange={e => setEditData({...editData, capacity: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-8 py-6 border-t flex justify-between items-center">
               <button onClick={() => { handleUpdateCell(editSlot, null); setEditSlot(null); }} className="text-red-600 text-[10px] font-black uppercase flex items-center gap-1.5 hover:underline transition-colors"><Trash2 size={14}/> Scrap Module</button>
               <div className="flex gap-4">
                 <button onClick={() => setEditSlot(null)} className="text-[10px] font-black uppercase text-slate-400">Cancel</button>
                 <button onClick={() => { handleUpdateCell(editSlot, editData); setEditSlot(null); }} className="bg-slate-900 text-white px-10 py-2.5 text-[10px] font-black uppercase shadow-lg hover:bg-black">Confirm</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </DndProvider>
  );
};

const DraggableItem = ({ typeKey, config }) => {
  const Icon = config.icon;
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "roomTemplate",
    item: { kind: "template", typeKey },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div ref={dragRef} className={`p-4 border-2 rounded-sm flex items-center gap-4 cursor-grab transition-all ${config.color} ${isDragging ? "opacity-30 scale-95" : "hover:shadow-xl shadow-md border-slate-300"}`}>
      <div className="bg-white/60 p-1.5 rounded-sm shadow-inner"><Icon size={16} /></div>
      <span className="text-[10px] font-black uppercase tracking-widest">{config.name}</span>
    </div>
  );
};

export default CreateRoom;