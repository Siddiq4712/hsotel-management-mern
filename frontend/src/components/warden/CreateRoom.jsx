import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDrag, useDrop } from "react-dnd";
import { wardenAPI } from "../../services/api";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/* ---------- helpers ---------- */
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

/* ---------- drag/drop ---------- */
const DraggableRoomType = ({ typeName }) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "roomType",
    item: { kind: "template", typeName },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={dragRef}
      className={`p-2 border rounded mb-1 bg-white cursor-pointer shadow transition-opacity ${
        isDragging ? "opacity-40" : ""
      }`}
    >
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

  if (!active) return <div className="w-full h-full" />;

  return (
    <div
      ref={refCallback}
      onClick={() => data && onClickEdit(slotId, data)}
      className={`border rounded flex flex-col items-center justify-center text-xs p-1 select-none 
        ${data ? (data.inactive ? "bg-gray-200 border-gray-400 text-gray-600" : "bg-blue-100 border-blue-400 text-blue-900") : "border-dashed border-gray-300 bg-gray-50 text-gray-500"} 
        ${isDragging ? "opacity-50" : ""} ${isOver ? "ring-2 ring-green-400" : ""}`}
      style={{ width: "100%", height: "100%" }}
    >
      {data ? (
        <>
          <strong className="text-xs text-center">{data.name}</strong>
          <span className="text-[11px]">Room#: {data.room_number || "—"}</span>
          <span className="text-[11px]">Cap: {data.capacity}</span>
          {data.inactive && <span className="text-[11px] font-semibold text-red-600">(Inactive)</span>}
        </>
      ) : (
        "Drop here"
      )}
    </div>
  );
};

const EntranceLabel = ({ side }) => {
  if (!side) return null;
  const label = <span className="font-bold text-xs text-red-600">ENTRANCE</span>;
  if (side === "t") return <div className="text-center mb-1">{label}</div>;
  if (side === "b") return <div className="text-center mt-1">{label}</div>;
  if (side === "l")
    return (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
        <div className="rotate-90">{label}</div>
      </div>
    );
  if (side === "r")
    return (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
        <div className="-rotate-90">{label}</div>
      </div>
    );
  return null;
};

