import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { listInventories, saveInventory, deleteInventory } from '../controllers/inventoryController.js';

const router = express.Router();
router.use(auth);
router.get('/', authorize(['admin', 'mess', 'warden']), listInventories);
router.post('/', authorize(['admin']), saveInventory);
router.put('/:id', authorize(['admin']), saveInventory);
router.delete('/:id', authorize(['admin']), deleteInventory);
export default router;
