import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { wardenAPI } from "../../services/api";

// Icons (Using inline spans for placeholders)
const IconBuilding = () => <span className="mr-2 text-indigo-500">🏢</span>;
const IconDoor = () => <span className="mr-2 text-indigo-500">🚪</span>;
const IconFloor = () => <span className="mr-2 text-indigo-500">🪜</span>;
const IconSave = () => <span className="mr-2 text-white">💾</span>;
const IconLoad = () => <span className="mr-2 text-white">🔄</span>;
const IconRoom = () => <span className="mr-2 text-indigo-500">🛌</span>;
const IconMap = () => <span className="mr-2 text-indigo-600">🗺️</span>;

/* ---------- helpers (UNCHANGED) ---------- */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const indexToLetters = (index) => {
  let n = index;
  let result = "";
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
};

const lettersToIndex = (value) =>
  value
    .toUpperCase()
    .split("")
    .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;

const parseCellId = (cellId) => {
  const [floorIdx, rowIdx, colIdx] = cellId.split("-").map((n) => parseInt(n, 10));
  return { floorIdx, rowIdx, colIdx };
};

const makeRoomNumber = (floors, cellId, colPad = 2) => {
  const { floorIdx, rowIdx, colIdx } = parseCellId(cellId);
  const floorNumber = floors - floorIdx;
  const rowLabel = indexToLetters(rowIdx);
  const columnLabel = String(colIdx + 1).padStart(colPad, "0");
  return `${floorNumber}-${rowLabel}${columnLabel}`;
};

const deriveSlotFromRoomNumber = (roomNumber, floors) => {
  if (!roomNumber || !roomNumber.includes("-")) return null;

  const [floorPart, gridPart] = roomNumber.split("-");
  const floorNumber = parseInt(floorPart, 10);
  if (Number.isNaN(floorNumber)) return null;

  const rowLetters = gridPart.match(/^[A-Z]+/i)?.[0];
  const colPart = gridPart.slice(rowLetters ? rowLetters.length : 0);
  const colNumber = parseInt(colPart, 10);

  if (!rowLetters || Number.isNaN(colNumber)) return null;

  const floorIdx = floors - floorNumber;
  const rowIdx = lettersToIndex(rowLetters);
  const colIdx = colNumber - 1;

  if ([floorIdx, rowIdx, colIdx].some((n) => n < 0)) return null;

  return `${floorIdx}-${rowIdx}-${colIdx}`;
};

const defaultRoomData = (slot, floors, baseName) => ({
  layout_slot: slot,
  autoNumbered: true,
  room_id: null,
  type_id: null,
  name: baseName,
  category: baseName,
  capacity: 1,
  inactive: false,
  room_number: makeRoomNumber(floors, slot),
});

const generateGridShape = ({
  buildingType,
  topRooms,
  bottomRooms,
  leftRooms,
  rightRooms,
  uOpenSide,
  lOrientation,
}) => {
  const maxWidth = Math.max(1, topRooms, bottomRooms, leftRooms, rightRooms);

  const sections = { top: false, bottom: false, left: false, right: false };

  if (buildingType === "single") sections.top = true;
  if (buildingType === "square") sections.top = sections.bottom = sections.left = sections.right = true;

  if (buildingType === "l") {
    if (lOrientation === "tl") sections.top = sections.left = true;
    if (lOrientation === "tr") sections.top = sections.right = true;
    if (lOrientation === "bl") sections.bottom = sections.left = true;
    if (lOrientation === "br") sections.bottom = sections.right = true;
  }

  if (buildingType === "u") {
    sections.top = sections.bottom = sections.left = sections.right = true;
    if (uOpenSide === "t") sections.top = false;
    if (uOpenSide === "b") sections.bottom = false;
    if (uOpenSide === "l") sections.left = false;
    if (uOpenSide === "r") sections.right = false;
  }

  const grid = [];

  if (sections.top) {
    grid.push(Array.from({ length: maxWidth }, (_, idx) => (idx < topRooms ? "TOP" : "EMPTY")));
  }

  const middleHeight = Math.max(leftRooms, rightRooms, 1);
  for (let row = 0; row < middleHeight; row += 1) {
    grid.push(
      Array.from({ length: maxWidth }, (_, col) => {
        if (col === 0 && sections.left && row < leftRooms) return "LEFT";
        if (col === maxWidth - 1 && sections.right && row < rightRooms) return "RIGHT";
        return "EMPTY";
      }),
    );
  }

  if (sections.bottom) {
    grid.push(
      Array.from({ length: maxWidth }, (_, idx) => (idx < bottomRooms ? "BOTTOM" : "EMPTY")),
    );
  }

  return grid;
};