/* ---------- main component ---------- */
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
      <div className="relative">
        <EntranceLabel side={entranceSide} />
        {Array.from({ length: floors }).map((_, floorIdx) => (
          <div key={floorIdx} className="mb-8">
            <h3 className="mb-2 text-base font-semibold">Floor {floors - floorIdx}</h3>
            {gridShape.map((row, rowIdx) => (
              <div key={`${floorIdx}-${rowIdx}`} className="flex">
                {row.map((cell, colIdx) => {
                  const slotId = `${floorIdx}-${rowIdx}-${colIdx}`;
                  const active = cell !== "EMPTY";
                  const data = cellData[slotId];
                  return (
                    <div key={slotId} style={{ width: 72, height: 72, margin: 3 }}>
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
      <div className="p-6 space-y-8">
        <h1 className="text-2xl font-bold">Hostel Layout Creator</h1>

        {/* configuration */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded border bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-semibold">Building Type</label>
            <select
              value={buildingType}
              onChange={(event) => setBuildingType(event.target.value)}
              className="h-10 w-full rounded border px-3"
            >
              <option value="single">Straight (Single Side)</option>
              <option value="l">L-Shaped</option>
              <option value="u">U-Shaped</option>
              <option value="square">Square (4-sided)</option>
            </select>
          </div>

          <div className="rounded border bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-semibold">Entrance Side</label>
            <select
              value={entranceSide}
              onChange={(event) => setEntranceSide(event.target.value)}
              className="h-10 w-full rounded border px-3"
            >
              <option value="t">Top</option>
              <option value="b">Bottom</option>
              <option value="l">Left</option>
              <option value="r">Right</option>
            </select>
          </div>

          <div className="rounded border bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-semibold">Floors</label>
            <input
              type="number"
              min={1}
              value={floors}
              onChange={(event) => setFloors(Math.max(1, parseInt(event.target.value, 10) || 1))}
              className="h-10 w-full rounded border px-3"
            />
          </div>
        </section>

        {/* rooms per side / orientation */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
              Rooms per side
            </h2>
            {[
              { label: "Top", setter: setTopRooms, value: topRooms },
              { label: "Bottom", setter: setBottomRooms, value: bottomRooms },
              { label: "Left", setter: setLeftRooms, value: leftRooms },
              { label: "Right", setter: setRightRooms, value: rightRooms },
            ].map(({ label, setter, value }) => (
              <label key={label} className="mb-2 block text-sm">
                {label}
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(event) => setter(Math.max(0, parseInt(event.target.value, 10) || 0))}
                  className="mt-1 h-9 w-full rounded border px-3 text-sm"
                />
              </label>
            ))}
          </div>

          <div className="rounded border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
              Orientation
            </h2>

            {buildingType === "l" && (
              <label className="block text-sm">
                L shape
                <select
                  value={lOrientation}
                  onChange={(event) => setLOrientation(event.target.value)}
                  className="mt-1 h-9 w-full rounded border px-3 text-sm"
                >
                  <option value="tl">Top-Left</option>
                  <option value="tr">Top-Right</option>
                  <option value="bl">Bottom-Left</option>
                  <option value="br">Bottom-Right</option>
                </select>
              </label>
            )}

            {buildingType === "u" && (
              <label className="block text-sm">
                U opening
                <select
                  value={uOpenSide}
                  onChange={(event) => setUOpenSide(event.target.value)}
                  className="mt-1 h-9 w-full rounded border px-3 text-sm"
                >
                  <option value="t">Open top</option>
                  <option value="b">Open bottom</option>
                  <option value="l">Open left</option>
                  <option value="r">Open right</option>
                </select>
              </label>
            )}
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadLayoutFromDB}
            className="rounded bg-purple-600 px-4 py-2 text-white shadow-sm hover:bg-purple-700"
          >
            Edit existing layout
          </button>
          <button
            type="button"
            onClick={saveLayoutToDB}
            className="rounded bg-green-600 px-4 py-2 text-white shadow-sm hover:bg-green-700"
          >
            Save layout
          </button>
        </div>

        <section className="flex gap-6">
          <aside className="w-60 rounded border bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
              Room templates
            </h3>
            {["Living Room", "Admin Room", "Miscellaneous Room"].map((name) => (
              <DraggableRoomType key={name} typeName={name} />
            ))}
          </aside>

          <main className="flex-1 overflow-auto rounded border bg-white p-4 shadow-sm">
            {renderedGrid}
          </main>
        </section>
      </div>

      {editSlot && editData && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur">
          <div className="w-96 rounded bg-white p-5 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Edit room</h3>

            <label className="mb-3 block text-sm">
              Name
              <input
                className="mt-1 h-9 w-full rounded border px-3 text-sm"
                value={editData.name}
                onChange={(event) => setEditData((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label className="mb-3 block text-sm">
              Capacity
              <input
                type="number"
                min={1}
                className="mt-1 h-9 w-full rounded border px-3 text-sm"
                value={editData.capacity}
                onChange={(event) =>
                  setEditData((prev) => ({
                    ...prev,
                    capacity: Math.max(1, parseInt(event.target.value, 10) || 1),
                  }))
                }
              />
            </label>

            <label className="mb-4 block text-sm">
              Room number
              <input
                className="mt-1 h-9 w-full rounded border px-3 text-sm"
                value={editData.room_number}
                onChange={(event) =>
                  setEditData((prev) => ({
                    ...prev,
                    room_number: event.target.value,
                    autoNumbered: false,
                  }))
                }
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-4 py-2 text-sm"
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
                onClick={commitEditor}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DndProvider>
  );
};

export default CreateRoom;
