import React, { useEffect, useMemo, useState } from "react";
import { Card, Empty, Skeleton, Tag } from 'antd';
import WorkspaceAlert from '../common/WorkspaceAlert';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import { useWardenHostelName } from './WardenWorkspace';
import { 
  Bed, ShieldCheck, ShowerHead, Laptop, 
  Layers, MapPin, Square, X, Home, Info 
} from "lucide-react";
import { wardenAPI } from "../../services/api";

/* ---------- ARCHITECTURAL CONSTANTS ---------- */
const ROOM_TYPES = {
  STUDENT: { key: "STUDENT", name: "Student Room", icon: Bed },
  WARDEN: { key: "WARDEN", name: "Warden Office", icon: ShieldCheck },
  FACULTY_ROOM: { key: "FACULTY_ROOM", name: "Faculty (Ensuite)", icon: Laptop },
  WASHROOM: { key: "WASHROOM", name: "Common Toilets", icon: ShowerHead },
};

/* ---------- DYNAMIC GRID GENERATOR (Architectural Logic) ---------- */
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

  // Structural Pillars
  setType(0, 0, "VOID"); setType(0, width - 1, "VOID");
  setType(height - 1, 0, "VOID"); setType(height - 1, width - 1, "VOID");

  // Wings Rendering
  if (hasTop) for (let i = 1; i <= top_rooms; i++) { setType(0, i, "ROOM"); setType(1, i, "WALK_t"); }
  if (hasBottom) for (let i = 1; i <= bottom_rooms; i++) { setType(height - 1, i, "ROOM"); setType(height - 2, i, "WALK_b"); }
  if (hasLeft) for (let j = 1; j <= left_rooms; j++) { setType(j, 0, "ROOM"); setType(j, 1, "WALK_l"); }
  if (hasRight) for (let j = 1; j <= right_rooms; j++) { setType(j, width - 1, "ROOM"); setType(j, width - 2, "WALK_r"); }

  return grid;
};

