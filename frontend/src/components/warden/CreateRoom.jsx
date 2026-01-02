import React, { useCallback, useMemo, useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  Bed, ShieldCheck, ShowerHead, Layers, Trash2, 
  MapPin, Square, X, Laptop, Save, Home, MoveRight, Loader2
} from "lucide-react";
import { wardenAPI } from "../../services/api"; 

/* ---------- ARCHITECTURAL CONSTANTS ---------- */

const ROOM_TYPES = {
  STUDENT: { key: "STUDENT", name: "Student Room", icon: Bed },
  WARDEN: { key: "WARDEN", name: "Warden Office", icon: ShieldCheck },
  FACULTY_ROOM: { key: "FACULTY_ROOM", name: "Faculty (Ensuite)", icon: Laptop },
  WASHROOM: { key: "WASHROOM", name: "Common Toilets", icon: ShowerHead },
};

/* ---------- DYNAMIC GRID GENERATOR ---------- */

const generateArchitecturalGrid = (config) => {
  const { building_type, top_rooms, bottom_rooms, left_rooms, right_rooms, orientation, open_side } = config;
  const width = Math.max(top_rooms || 0, bottom_rooms || 0) + 2;
  const height = Math.max(left_rooms || 0, right_rooms || 0) + 2;
  const grid = Array(height).fill(0).map(() => Array(width).fill("EMPTY"));

  const setType = (r, c, type) => { if (grid[r] && grid[r][c] !== undefined) grid[r][c] = type; };

  const hasTop = building_type === 'square' || (building_type === 'u' && open_side !== 't') || (building_type === 'l' && orientation.includes('t')) || building_type === 'single';
  const hasBottom = building_type === 'square' || (building_type === 'u' && open_side !== 'b') || (building_type === 'l' && orientation.includes('b'));
  const hasLeft = building_type === 'square' || (building_type === 'u' && open_side !== 'l') || (building_type === 'l' && orientation.includes('l'));
  const hasRight = building_type === 'square' || (building_type === 'u' && open_side !== 'r') || (building_type === 'l' && orientation.includes('r'));

  setType(0, 0, "VOID"); setType(0, width - 1, "VOID");
  setType(height - 1, 0, "VOID"); setType(height - 1, width - 1, "VOID");

  if (hasTop) for (let i = 1; i <= top_rooms; i++) { setType(0, i, "ROOM"); setType(1, i, "WALK_t"); }
  if (hasBottom) for (let i = 1; i <= bottom_rooms; i++) { setType(height - 1, i, "ROOM"); setType(height - 2, i, "WALK_b"); }
  if (hasLeft) for (let j = 1; j <= left_rooms; j++) { setType(j, 0, "ROOM"); setType(j, 1, "WALK_l"); }
  if (hasRight) for (let j = 1; j <= right_rooms; j++) { setType(j, width - 1, "ROOM"); setType(j, width - 2, "WALK_r"); }

  return grid;
};

/* ---------- MAIN DESIGNER COMPONENT ---------- */

