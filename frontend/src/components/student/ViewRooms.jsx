import React, { useEffect, useMemo, useState, useCallback } from "react";
import { studentAPI } from "../../services/api";

// ---------- helpers ----------
const indexToLetters = (index) => {
  let n = index;
  let out = "";
  while (n >= 0) {
    out = String.fromCharCode((n % 26) + 65) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
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

const OccupantTooltip = ({ occupants }) => (
  <div className="absolute left-1/2 top-full z-20 hidden w-56 -translate-x-1/2 translate-y-2 rounded border bg-white p-2 text-left text-xs shadow-lg group-hover:block">
    <div className="mb-1 font-semibold text-gray-700">Current occupants</div>
    {occupants.length === 0 ? (
      <div className="text-gray-500">No one yet.</div>
    ) : (
      <ul className="space-y-1">
        {occupants.map((occ) => (
          <li key={occ.user_id} className="leading-snug">
            <div className="font-medium text-gray-800">{occ.name || occ.username}</div>
            <div className="text-gray-500">
              {occ.roll_number ? `Roll: ${occ.roll_number}` : "Roll number not available"}
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const RequestStatusBadge = ({ status }) => {
  if (!status) return null;
  const styles = {
    pending: "bg-amber-100 text-amber-700 border border-amber-300",
    approved: "bg-green-100 text-green-700 border border-green-300",
    rejected: "bg-red-100 text-red-700 border border-red-300",
    cancelled: "bg-gray-100 text-gray-500 border border-gray-300",
  };
  return (
    <span className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${styles[status] || ""}`}>
      Request {status}
    </span>
  );
};

// ---------- main component ----------
const ViewRooms = () => {
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
      await studentAPI.requestRoom({ room_id: room.room_id });
      await loadData();
      alert("Request submitted! You will receive an update once the warden reviews it.");
      setSelectedRoom(null);
    } catch (err) {
      console.error("Room request failed:", err);
      alert(err?.message || "Unable to request this room right now. Please try again.");
    } finally {
      setRequestingRoomId(null);
    }
  };

  const content = useMemo(() => {
    if (!layout) return null;
    return (
      <div className="relative">
        <EntranceLabel side={layout.entrance_side} />
        {Array.from({ length: layout.floors }).map((_, floorIdx) => (
          <div key={floorIdx} className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Floor {layout.floors - floorIdx}</h2>
            </div>

            {grid.map((row, rowIdx) => (
              <div key={`${floorIdx}-${rowIdx}`} className="flex">
                {row.map((cell, colIdx) => {
                  const slot = `${floorIdx}-${rowIdx}-${colIdx}`;
                  const data = cellMap[slot];
                  if (cell === "EMPTY") {
                    return <div key={slot} style={{ width: 76, height: 76, margin: 4 }} />;
                  }

                  const requestStatus = data && currentRequestForRoom(data.room_id)?.status;
                  const isFull = data && data.remaining <= 0;

                  return (
                    <div
                      key={slot}
                      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded border p-2 text-xs transition
                      ${data?.inactive ? "border-gray-400 bg-gray-200 text-gray-500 cursor-not-allowed" : isFull ? "border-amber-400 bg-amber-50 text-amber-700" : "border-blue-400 bg-blue-100 text-blue-900 hover:border-blue-500 hover:bg-blue-200"}
                      `}
                      style={{ width: 76, height: 76, margin: 4 }}
                      onClick={() => data && setSelectedRoom({ ...data, slot })}
                    >
                      {data ? (
                        <>
                          <div className="font-semibold leading-snug text-center">
                            {data.name}
                            <div className="text-[11px] font-normal text-blue-800/80">{data.room_number}</div>
                          </div>
                          <div className="mt-1 text-[11px]">
                            {data.occupancy}/{data.capacity} occupied
                          </div>
                          {isFull && <div className="mt-1 rounded bg-red-100 px-1 text-[10px] font-medium text-red-600">Full</div>}
                          <RequestStatusBadge status={requestStatus} />
                          <OccupantTooltip occupants={data.occupants} />
                        </>
                      ) : (
                        <div className="text-gray-500">Not assigned</div>
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
  }, [layout, grid, cellMap, currentRequestForRoom]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-gray-500">
        Loading rooms…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
        {error}
        <div>
          <button
            type="button"
            onClick={loadData}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-white shadow hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!layout) {
    return <div className="p-6 text-sm text-gray-500">No layout has been published yet.</div>;
  }

  return (
    <div className="relative space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Rooms & Book a Bed</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tap a room to view occupants and send a booking request. Your request goes to the warden for approval.
        </p>
      </div>

      <div className="rounded border bg-white p-4 shadow-sm">{content}</div>

      {selectedRoom && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold">{selectedRoom.name}</h3>
                <p className="text-sm text-gray-500">Room number: {selectedRoom.room_number}</p>
                {selectedRoom.description && (
                  <p className="mt-1 text-sm text-gray-600">{selectedRoom.description}</p>
                )}
              </div>
              <button
                type="button"
                className="text-gray-400 transition hover:text-gray-600"
                onClick={() => setSelectedRoom(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="text-gray-500">Capacity</div>
                <div className="text-lg font-semibold text-gray-800">{selectedRoom.capacity}</div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="text-gray-500">Currently occupied</div>
                <div className="text-lg font-semibold text-gray-800">
                  {selectedRoom.occupancy}/{selectedRoom.capacity}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700">Occupants</h4>
              <div className="mt-2 max-h-40 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                {selectedRoom.occupants.length === 0 ? (
                  <div className="text-gray-500">No one has been allotted yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {selectedRoom.occupants.map((occ) => (
                      <li key={occ.user_id} className="rounded border border-gray-200 bg-white p-2 shadow-sm">
                        <div className="font-medium text-gray-800">{occ.name || occ.username}</div>
                        <div className="text-xs text-gray-500">
                          {occ.roll_number ? `Roll: ${occ.roll_number}` : "Roll number not available"}
                        </div>
                        {occ.email && <div className="text-xs text-gray-500">Email: {occ.email}</div>}
                        {occ.phone && <div className="text-xs text-gray-500">Phone: {occ.phone}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setSelectedRoom(null)}
              >
                Close
              </button>

              <button
                type="button"
                disabled={
                  selectedRoom.inactive ||
                  selectedRoom.remaining <= 0 ||
                  Boolean(currentRequestForRoom(selectedRoom.room_id)) ||
                  requestingRoomId === selectedRoom.room_id
                }
                onClick={() => handleRequestRoom(selectedRoom)}
                className={`rounded px-4 py-2 text-sm font-medium text-white shadow transition ${
                  selectedRoom.inactive
                    ? "cursor-not-allowed bg-gray-400"
                    : selectedRoom.remaining <= 0
                    ? "cursor-not-allowed bg-amber-500"
                    : currentRequestForRoom(selectedRoom.room_id)
                    ? "cursor-not-allowed bg-blue-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {selectedRoom.inactive
                  ? "Unavailable"
                  : selectedRoom.remaining <= 0
                  ? "Room full"
                  : requestingRoomId === selectedRoom.room_id
                  ? "Sending…"
                  : currentRequestForRoom(selectedRoom.room_id)
                  ? `Request ${currentRequestForRoom(selectedRoom.room_id).status}`
                  : "Request this room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewRooms;
