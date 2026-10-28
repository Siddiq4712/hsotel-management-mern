import * as models from '../models/index.js';
import { deleteSelectedRooms, prepareBulkRooms, resolveRoomHostel, saveBulkRooms } from '../services/bulkRooms.js';

function handler(isAdmin, save) {
  return async (req, res) => {
    try {
      const hostelId = resolveRoomHostel(req.body, req.user, isAdmin);
      const data = save
        ? await saveBulkRooms(req.body, hostelId, models)
        : await prepareBulkRooms(req.body, hostelId, models);
      res.status(save ? 201 : 200).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}

export const previewAdminRooms = handler(true, false);
export const createAdminRooms = handler(true, true);
export const previewWardenRooms = handler(false, false);
export const createWardenRooms = handler(false, true);

function deleteHandler(isAdmin) {
  return async (req, res) => {
    try {
      const hostelId = resolveRoomHostel(req.body, req.user, isAdmin);
      const data = await deleteSelectedRooms(req.body, hostelId, models);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
export const deleteAdminRooms = deleteHandler(true);
export const deleteWardenRooms = deleteHandler(false);