/* ---------- VIEW COMPONENT ---------- */
const ViewLayout = () => {
  const hostelName = useWardenHostelName();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [layoutConfig, setLayoutConfig] = useState(null);
  const [cellData, setCellData] = useState({});

  useEffect(() => {
    const loadLayout = async () => {
      try {
        setLoading(true);
        const res = await wardenAPI.getLayout();
        const data = res.data.data;

        if (data) {
          setLayoutConfig(data);
          if (data.layout_json) {
            setCellData(JSON.parse(data.layout_json));
          }
        }
      } catch (error) {
        setError(error.message || 'Unable to load the hostel layout.');
      } finally {
        setLoading(false);
      }
    };
    loadLayout();
  }, []);

  const grid = useMemo(() => {
    if (!layoutConfig) return [];
    return generateArchitecturalGrid(layoutConfig);
  }, [layoutConfig]);

  return (
    <section className="module-page">
      <WorkspacePageHeader title="Hostel Layout" icon={Layers}
        description={[hostelName, layoutConfig?.building_type && `${layoutConfig.building_type}-shaped layout`].filter(Boolean).join(' · ')}>
        {layoutConfig?.entrance_side && <Tag color="orange">Main entrance · Side {layoutConfig.entrance_side.toUpperCase()}</Tag>}
      </WorkspacePageHeader>
      {loading ? <Card><Skeleton active /></Card> : error ? <WorkspaceAlert type="error" title={error} showIcon />
        : !layoutConfig ? <Card><Empty description="No hostel layout has been saved yet." /></Card> : <>
      <section aria-label="Hostel floor plan" tabIndex={0} className="bg-white rounded-surface p-4 md:p-8 border border-slate-200 relative overflow-auto min-h-[420px]">
        {/* Blueprint Grid Background */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />

        <div className="relative z-10 flex w-max min-w-full flex-col items-center">
          {layoutConfig.entrance_side === 't' && <EntranceLabel side="t" />}

          <div className="flex items-center">
            {layoutConfig.entrance_side === 'l' && <EntranceLabel side="l" />}
            
            <div className="inline-block bg-white border-[4px] border-blue-900 shadow-2xl relative">
              {grid.map((row, rIdx) => (
                <div key={rIdx} className="flex">
                  {row.map((type, cIdx) => (
                    <div key={`${rIdx}-${cIdx}`} className="w-[100px] h-[120px]">
                      <GridCell 
                        type={type}
                        data={cellData[`${rIdx}-${cIdx}`]}
                        entranceSide={layoutConfig.entrance_side}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {layoutConfig.entrance_side === 'r' && <EntranceLabel side="r" />}
          </div>

          {layoutConfig.entrance_side === 'b' && <EntranceLabel side="b" />}
        </div>
      </section>

      <footer className="max-w-[1400px] mx-auto mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Object.entries(ROOM_TYPES).map(([key, cfg]) => (
              <div key={key} className="bg-white p-3 border border-blue-50 flex items-center gap-3 shadow-sm">
                  <cfg.icon size={16} className="text-blue-900" />
                  <span className="text-[10px] font-bold uppercase text-slate-600">{cfg.name}</span>
              </div>
          ))}
      </footer>
      </>}
    </section>
  );
};

/* ---------- SUB-COMPONENTS ---------- */

function GridCell({ type, data, entranceSide }) {
  if (type === "EMPTY") return <div className="w-full h-full" />;
  if (type === "VOID") return <div className="w-full h-full bg-blue-50/30 border border-blue-50 flex items-center justify-center"><X size={14} className="text-blue-100" /></div>;

  // Walkway Logic
  if (type.startsWith("WALK_")) {
    const side = type.split("_")[1];
    const isEntrance = entranceSide === side;
    return (
      <div className={`w-full h-full relative border-[0.5px] border-blue-100 flex items-center justify-center transition-colors ${isEntrance ? 'bg-orange-50/50' : ''}`}>
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h15v15H0V0zm15 15h15v15H15V15z' fill='%231e3a8a'/%3E%3C/svg%3E")`, backgroundSize: '15px 15px' }} />
        <span className={`text-[7px] font-serif font-black uppercase tracking-widest z-10 ${isEntrance ? 'text-orange-600' : 'text-blue-200'}`}>
          {isEntrance ? "Main Entry" : "Walkway"}
        </span>
      </div>
    );
  }

  // Room Logic
  const roomConfig = data ? ROOM_TYPES[data.typeKey] : null;
  const Icon = roomConfig?.icon;

  return (
    <div className="w-full h-full p-1">
      <div className={`w-full h-full border-[1.5px] border-blue-900 flex flex-col ${data ? 'bg-white shadow-sm' : 'bg-transparent border-dashed border-blue-100'}`}>
        {data && Icon ? (
          <>
            <div className="px-1 border-b border-blue-50 text-[8px] font-serif font-bold text-blue-900 py-0.5">{data.room_number}</div>
            <div className="flex-1 flex items-center justify-center opacity-30"><Icon size={20} className="text-blue-900" /></div>
            <div className="bg-blue-900 text-white text-[7px] font-serif font-black uppercase text-center py-1 truncate px-1">
              {roomConfig.name}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-blue-50 text-[6px] font-serif font-bold uppercase tracking-widest text-center px-1">
            Unassigned Room
          </div>
        )}
      </div>
    </div>
  );
}

function EntranceLabel({ side }) {
  const styles = {
    t: "mb-4 bg-orange-600 text-white px-8 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] rounded-t-compact shadow-lg animate-pulse",
    b: "mt-4 bg-orange-600 text-white px-8 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] rounded-b-compact shadow-lg animate-pulse",
    l: "mr-8 bg-orange-600 text-white px-1.5 py-8 text-[10px] font-black uppercase tracking-[0.3em] [writing-mode:vertical-lr] rotate-180 shadow-lg animate-pulse",
    r: "ml-8 bg-orange-600 text-white px-1.5 py-8 text-[10px] font-black uppercase tracking-[0.3em] [writing-mode:vertical-lr] shadow-lg animate-pulse"
  };
  return <div className={styles[side]}>Entrance</div>;
}

export default ViewLayout;
