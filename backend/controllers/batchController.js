import sequelize from '../config/database.js';
import { Session, Hostel, Enrollment } from '../models/index.js';
import { listBatches, validateBatch, lockBatchConfiguration, allocationPreview, applyAllocations } from '../services/batchAllocation.js';

export async function getBatches(req, res) {
  try { res.json({ success: true, data: await listBatches() }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
}

export async function saveBatch(req, res) {
  try {
    const batch = await sequelize.transaction(async transaction => {
      const hostels = await lockBatchConfiguration(transaction);
      const existing = req.params.id ? await Session.findByPk(req.params.id, { transaction }) : null;
      if (req.params.id && !existing) throw new Error('Batch not found.');
      const payload = validateBatch(req.body, await Session.findAll({ transaction }), existing?.id);
      if (existing && !payload.is_active && await Enrollment.count({ where: { session_id: existing.id, status: 'active' }, transaction })) throw new Error('This batch has active students and cannot be archived.');
      if (!hostels.some(hostel => hostel.id === payload.hostel_id && hostel.is_active)) throw new Error('Select an active hostel.');
      return existing ? existing.update(payload, { transaction }) : Session.create(payload, { transaction });
    });
    res.status(req.params.id ? 200 : 201).json({ success: true, data: batch, message: 'Batch saved. Review allocation to update existing students.' });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
}

export async function archiveBatch(req, res) {
  try {
    await sequelize.transaction(async transaction => {
      await lockBatchConfiguration(transaction);
      const batch = await Session.findByPk(req.params.id, { transaction });
      if (!batch) throw new Error('Batch not found.');
      if (await Enrollment.count({ where: { session_id: batch.id, status: 'active' }, transaction })) throw new Error('This batch has active students. Move or deactivate those enrollments before archiving it.');
      await batch.update({ is_active: false }, { transaction });
    });
    res.json({ success: true, message: 'Batch archived.' });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
}

export async function previewAllocation(req, res) {
  try { res.json({ success: true, data: await allocationPreview() }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
}
export async function applyAllocation(req, res) {
  try {
    if (!Array.isArray(req.body.student_ids)) throw new Error('Student IDs are required.');
    const count = await applyAllocations(req.body.student_ids, req.body.token);
    res.json({ success: true, message: `Updated ${count} students. Historical bills were preserved.` });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
}

export async function assignHostelBatches(req, res) {
  try {
    await sequelize.transaction(async transaction => {
      const hostels = await lockBatchConfiguration(transaction);
      const hostelId = Number(req.params.id);
      if (!hostels.some(hostel => hostel.id === hostelId && hostel.is_active)) throw new Error('Choose an active hostel.');
      if (!Array.isArray(req.body.batch_ids)) throw new Error('Select batches to assign.');
      const ids = [...new Set(req.body.batch_ids.map(Number))];
      const batches = await Session.findAll({ transaction });
      for (const id of ids) {
        const batch = batches.find(item => item.id === id && item.is_active);
        if (!batch?.erp_batch_year) throw new Error('Configure the admission year for every selected batch first.');
        if (batch.hostel_id && batch.hostel_id !== hostelId) throw new Error(`Batch ${batch.name} is already assigned to another hostel.`);
      }
      // This is additive. Moving an assigned batch requires editing that batch and reviewing allocation.
      for (const id of ids) await Session.update({ hostel_id: hostelId }, { where: { id }, transaction });
    });
    res.json({ success: true, message: 'Batches assigned. Review allocation to update existing students.' });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
}
