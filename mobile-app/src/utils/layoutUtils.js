// mobile-app/src/utils/layoutUtils.js

// Helper function to convert 0-indexed column/row to letter/number
export const indexToLetters = (index) => {
  let n = index;
  let out = "";
  while (n >= 0) {
    out = String.fromCharCode((n % 26) + 65) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
};

export const lettersToIndex = (value) =>
  value
    .toUpperCase()
    .split("")
    .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;

export const parseSlot = (slot) => {
  const [floorIdx, rowIdx, colIdx] = slot.split("-").map((n) => parseInt(n, 10));
  return { floorIdx, rowIdx, colIdx };
};

export const deriveSlotFromRoomNumber = (roomNumber, floors) => {
  if (!roomNumber || typeof roomNumber !== 'string' || !roomNumber.includes("-")) return null;
  const [floorPart, gridPart] = roomNumber.split("-");
  const floorNumber = parseInt(floorPart, 10);
  if (Number.isNaN(floorNumber)) return null;

  const rowLetters = gridPart.match(/^[A-Z]+/i)?.[0];
  const colPart = gridPart.slice(rowLetters ? rowLetters.length : 0);
  const colNumber = parseInt(colPart, 10);

  if (!rowLetters || Number.isNaN(colNumber)) return null;

  const floorIdx = floors - floorNumber; // Assuming floor numbers are 1-based, highest floor = floor 0 idx
  const rowIdx = lettersToIndex(rowLetters);
  const colIdx = colNumber - 1;
  if ([floorIdx, rowIdx, colIdx].some((n) => n < 0)) return null;
  return `${floorIdx}-${rowIdx}-${colIdx}`;
};

export const generateGridShape = ({
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