/* ---------- drag/drop (UPGRADED STYLES) ---------- */
const DraggableRoomType = ({ typeName }) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "roomType",
    item: { kind: "template", typeName },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  // Upgraded template styling to match theme
  return (
    <div
      ref={dragRef}
      className={`p-3 border-2 border-dashed rounded-lg mb-2 bg-gray-50 text-gray-700 font-medium cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-opacity transform hover:scale-[1.01] ${
        isDragging ? "opacity-50 border-indigo-400" : "border-gray-300"
      }`}
    >
      <IconRoom />
      {typeName}
    </div>
  );
};

const DropZone = ({ slotId, data, active, onDrop, onClickEdit }) => {
  const [{ isOver }, dropRef] = useDrop(
    () => ({
      accept: ["roomType", "existingRoom"],
      drop: (item) => onDrop(slotId, item),
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [slotId, data, onDrop],
  );

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: "existingRoom",
      item: data ? { kind: "existing", from: slotId, data } : {},
      canDrag: () => Boolean(data),
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [slotId, data],
  );

  const refCallback = useCallback(
    (node) => {
      dropRef(node);
      if (data && node) dragRef(node);
    },
    [dropRef, dragRef, data],
  );

  if (!active) return <div className="w-full h-full bg-gray-50/50" />; 

  // Determine base styles for the room cell
  let baseClasses = "border-2 rounded-lg flex flex-col items-center justify-center text-xs p-1 select-none transition-all duration-150 cursor-pointer";
  let contentClasses = "flex flex-col items-center justify-center h-full";
  
  if (data) {
    // Existing room styles (upgraded)
    baseClasses += data.inactive
      ? " bg-red-100 border-red-400 text-red-800 hover:bg-red-200"
      : " bg-indigo-100 border-indigo-400 text-indigo-900 font-semibold hover:bg-indigo-200";
    contentClasses += data.inactive ? " opacity-70" : "";
  } else {
    // Empty drop zone styles (upgraded)
    baseClasses += " border-dashed border-gray-300 bg-white hover:bg-gray-100 text-gray-500 hover:border-indigo-400";
  }

  // Dragging/hover effects
  baseClasses += isDragging ? " opacity-40 shadow-xl" : "";
  baseClasses += isOver ? " ring-4 ring-offset-2 ring-green-500 shadow-lg" : "";

  return (
    <div
      ref={refCallback}
      onClick={() => data && onClickEdit(slotId, data)}
      className={baseClasses}
      style={{ width: "100%", height: "100%" }}
    >
      <div className={contentClasses}>
        {data ? (
          <>
            <strong className="text-sm text-center truncate w-full px-1">{data.name}</strong>
            <span className="text-xs font-mono mt-1"># {data.room_number || "—"}</span>
            <span className="text-[10px] opacity-90">Capacity: {data.capacity}</span>
            {data.inactive && <span className="text-[10px] font-bold text-red-600 animate-pulse mt-1">(INACTIVE)</span>}
          </>
        ) : (
          <span className="text-sm font-medium">Drop Room Here</span>
        )}
      </div>
    </div>
  );
};

const EntranceLabel = ({ side }) => {
  if (!side) return null;
  // Used a deep amber/orange for the entrance to clearly contrast with the indigo/blue theme.
  const label = <span className="font-bold text-sm text-amber-600 bg-amber-100 px-3 py-1 rounded-full shadow-md whitespace-nowrap">MAIN ENTRANCE</span>;
  
  // Upgraded entrance label positioning and styling
  if (side === "t") return <div className="text-center mb-2 -mt-2">{label}</div>;
  if (side === "b") return <div className="text-center mt-2 -mb-2">{label}</div>;
  if (side === "l")
    return (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-4">
        <div className="rotate-90 origin-bottom-left transform -translate-x-full">{label}</div>
      </div>
    );
  if (side === "r")
    return (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-4">
        <div className="-rotate-90 origin-bottom-right transform translate-x-full">{label}</div>
      </div>
    );
  return null;
};

/* ---------- main component (UPGRADED STYLES) ---------- */
const CreateRoom = ({ hostelId }) => {
  const [buildingType, setBuildingType] = useState("single");
  const [floors, setFloors] = useState(1);
  const [topRooms, setTopRooms] = useState(0);
  const [bottomRooms, setBottomRooms] = useState(0);
  const [leftRooms, setLeftRooms] = useState(0);
  const [rightRooms, setRightRooms] = useState(0);
  const [entranceSide, setEntranceSide] = useState("b");
  const [uOpenSide, setUOpenSide] = useState("b");
  const [lOrientation, setLOrientation] = useState("tl");

  const [cellData, setCellData] = useState({});
  const [editSlot, setEditSlot] = useState(null);
  const [editData, setEditData] = useState(null);

  const settings = useMemo(
    () => ({
      buildingType,
      topRooms,
      bottomRooms,
      leftRooms,
      rightRooms,
      uOpenSide,
      lOrientation,
    }),
    [buildingType, topRooms, bottomRooms, leftRooms, rightRooms, uOpenSide, lOrientation],
  );

  const gridShape = useMemo(() => generateGridShape(settings), [settings]);

  /* ---------- Handlers (UNCHANGED LOGIC) ---------- */

  const handleUpdateCell = useCallback(
    (slot, updater) => {
      setCellData((prev) => {
        const existing = prev[slot];
        const nextValue = typeof updater === "function" ? updater(existing) : updater;

        if (!nextValue) {
          if (!existing) return prev;
          const { [slot]: _, ...rest } = prev;
          return rest;
        }

        const autoNumbered =
          nextValue.autoNumbered ??
          (existing ? existing.autoNumbered : !nextValue.room_number || nextValue.room_number === makeRoomNumber(floors, slot));

        const roomNumber =
          nextValue.room_number && !autoNumbered ? nextValue.room_number : makeRoomNumber(floors, slot);

        return {
          ...prev,
          [slot]: {
            ...nextValue,
            layout_slot: slot,
            autoNumbered,
            room_number: roomNumber,
          },
        };
      });
    },
    [floors],
  );

  const handleDrop = useCallback(
    (slot, payload) => {
      if (payload.kind === "template") {
        handleUpdateCell(slot, defaultRoomData(slot, floors, payload.typeName));
        return;
      }

      if (payload.kind === "existing") {
        const { from, data } = payload;
        if (from !== slot) handleUpdateCell(from, null);
        handleUpdateCell(slot, {
          ...data,
          layout_slot: slot,
          room_number: data.autoNumbered ? makeRoomNumber(floors, slot) : data.room_number,
        });
      }
    },
    [floors, handleUpdateCell],
  );

  const openEditor = useCallback((slot, data) => {
    setEditSlot(slot);
    setEditData({ ...data });
  }, []);

  const closeEditor = useCallback(() => {
    setEditSlot(null);
    setEditData(null);
  }, []);

  const commitEditor = useCallback(() => {
    if (!editSlot || !editData) return;
    handleUpdateCell(editSlot, editData);
    closeEditor();
  }, [editSlot, editData, handleUpdateCell, closeEditor]);

  const loadLayoutFromDB = useCallback(async () => {
    try {
      const [layoutRes, typesRes, roomsRes] = await Promise.all([
        wardenAPI.getLayout(),
        wardenAPI.getRoomTypes(),
        wardenAPI.getRooms(),
      ]);

      const layout = layoutRes.data.data;
      if (!layout) {
        alert("No layout saved for this hostel yet.");
        return;
      }

      setBuildingType(layout.building_type);
      setFloors(layout.floors);
      setEntranceSide(layout.entrance_side);
      setTopRooms(layout.top_rooms ?? 0);
      setBottomRooms(layout.bottom_rooms ?? 0);
      setLeftRooms(layout.left_rooms ?? 0);
      setRightRooms(layout.right_rooms ?? 0);
      if (layout.building_type === "u" && layout.open_side) setUOpenSide(layout.open_side);
      if (layout.building_type === "l" && layout.orientation) setLOrientation(layout.orientation);

      const types = typesRes.data.data || [];
      const rooms = roomsRes.data.data || [];

      const mapping = {};
      rooms.forEach((room) => {
        if (!room.is_active) return;
        const slot = room.layout_slot || deriveSlotFromRoomNumber(room.room_number, layout.floors);
        if (!slot) return;

        const type = types.find((t) => t.id === room.room_type_id);
        mapping[slot] = {
          layout_slot: slot,
          room_id: room.id,
          type_id: room.room_type_id,
          name: type?.name || room.room_number || "Unnamed room",
          category: type?.description || "",
          capacity: type?.capacity || room.capacity || 1,
          room_number: room.room_number,
          inactive: !room.is_active,
          autoNumbered: room.room_number === makeRoomNumber(layout.floors, slot),
        };
      });

      setCellData(mapping);
      alert("Layout loaded successfully.");
    } catch (error) {
      console.error("Failed to load layout:", error);
      alert(error.message || "Failed to load layout");
    }
  }, []);

  useEffect(() => {
    loadLayoutFromDB();
  }, [loadLayoutFromDB]);

  const saveLayoutToDB = useCallback(async () => {
    try {
      const activeCells = Object.entries(cellData);
      for (const [, data] of activeCells) {
        if (!data) continue;
        if (!data.room_number || data.room_number.trim() === "") {
          throw new Error(`Room number is required for ${data.name}.`);
        }
      }

      await wardenAPI.saveLayout({
        building_type: buildingType,
        entrance_side: entranceSide,
        floors,
        top_rooms: topRooms,
        bottom_rooms: bottomRooms,
        left_rooms: leftRooms,
        right_rooms: rightRooms,
        orientation: lOrientation,
        open_side: uOpenSide,
      });

      const [typesRes, roomsRes] = await Promise.all([wardenAPI.getRoomTypes(), wardenAPI.getRooms()]);
      const existingTypes = typesRes.data.data || [];
      const existingRooms = roomsRes.data.data || [];

      const usedTypes = new Map();
      const usedRooms = new Map();
      const updatedCells = { ...cellData };

      for (const [slot, data] of activeCells) {
        if (!data) continue;

        const slotMeta = parseCellId(slot);
        const floorNumber = floors - slotMeta.floorIdx;

        let typeId = data.type_id;
        if (!typeId) {
          const createRes = await wardenAPI.createRoomType({
            name: data.name,
            capacity: data.capacity,
            description: data.category,
          });
          typeId = createRes.data.data.id;
        } else {
          await wardenAPI.updateRoomType(typeId, {
            name: data.name,
            capacity: data.capacity,
            description: data.category,
          });
        }
        usedTypes.set(typeId, true);

        const payload = {
          room_type_id: typeId,
          room_number: data.room_number,
          floor: floorNumber,
          layout_slot: slot,
          is_active: !data.inactive,
        };

        if (data.room_id) {
          await wardenAPI.updateRoom(data.room_id, payload);
          usedRooms.set(data.room_id, true);
        } else {
          const createRoomRes = await wardenAPI.createRoom({ ...payload, hostel_id: hostelId });
          const newRoomId = createRoomRes.data.data.id;
          usedRooms.set(newRoomId, true);
          updatedCells[slot] = { ...data, room_id: newRoomId, type_id: typeId };
        }
      }

      for (const room of existingRooms) {
        if (!room.is_active) continue;
        if (!usedRooms.has(room.id)) {
          await wardenAPI.updateRoom(room.id, { is_active: false });
        }
      }

      const refreshedRooms = (await wardenAPI.getRooms()).data.data ?? [];

      for (const type of existingTypes) {
        const stillReferenced = refreshedRooms.some(
          (room) => room.room_type_id === type.id
        );

        if (!stillReferenced && !usedTypes.has(type.id)) {
          try {
            await wardenAPI.deleteRoomType(type.id);
          } catch (err) {
            console.warn(
              `Room type ${type.id} could not be deleted:`,
              err?.response?.data?.message || err.message
            );
          }
        }
      }
      setCellData(updatedCells);
      alert("Layout saved successfully.");
    } catch (error) {
      console.error("Failed to save layout:", error);
      alert(error.message || "Layout save failed");
    }
  }, [
    cellData,
    buildingType,
    entranceSide,
    floors,
    topRooms,
    bottomRooms,
    leftRooms,
    rightRooms,
    lOrientation,
    uOpenSide,
    hostelId,
  ]);

  const renderedGrid = useMemo(
    () => (
      // Upgraded grid container with subtle border/shadow
      <div className="relative p-2 border-2 border-gray-200 rounded-xl shadow-inner bg-gray-50">
        <EntranceLabel side={entranceSide} />
        {Array.from({ length: floors }).map((_, floorIdx) => (
          <div key={floorIdx} className="mb-6 first:mt-4">
            <h3 className="mb-3 text-lg font-bold text-gray-800 border-b border-gray-200 pb-1">
              <IconFloor />Floor {floors - floorIdx}
            </h3>
            {gridShape.map((row, rowIdx) => (
              <div key={`${floorIdx}-${rowIdx}`} className="flex justify-center">
                {row.map((cell, colIdx) => {
                  const slotId = `${floorIdx}-${rowIdx}-${colIdx}`;
                  const active = cell !== "EMPTY";
                  const data = cellData[slotId];
                  return (
                    // Grid cell size and margin adjusted for a cleaner look
                    <div key={slotId} style={{ width: 80, height: 80, margin: 4 }}>
                      <DropZone
                        slotId={slotId}
                        data={data}
                        active={active}
                        onDrop={handleDrop}
                        onClickEdit={openEditor}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
    [cellData, entranceSide, floors, gridShape, handleDrop, openEditor],
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-8 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-2">
          {/* <IconMap /> */}
          Hostel Layout Creator
        </h1>

        {/* configuration - use a card-like grid */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              {/* <IconBuilding /> */}
              Building Type
            </label>
            <select
              value={buildingType}
              onChange={(event) => setBuildingType(event.target.value)}
              className="h-11 w-full rounded-lg border-gray-300 border focus:border-indigo-500 focus:ring-indigo-500 px-4 transition duration-150"
            >
              <option value="single">Straight (Single Side)</option>
              <option value="l">L-Shaped</option>
              <option value="u">U-Shaped</option>
              <option value="square">Square (4-sided)</option>
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              {/* <IconDoor /> */}
              Entrance Side
            </label>
            <select
              value={entranceSide}
              onChange={(event) => setEntranceSide(event.target.value)}
              className="h-11 w-full rounded-lg border-gray-300 border focus:border-indigo-500 focus:ring-indigo-500 px-4 transition duration-150"
            >
              <option value="t">Top</option>
              <option value="b">Bottom</option>
              <option value="l">Left</option>
              <option value="r">Right</option>
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              {/* <IconFloor /> */}
              Floors
            </label>
            <input
              type="number"
              min={1}
              value={floors}
              onChange={(event) => setFloors(Math.max(1, parseInt(event.target.value, 10) || 1))}
              className="h-11 w-full rounded-lg border-gray-300 border focus:border-indigo-500 focus:ring-indigo-500 px-4 transition duration-150"
            />
          </div>
        </section>

        {/* rooms per side / orientation */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <h2 className="mb-4 text-base font-extrabold uppercase tracking-wider text-indigo-700">
              Rooms per side
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Top", setter: setTopRooms, value: topRooms },
                { label: "Bottom", setter: setBottomRooms, value: bottomRooms },
                { label: "Left", setter: setLeftRooms, value: leftRooms },
                { label: "Right", setter: setRightRooms, value: rightRooms },
              ].map(({ label, setter, value }) => (
                <label key={label} className="block text-sm font-medium text-gray-700">
                  {label} Count
                  <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(event) => setter(Math.max(0, parseInt(event.target.value, 10) || 0))}
                    className="mt-1 h-10 w-full rounded-lg border-gray-300 border px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <h2 className="mb-4 text-base font-extrabold uppercase tracking-wider text-indigo-700">
              Building Orientation
            </h2>

            {buildingType === "l" && (
              <label className="block text-sm font-medium text-gray-700">
                L shape Orientation
                <select
                  value={lOrientation}
                  onChange={(event) => setLOrientation(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border-gray-300 border px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150"
                >
                  <option value="tl">Top-Left</option>
                  <option value="tr">Top-Right</option>
                  <option value="bl">Bottom-Left</option>
                  <option value="br">Bottom-Right</option>
                </select>
              </label>
            )}

            {buildingType === "u" && (
              <label className="block text-sm font-medium text-gray-700">
                U shape Opening Side
                <select
                  value={uOpenSide}
                  onChange={(event) => setUOpenSide(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border-gray-300 border px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150"
                >
                  <option value="t">Open Top</option>
                  <option value="b">Open Bottom</option>
                  <option value="l">Open Left</option>
                  <option value="r">Open Right</option>
                </select>
              </label>
            )}

            {["single", "square"].includes(buildingType) && (
                <p className="text-gray-500 text-sm mt-4">No specific orientation required for {buildingType} shape.</p>
            )}
          </div>
        </section>
        
        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            type="button"
            onClick={loadLayoutFromDB}
            className="flex items-center rounded-lg bg-gray-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-gray-800 transition duration-150 transform hover:scale-[1.01]"
          >
            <IconLoad />
            Load Existing Layout
          </button>
          <button
            type="button"
            onClick={saveLayoutToDB}
            className="flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-indigo-700 transition duration-150 transform hover:scale-[1.01]"
          >
            <IconSave />
            Save Current Layout
          </button>
        </div>

        {/* Main Workspace */}
        <section className="flex gap-6 lg:flex-row flex-col">
          <aside className="lg:w-64 w-full rounded-xl border border-gray-200 bg-white p-5 shadow-lg lg:sticky lg:top-4 h-fit">
            <h3 className="mb-4 text-base font-extrabold uppercase tracking-wider text-indigo-700 border-b pb-2">
              <IconRoom />Room Templates
            </h3>
            {["Living Room", "Admin Room", "Miscellaneous Room"].map((name) => (
              <DraggableRoomType key={name} typeName={name} />
            ))}
            <p className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded">
                Drag a template onto an active slot in the grid to create a new room.
            </p>
          </aside>

          <main className="flex-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            {renderedGrid}
          </main>
        </section>
      </div>

      {/* Edit Room Modal (Upgraded) */}
      {editSlot && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl transform transition-all duration-300 scale-100">
            <h3 className="mb-5 text-xl font-bold text-gray-800 border-b pb-2">
                Edit Room Details: <span className="text-indigo-600">{editData.room_number || "New Room"}</span>
            </h3>

            <label className="mb-4 block text-sm font-medium text-gray-700">
              Room Name
              <input
                className="mt-1 h-10 w-full rounded-lg border-gray-300 border px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150"
                value={editData.name}
                onChange={(event) => setEditData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label className="mb-4 block text-sm font-medium text-gray-700">
              Capacity
              <input
                type="number"
                min={1}
                className="mt-1 h-10 w-full rounded-lg border-gray-300 border px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150"
                value={editData.capacity}
                onChange={(event) =>
                  setEditData((prev) => ({
                    ...prev,
                    capacity: Math.max(1, parseInt(event.target.value, 10) || 1),
                  }))
                }
              />
            </label>

            <label className="mb-5 block text-sm font-medium text-gray-700">
              Room Number (Custom)
              <input
                className="mt-1 h-10 w-full rounded-lg border-gray-300 border px-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150 font-mono"
                placeholder={makeRoomNumber(floors, editSlot)} // Show auto-numbered value as a hint
                value={editData.room_number}
                onChange={(event) =>
                  setEditData((prev) => ({
                    ...prev,
                    room_number: event.target.value,
                    autoNumbered: false,
                  }))
                }
              />
              <p className="mt-1 text-xs text-gray-500">Leave blank to use the auto-generated room number.</p>
            </label>
            
            {/* Active/Inactive Toggle */}
            <div className="flex items-center mb-5">
                <input
                    id="inactive-toggle"
                    type="checkbox"
                    checked={editData.inactive}
                    onChange={(e) => setEditData((prev) => ({ ...prev, inactive: e.target.checked }))}
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="inactive-toggle" className="ml-2 block text-sm font-medium text-gray-700">
                    Mark as **Inactive** (Temporarily out of service)
                </label>
            </div>


            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition duration-150"
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-md hover:bg-indigo-700 transition duration-150"
                onClick={commitEditor}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </DndProvider>
  );
};

export default CreateRoom;