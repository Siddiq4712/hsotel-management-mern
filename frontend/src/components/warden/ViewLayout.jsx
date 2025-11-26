import React, { useEffect, useMemo, useState } from "react";
import { wardenAPI } from "../../services/api";

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

const parseSlot = (slot) => {
  const [floorIdx, rowIdx, colIdx] = slot.split("-").map((n) => parseInt(n, 10));
  return { floorIdx, rowIdx, colIdx };
};

const makeRoomNumber = (floors, slotId, colPad = 2) => {
  const { floorIdx, rowIdx, colIdx } = parseSlot(slotId);
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

const RoomCell = ({ data }) => {
  if (!data) return <div className="w-full h-full" />;
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center rounded border p-1 text-xs ${
        data.inactive
          ? "border-gray-400 bg-gray-200 text-gray-600"
          : "border-blue-400 bg-blue-100 text-blue-900"
      }`}
    >
      <strong>{data.name}</strong>
      <span>{data.room_number}</span>
      <span>Cap: {data.capacity}</span>
    </div>
  );
};

const ViewLayout = () => {
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(null);
  const [grid, setGrid] = useState([]);
  const [cellMap, setCellMap] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [layoutRes, typesRes, roomsRes] = await Promise.all([
          wardenAPI.getLayout(),
          wardenAPI.getRoomTypes(),
          wardenAPI.getRooms(),
        ]);

        const layoutData = layoutRes.data.data;
        if (!layoutData) {
          setLayout(null);
          setGrid([]);
          setCellMap({});
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

        const types = typesRes.data.data || [];
        const rooms = roomsRes.data.data || [];

        const mapping = {};
        rooms.forEach((room) => {
          if (!room.is_active) return;
          const slot = room.layout_slot || deriveSlotFromRoomNumber(room.room_number, layoutData.floors);
          if (!slot) return;

          const type = types.find((item) => item.id === room.room_type_id);
          mapping[slot] = {
            name: type?.name || room.room_number || "Room",
            room_number: room.room_number,
            capacity: type?.capacity || room.capacity || 1,
            inactive: !room.is_active,
          };
        });

        setCellMap(mapping);
      } catch (error) {
        console.error("Failed to load layout view:", error);
        setLayout(null);
        setCellMap({});
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const content = useMemo(() => {
    if (!layout) return null;
    return (
      <div className="relative">
        <EntranceLabel side={layout.entrance_side} />
        {Array.from({ length: layout.floors }).map((_, floorIdx) => (
          <div key={floorIdx} className="mb-8">
            <h3 className="mb-2 font-semibold">Floor {layout.floors - floorIdx}</h3>
            {grid.map((row, rowIdx) => (
              <div key={`${floorIdx}-${rowIdx}`} className="flex">
                {row.map((cell, colIdx) => {
                  const slot = `${floorIdx}-${rowIdx}-${colIdx}`;
                  return (
                    <div key={slot} style={{ width: 72, height: 72, margin: 3 }}>
                      {cell === "EMPTY" ? (
                        <div className="h-full w-full" />
                      ) : (
                        <RoomCell data={cellMap[slot]} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }, [layout, grid, cellMap]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-gray-500">
        Loading layout…
      </div>
    );
  }

  if (!layout) {
    return <div className="p-6 text-sm text-gray-500">No layout saved yet.</div>;
  }

  return (
    <div className="relative p-6">
      <h1 className="mb-6 text-2xl font-bold">Current Hostel Layout</h1>
      <div className="rounded border bg-white p-4 shadow-sm">{content}</div>
    </div>
  );
};

export default ViewLayout;