export default function HostelBlueprintDesigner() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    building_type: 'u',
    entrance_side: 'b',
    floors: 1,
    top_rooms: 6,
    bottom_rooms: 4,
    left_rooms: 4,
    right_rooms: 4,
    orientation: 'tl',
    open_side: 'b'
  });

  const [cellData, setCellData] = useState({});
  const [activeModal, setActiveModal] = useState(null);

  // 1. DEBUG: Load Existing Data on Mount
  useEffect(() => {
    const fetchExistingLayout = async () => {
      console.log("DEBUG: Initial load attempt...");
      try {
        const res = await wardenAPI.getLayout();
        console.log("DEBUG: Loaded from DB:", res.data);
        if (res.data?.data) {
          const dbData = res.data.data;
          setConfig({
            building_type: dbData.building_type,
            entrance_side: dbData.entrance_side,
            floors: dbData.floors,
            top_rooms: dbData.top_rooms,
            bottom_rooms: dbData.bottom_rooms,
            left_rooms: dbData.left_rooms,
            right_rooms: dbData.right_rooms,
            orientation: dbData.orientation || 'tl',
            open_side: dbData.open_side || 'b'
          });
          if (dbData.layout_json) {
            setCellData(JSON.parse(dbData.layout_json));
          }
        }
      } catch (err) {
        console.error("DEBUG: Failed to fetch initial layout:", err);
      }
    };
    fetchExistingLayout();
  }, []);

  const grid = useMemo(() => generateArchitecturalGrid(config), [config]);

  // 2. DATABASE COMMIT LOGIC WITH FULL LOGGING
  const handleCommit = async () => {
    console.log("--- COMMIT START ---");
    console.log("DEBUG: Current Config:", config);
    console.log("DEBUG: Current CellData (Room placements):", cellData);

    setLoading(true);
    try {
      const payload = {
        building_type: config.building_type,
        entrance_side: config.entrance_side,
        floors: Number(config.floors),
        top_rooms: Number(config.top_rooms),
        bottom_rooms: Number(config.bottom_rooms),
        left_rooms: Number(config.left_rooms),
        right_rooms: Number(config.right_rooms),
        orientation: config.building_type === 'l' ? config.orientation : null,
        open_side: config.building_type === 'u' ? config.open_side : null,
        layout_json: JSON.stringify(cellData) // This is the dynamic room positions
      };

      console.log("DEBUG: Final Prepared Payload:", payload);

      const response = await wardenAPI.saveLayout(payload);
      
      console.log("DEBUG: API Response Status:", response.status);
      console.log("DEBUG: API Response Data:", response.data);

      if (response.data?.success || response.success) {
        alert("Success: Layout synchronized with database.");
      } else {
        console.warn("DEBUG: Server responded but Success was false:", response.data);
        throw new Error(response.data?.message || "Server rejected data");
      }
    } catch (err) {
      console.error("--- COMMIT FAILED ---");
      console.error("DEBUG: Full Error Object:", err);
      
      if (err.response) {
        console.error("DEBUG: Server Error Code:", err.response.status);
        console.error("DEBUG: Server Error Body:", err.response.data);
        alert(`Server Error (${err.response.status}): ${err.response.data?.message || err.message}`);
      } else if (err.request) {
        console.error("DEBUG: No response received from API. Check if server is running.");
        alert("No response from server. Check network connection.");
      } else {
        console.error("DEBUG: Logic Error:", err.message);
        alert(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
      console.log("--- COMMIT END ---");
    }
  };

  const handleDrop = (slot, item) => {
    const type = ROOM_TYPES[item.typeKey];
    setCellData(prev => ({
      ...prev,
      [slot]: { 
        typeKey: item.typeKey, // Store the string key (e.g., "STUDENT")
        room_number: `R-${1100 + Math.floor(Math.random() * 99)}` 
      }
    }));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-[#fcfdff] p-8 font-serif text-slate-900 select-none">
        
        {/* Header Section */}
        <header className="max-w-[1500px] mx-auto flex justify-between items-center border-b-2 border-blue-900 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-900 text-white rounded-sm shadow-xl"><Layers size={24} /></div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-blue-900 italic">Blueprint Studio Pro</h1>
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Warden Control Panel | tbl_HostelLayout</p>
            </div>
          </div>
          <button 
            onClick={handleCommit}
            disabled={loading}
            className="bg-blue-900 text-white px-10 py-3 rounded-sm font-bold text-[10px] uppercase shadow-2xl flex items-center gap-2 hover:bg-black disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {loading ? "Committing..." : "Commit Blueprint"}
          </button>
        </header>

        <div className="max-w-[1500px] mx-auto grid grid-cols-12 gap-10">
          
          {/* Sidebar Controls */}
          <aside className="col-span-3 space-y-6">
            
            <section className="bg-white p-5 border border-blue-100 shadow-sm rounded-lg">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-900 mb-5 border-b pb-2 flex items-center gap-2">
                <Home size={14} /> Building Structure
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase">Shape Type</label>
                  <select className="w-full border-2 border-slate-50 p-2 text-xs font-bold uppercase outline-none focus:border-blue-900" value={config.building_type} onChange={e => setConfig({...config, building_type: e.target.value})}>
                    <option value="single">Single (Linear)</option>
                    <option value="l">L-Shaped</option>
                    <option value="u">U-Shaped</option>
                    <option value="square">Square / Courtyard</option>
                  </select>
                </div>

                {config.building_type === 'u' && (
                  <div>
                    <label className="text-[8px] font-black text-slate-400 uppercase">Open Side</label>
                    <select className="w-full border-2 border-slate-50 p-2 text-xs font-bold uppercase outline-none" value={config.open_side} onChange={e => setConfig({...config, open_side: e.target.value})}>
                      <option value="t">Top</option><option value="b">Bottom</option><option value="l">Left</option><option value="r">Right</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  {['top', 'bottom', 'left', 'right'].map(side => (
                    <div key={side}>
                      <label className="text-[8px] font-black text-slate-400 uppercase">{side} Unit Count</label>
                      <input type="number" value={config[`${side}_rooms`]} onChange={e => setConfig({...config, [`${side}_rooms`]: Number(e.target.value)})} className="w-full border-2 border-slate-50 p-2 text-xs font-bold outline-none focus:border-blue-900" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-slate-900 p-6 shadow-2xl rounded-lg">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-300 mb-5 flex items-center gap-2">
                <MoveRight size={14} /> Room Modules
              </h3>
              <div className="space-y-2">
                {Object.entries(ROOM_TYPES).map(([key, room]) => (
                  <DraggableRoom key={key} typeKey={key} config={room} />
                ))}
              </div>
            </section>

            <section className="bg-white p-5 border border-blue-100 shadow-sm rounded-lg">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-4 flex items-center gap-2">
                <MapPin size={14} /> Entrance (Side)
              </h3>
              <div className="grid grid-cols-3 gap-1">
                <div />
                <button onClick={() => setConfig({...config, entrance_side: 't'})} className={`p-2 border text-[9px] font-bold ${config.entrance_side === 't' ? 'bg-orange-600 text-white' : 'bg-slate-50'}`}>T</button>
                <div />
                <button onClick={() => setConfig({...config, entrance_side: 'l'})} className={`p-2 border text-[9px] font-bold ${config.entrance_side === 'l' ? 'bg-orange-600 text-white' : 'bg-slate-50'}`}>L</button>
                <div className="flex items-center justify-center opacity-10"><Square size={12}/></div>
                <button onClick={() => setConfig({...config, entrance_side: 'r'})} className={`p-2 border text-[9px] font-bold ${config.entrance_side === 'r' ? 'bg-orange-600 text-white' : 'bg-slate-50'}`}>R</button>
                <div />
                <button onClick={() => setConfig({...config, entrance_side: 'b'})} className={`p-2 border text-[9px] font-bold ${config.entrance_side === 'b' ? 'bg-orange-600 text-white' : 'bg-slate-50'}`}>B</button>
                <div />
              </div>
            </section>
          </aside>

          {/* Canvas Floor Plan */}
          <main className="col-span-9 bg-white p-12 border-2 border-blue-100 shadow-2xl relative overflow-auto min-h-[850px]">
             {/* Blueprint Technical Grid */}
             <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
             <div className="relative z-10 flex flex-col items-center">
                {config.entrance_side === 't' && <EntranceLabel side="t" />}

                <div className="flex items-center">
                  {config.entrance_side === 'l' && <EntranceLabel side="l" />}
                  
                  <div className="inline-block bg-white border-[4px] border-blue-900 shadow-2xl relative">
                    {grid.map((row, rIdx) => (
                      <div key={rIdx} className="flex">
                        {row.map((type, cIdx) => (
                          <div key={`${rIdx}-${cIdx}`} className="w-[100px] h-[120px]">
                            <GridCell 
                              type={type}
                              slotId={`${rIdx}-${cIdx}`}
                              data={cellData[`${rIdx}-${cIdx}`]}
                              entranceSide={config.entrance_side}
                              onDrop={handleDrop}
                              onSetEntrance={(s) => setConfig({...config, entrance_side: s})}
                              onEdit={(s, d) => setActiveModal({s, d})}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {config.entrance_side === 'r' && <EntranceLabel side="r" />}
                </div>

                {config.entrance_side === 'b' && <EntranceLabel side="b" />}
             </div>
          </main>
        </div>
      </div>

      {/* Edit Overlay */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/30 backdrop-blur-sm">
          <div className="bg-white w-72 border-[3px] border-blue-900 p-8 shadow-2xl">
            <h2 className="text-[10px] font-black uppercase border-b border-slate-100 pb-3 mb-6 tracking-widest text-blue-900">Module: {activeModal.d.room_number}</h2>
            <button 
              onClick={() => { setCellData(prev => (({ [activeModal.s]: _, ...rest }) => rest)(prev)); setActiveModal(null); }}
              className="w-full bg-red-600 text-white py-3 text-[10px] font-black uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-red-700"
            >
              <Trash2 size={14} /> Remove Room
            </button>
            <button onClick={() => setActiveModal(null)} className="w-full mt-4 text-slate-400 text-[9px] font-bold uppercase hover:text-blue-900">Cancel</button>
          </div>
        </div>
      )}
    </DndProvider>
  );
}

/* ---------- INTERNAL HELPER COMPONENTS ---------- */

function DraggableRoom({ typeKey, config }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ROOM_BLOCK",
    item: { typeKey },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div ref={drag} className={`p-4 border-2 rounded-sm flex items-center gap-4 cursor-grab transition-all bg-white border-blue-100 hover:border-blue-900 shadow-sm ${isDragging ? 'opacity-30 scale-95' : ''}`}>
      <div className="text-blue-900"><config.icon size={18} /></div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{config.name}</span>
    </div>
  );
}

function GridCell({ type, slotId, data, entranceSide, onDrop, onSetEntrance, onEdit }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "ROOM_BLOCK",
    drop: (item) => onDrop(slotId, item),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));

  if (type === "EMPTY") return <div className="w-full h-full" />;
  if (type === "VOID") return <div className="w-full h-full bg-blue-50/30 border border-blue-50 flex items-center justify-center"><X size={14} className="text-blue-100" /></div>;

  if (type.startsWith("WALK_")) {
    const side = type.split("_")[1];
    const isEntrance = entranceSide === side;
    return (
      <div 
        onClick={() => onSetEntrance(side)}
        className={`w-full h-full relative border-[0.5px] border-blue-100 flex items-center justify-center cursor-pointer transition-colors ${isEntrance ? 'bg-orange-50/50' : 'hover:bg-blue-50/50'}`}
      >
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h15v15H0V0zm15 15h15v15H15V15z' fill='%231e3a8a'/%3E%3C/svg%3E")`, backgroundSize: '15px 15px' }} />
        <span className={`text-[7px] font-serif font-black uppercase tracking-widest z-10 ${isEntrance ? 'text-orange-600' : 'text-blue-200'}`}>
          {isEntrance ? "Entry" : "Walkway"}
        </span>
      </div>
    );
  }

  // --- FIX START ---
  // Look up the icon and name from our constant based on the saved typeKey
  const roomConfig = data ? ROOM_TYPES[data.typeKey] : null;
  const IconComponent = roomConfig ? roomConfig.icon : null;
  const roomName = roomConfig ? roomConfig.name : "Modular Slot";
  // --- FIX END ---

  return (
    <div ref={drop} onClick={() => data && onEdit(slotId, data)} className={`w-full h-full p-1 cursor-pointer transition-transform ${isOver ? 'scale-95' : ''}`}>
      <div className={`w-full h-full border-[1.5px] border-blue-900 flex flex-col ${data ? 'bg-white shadow-sm' : 'bg-transparent border-dashed border-blue-200'}`}>
        {data && IconComponent ? (
          <>
            <div className="px-1 border-b border-blue-50 text-[8px] font-serif font-bold text-blue-900 py-0.5">{data.room_number}</div>
            <div className="flex-1 flex items-center justify-center opacity-30">
              {/* Render the component safely */}
              <IconComponent size={20} className="text-blue-900" /> 
            </div>
            <div className="bg-blue-900 text-white text-[7px] font-serif font-black uppercase text-center py-1 truncate px-1">
              {roomName}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-blue-100 text-[6px] font-serif font-bold uppercase tracking-widest text-center px-1">
            {data ? "Unknown Type" : "Modular Slot"}
          </div>
        )}
      </div>
    </div>
  );
}

function EntranceLabel({ side }) {
  const styles = {
    t: "mb-4 bg-orange-600 text-white px-8 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] rounded-t shadow-lg animate-pulse",
    b: "mt-4 bg-orange-600 text-white px-8 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] rounded-b shadow-lg animate-pulse",
    l: "mr-8 bg-orange-600 text-white px-1.5 py-8 text-[10px] font-black uppercase tracking-[0.3em] [writing-mode:vertical-lr] rotate-180 shadow-lg animate-pulse",
    r: "ml-8 bg-orange-600 text-white px-1.5 py-8 text-[10px] font-black uppercase tracking-[0.3em] [writing-mode:vertical-lr] shadow-lg animate-pulse"
  };
  return <div className={styles[side]}>Main Entrance</div>;
}