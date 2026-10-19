import bcrypt from 'bcryptjs';
import { Op, fn, col, literal } from 'sequelize';
import sequelize from '../config/database.js';
import {
  User, Role, Hostel, RoomType, HostelRoom, Session, Attendance,
  HostelFacilityType, HostelFacility, HostelFacilityRegister, HostelMaintenance,
  IncomeType, ExpenseType, UOM, Supplier, PurchaseOrder, SupplierBill, DayReductionRequest,
  Fee,
  AdditionalIncome,
  MessDailyExpense,
  OtherExpense,
  ParentStudent,
  Outpass
} from '../models/index.js'; 
import moment from 'moment';

const resolveRoleRecord = async ({ roleId, role }) => {
  if (roleId) {
    return Role.findByPk(roleId);
  }

  if (!role) return null;

  const normalizedRole = String(role).trim().toLowerCase();
  const roleAlias = {
    admin: 'admin',
    administrator: 'admin',
    warden: 'warden',
    student: 'student',
    mess: 'mess',
    'mess staff': 'mess',
    messstaff: 'mess',
    lapc: 'student'
  };

  const roleKey = roleAlias[normalizedRole] || normalizedRole;

  return Role.findOne({
    where: sequelize.where(fn('LOWER', col('roleName')), roleKey)
  });
};

const normalizeRoleName = (name) => String(name || '').trim();

// HOSTEL MANAGEMENT
const hostelFields = (body, partial = false) => {
  const values = {};
  const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!partial || Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 255) invalid('Enter a hostel name of 1–255 characters.');
    values.name = body.name.trim();
  }
  if (!partial || Object.hasOwn(body, 'capacity')) {
    if (!Number.isInteger(Number(body.capacity)) || Number(body.capacity) < 1 || Number(body.capacity) > 2147483647) invalid('Capacity must be a whole number between 1 and 2147483647.');
    values.capacity = Number(body.capacity);
  }
  for (const key of ['address', 'contact_number', 'email']) {
    if (Object.hasOwn(body, key)) values[key] = String(body[key] ?? '').trim() || null;
    if (key !== 'address' && values[key]?.length > 255) invalid(`${key === 'email' ? 'Email' : 'Contact number'} cannot exceed 255 characters.`);
  }
  if (Object.hasOwn(body, 'is_active')) {
    if (typeof body.is_active !== 'boolean') invalid('Hostel status must be active or inactive.');
    values.is_active = body.is_active;
  }
  if (!Object.keys(values).length) invalid('Enter hostel details to update.');
  return values;
};
const hostelFailure = (res, error) => {
  if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'A hostel with this name already exists.' });
  if (error.name === 'SequelizeValidationError') return res.status(400).json({ success: false, message: error.errors.map(item => item.message).join(' ') });
  return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Unable to complete the hostel operation. Please try again.' });
};
const hostelId = value => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw Object.assign(new Error('Choose a valid hostel.'), { status: 400 });
  return id;
};

export const createHostel = async (req, res) => {
  try {
    const values = hostelFields(req.body);
    if (await Hostel.findOne({ where: { name: values.name } })) return res.status(409).json({ success: false, message: 'A hostel with this name already exists.' });
    const hostel = await Hostel.create(values);
    return res.status(201).json({ success: true, data: hostel, message: 'Hostel created successfully' });
  } catch (error) { return hostelFailure(res, error); }
};

export const getHostels = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const where = req.query.include_inactive === 'true' ? {} : { is_active: true };
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { address: { [Op.like]: `%${search}%` } }];
    const hostels = await Hostel.findAll({ where, include: [{ model: HostelRoom, include: [{ model: RoomType }] }], order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    const batches = await Session.findAll({ where: { is_active: true }, attributes: ['id', 'name', 'hostel_id', 'roll_prefix'] });
    return res.json({ success: true, data: hostels.map(hostel => ({ ...hostel.toJSON(), batches: batches.filter(batch => batch.hostel_id === hostel.id) })) });
  } catch (error) { return hostelFailure(res, error); }
};

export const getHostelById = async (req, res) => {
  try {
    const hostel = await Hostel.findByPk(hostelId(req.params.id), { include: [{ model: HostelRoom, include: [{ model: RoomType }] }] });
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found' });
    return res.json({ success: true, data: hostel });
  } catch (error) { return hostelFailure(res, error); }
};

export const updateHostel = async (req, res) => {
  try {
    const id = hostelId(req.params.id);
    const values = hostelFields(req.body, true);
    const hostel = await Hostel.findByPk(id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found' });
    if (values.name && await Hostel.findOne({ where: { name: values.name, id: { [Op.ne]: id } } })) return res.status(409).json({ success: false, message: 'A hostel with this name already exists.' });
    if (values.capacity !== undefined) {
      const occupied = Number(await HostelRoom.sum('occupancy_count', { where: { hostel_id: id } }) || 0);
      if (values.capacity < occupied) return res.status(400).json({ success: false, message: `Capacity cannot be below the ${occupied} currently occupied beds.` });
    }
    await hostel.update(values);
    return res.json({ success: true, data: hostel, message: 'Hostel updated successfully' });
  } catch (error) { return hostelFailure(res, error); }
};

export const deleteHostel = async (req, res) => {
  try {
    const id = hostelId(req.params.id);
    const deactivated = await sequelize.transaction(async transaction => {
      const hostel = await Hostel.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!hostel) throw Object.assign(new Error('Hostel not found'), { status: 404 });
      // Preserve every linked record, including inventory assignments and
      // financial history, even when the hostel has no rooms or current users.
      for (const model of Object.values(sequelize.models)) {
        if (!model.rawAttributes?.hostel_id) continue;
        if (await model.count({ where: { hostel_id: id }, transaction })) {
          await hostel.update({ is_active: false }, { transaction });
          return true;
        }
      }
      await hostel.destroy({ transaction });
      return false;
    });
    return res.json({ success: true, deactivated, message: deactivated ? 'Hostel deactivated; its linked records and history are preserved.' : 'Hostel deleted successfully.' });
  } catch (error) { return hostelFailure(res, error); }
};

// USER MANAGEMENT
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      where: { status: 'Active' },
      attributes: ['roleId', 'roleName', 'status'],
      order: [['roleName', 'ASC']]
    });

    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Roles fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createRole = async (req, res) => {
  try {
    const roleName = normalizeRoleName(req.body?.roleName || req.body?.name || req.body?.role);
    if (!roleName) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required'
      });
    }

    const existingRole = await Role.findOne({
      where: sequelize.where(fn('LOWER', col('roleName')), roleName.toLowerCase())
    });

    if (existingRole) {
      const updatedBy = req.user?.userId || null;

      if (existingRole.status === 'Inactive') {
        await existingRole.update({ status: 'Active', updatedBy });
        return res.status(200).json({
          success: true,
          data: existingRole,
          message: 'Role reactivated successfully'
        });
      }

      return res.status(200).json({
        success: true,
        data: existingRole,
        message: 'Role already exists'
      });
    }

    const createdBy = req.user?.userId || null;
    const role = await Role.create({
      roleName,
      status: 'Active',
      createdBy,
      updatedBy: createdBy
    });

    res.status(201).json({
      success: true,
      data: role,
      message: 'Role created successfully'
    });
  } catch (error) {
    console.error('Role creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, email, password, roleId, role, hostel_id, studentRollNumbers } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ userName: username }, { userMail: email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const roleData = await resolveRoleRecord({ roleId, role });
    if (!roleData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selection'
      });
    }

    const roleNameLower = roleData.roleName?.toLowerCase() || '';
    if (['student', 'lapc'].includes(roleNameLower)) return res.status(400).json({ success: false, message: 'Use Student Admission to create students with automatic batch and hostel allocation.' });
    const isHostelRequired = ['warden', 'student', 'mess'].includes(roleNameLower);
    if (isHostelRequired && !hostel_id) {
      return res.status(400).json({
        success: false,
        message: 'Hostel selection is required for this role'
      });
    }

    const user = await User.create({
      userName: username,
      userMail: email,
      password: hashedPassword,
      roleId: roleData.roleId,
      hostel_id: isHostelRequired ? parseInt(hostel_id, 10) : null,
      status: 'Active'
    });

    if (roleNameLower === 'parent' && studentRollNumbers) {
      const rollNumbers = String(studentRollNumbers)
        .split(',')
        .map(r => r.trim())
        .filter(Boolean);

      const students = await User.findAll({
        where: { roll_number: { [Op.in]: rollNumbers } }
      });

      for (const student of students) {
        await ParentStudent.create({
          parent_id: user.userId,
          student_id: student.userId
        });
      }
    }

    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { role, hostel_id, search } = req.query;

    let whereClause = { status: 'Active' };

    if (hostel_id && hostel_id !== 'all') {
      whereClause.hostel_id = hostel_id;
    }

    if (search) {
      whereClause[Op.or] = [
        { userName: { [Op.iLike]: `%${search}%` } },
        { userMail: { [Op.iLike]: `%${search}%` } }
      ];
    }

    let roleInclude = { model: Role, as: 'role' };
    if (role && role !== 'all') {
      roleInclude.where = sequelize.where(fn('LOWER', col('role.roleName')), String(role).trim().toLowerCase());
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        roleInclude,
        {
          model: Hostel,
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: ParentStudent,
          as: 'ParentLinks',
          required: false,
          include: [{ model: User, as: 'Student', attributes: ['roll_number', 'userName'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params; // userId from params
    const { username, email, roleId, role, hostel_id, password, studentRollNumbers } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const roleData = await resolveRoleRecord({ roleId, role });
    if (!roleData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selection'
      });
    }

    const roleNameLower = roleData.roleName?.toLowerCase() || '';
    const currentRole = await Role.findByPk(user.roleId);
    const currentIsStudent = ['student', 'lapc'].includes(currentRole?.roleName?.toLowerCase());
    const targetIsStudent = ['student', 'lapc'].includes(roleNameLower);
    if (currentIsStudent !== targetIsStudent) return res.status(400).json({ success: false, message: 'Use Student Admission to change student enrollment. Student roles cannot be changed in user management.' });
    if (targetIsStudent && Number(hostel_id) !== Number(user.hostel_id)) return res.status(400).json({ success: false, message: 'Student hostel follows their batch. Change it in Manage Batches and review allocation.' });
    const isHostelRequired = ['warden', 'student', 'lapc', 'mess'].includes(roleNameLower);
    if (isHostelRequired && !hostel_id) {
      return res.status(400).json({
        success: false,
        message: 'Hostel selection is required for this role'
      });
    }

    const updateData = {
      userName: username,
      userMail: email,
      roleId: roleData.roleId,
      hostel_id: isHostelRequired ? parseInt(hostel_id, 10) : null
    };

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    await user.update(updateData);

    if (roleNameLower === 'parent' && studentRollNumbers !== undefined) {
      // Clear existing links
      await ParentStudent.destroy({ where: { parent_id: user.userId } });

      const rollNumbers = String(studentRollNumbers)
        .split(',')
        .map(r => r.trim())
        .filter(Boolean);

      const students = await User.findAll({
        where: { roll_number: { [Op.in]: rollNumbers } }
      });

      for (const student of students) {
        await ParentStudent.create({
          parent_id: user.userId,
          student_id: student.userId
        });
      }
    }

    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    res.json({
      success: true,
      data: userResponse,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({ status: 'Inactive' });

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ROOM TYPE MANAGEMENT
export const createRoomType = async (req, res) => {
  try {
    const { name, capacity, description, hostel_id } = req.body;

    if (!name || !capacity || !hostel_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, capacity, and hostel selection are required'
      });
    }

    const roomType = await RoomType.create({ name, capacity, description, hostel_id });

    res.status(201).json({
      success: true,
      data: roomType,
      message: 'Room type created successfully'
    });
  } catch (error) {
    console.error('Room type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getRoomTypes = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = {};
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }
    const roomTypes = await RoomType.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: roomTypes });
  } catch (error) {
    console.error('Room types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateRoomType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity, description, hostel_id } = req.body;

    const roomType = await RoomType.findByPk(id);
    if (!roomType) {
      return res.status(404).json({ success: false, message: 'Room type not found' });
    }

    await roomType.update({ name, capacity, description, hostel_id });

    res.json({ success: true, data: roomType, message: 'Room type updated successfully' });
  } catch (error) {
    console.error('Room type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteRoomType = async (req, res) => {
  try {
    const { id } = req.params;
    const roomType = await RoomType.findByPk(id);
    if (!roomType) {
      return res.status(404).json({ success: false, message: 'Room type not found' });
    }

    const roomsCount = await HostelRoom.count({ where: { room_type_id: id } });
    if (roomsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room type. It is being used by existing rooms.'
      });
    }

    await roomType.destroy();
    res.json({ success: true, message: 'Room type deleted successfully' });
  } catch (error) {
    console.error('Room type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ROOM MANAGEMENT
export const createRoom = async (req, res) => {
  try {
    const { hostel_id, room_type_id, room_number, floor } = req.body;

    if (!hostel_id || !room_type_id || !room_number) {
      return res.status(400).json({ success: false, message: 'Hostel, room type, and room number are required' });
    }

    const existingRoom = await HostelRoom.findOne({ where: { hostel_id, room_number } });
    if (existingRoom) {
      return res.status(400).json({ success: false, message: 'Room number already exists in this hostel' });
    }

    const room = await HostelRoom.create({ hostel_id, room_type_id, room_number, floor });

    const roomWithDetails = await HostelRoom.findByPk(room.id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: RoomType, attributes: ['id', 'name', 'capacity'] }
      ]
    });

    res.status(201).json({ success: true, data: roomWithDetails, message: 'Room created successfully' });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRooms = async (req, res) => {
  try {
    const { hostel_id, room_type_id, search, is_occupied } = req.query;
    let whereClause = { is_active: true };

    if (hostel_id && hostel_id !== 'all') whereClause.hostel_id = hostel_id;
    if (room_type_id && room_type_id !== 'all') whereClause.room_type_id = room_type_id;
    if (is_occupied !== undefined && is_occupied !== 'all') whereClause.is_occupied = is_occupied === 'true';
    if (search) whereClause.room_number = { [Op.iLike]: `%${search}%` };

    const rooms = await HostelRoom.findAll({
      where: whereClause,
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: RoomType, attributes: ['id', 'name', 'capacity'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Rooms fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { hostel_id, room_type_id, room_number, floor } = req.body;

    const room = await HostelRoom.findByPk(id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    await room.update({ hostel_id, room_type_id, room_number, floor });

    const updatedRoom = await HostelRoom.findByPk(id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: RoomType, attributes: ['id', 'name', 'capacity'] }
      ]
    });

    res.json({ success: true, data: updatedRoom, message: 'Room updated successfully' });
  } catch (error) {
    console.error('Room update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await HostelRoom.findByPk(id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.is_occupied) return res.status(400).json({ success: false, message: 'Cannot delete occupied room' });

    await room.update({ is_active: false });
    res.json({ success: true, message: 'Room deactivated successfully' });
  } catch (error) {
    console.error('Room deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Academic batch routes retain their existing /sessions API names.
export { saveBatch as createSession, getBatches as getSessions, saveBatch as updateSession, archiveBatch as deleteSession } from './batchController.js';

// FACILITY TYPE MANAGEMENT
export const createFacilityType = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const facilityType = await HostelFacilityType.create({ name, description });
    res.status(201).json({ success: true, data: facilityType, message: 'Facility type created successfully' });
  } catch (error) {
    console.error('Facility type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getFacilityTypes = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = { is_active: true };
    if (search) whereClause.name = { [Op.iLike]: `%${search}%` };
    const facilityTypes = await HostelFacilityType.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: facilityTypes });
  } catch (error) {
    console.error('Facility types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateFacilityType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const facilityType = await HostelFacilityType.findByPk(id);
    if (!facilityType) return res.status(404).json({ success: false, message: 'Facility type not found' });
    await facilityType.update({ name, description });
    res.json({ success: true, data: facilityType, message: 'Facility type updated successfully' });
  } catch (error) {
    console.error('Facility type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteFacilityType = async (req, res) => {
  try {
    const { id } = req.params;
    const facilityType = await HostelFacilityType.findByPk(id);
    if (!facilityType) return res.status(404).json({ success: false, message: 'Facility type not found' });

    const facilitiesCount = await HostelFacility.count({ where: { facility_type_id: id } });
    if (facilitiesCount > 0) {
      await facilityType.update({ is_active: false });
      res.json({ success: true, message: 'Facility type deactivated successfully' });
    } else {
      await facilityType.destroy();
      res.json({ success: true, message: 'Facility type deleted successfully' });
    }
  } catch (error) {
    console.error('Facility type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// FACILITY MANAGEMENT
export const createFacility = async (req, res) => {
  try {
    const { hostel_id, facility_type_id, name, capacity, cost_per_use } = req.body;
    if (!hostel_id || !facility_type_id || !name) {
      return res.status(400).json({ success: false, message: 'Hostel, facility type, and name are required' });
    }
    const facility = await HostelFacility.create({ hostel_id, facility_type_id, name, capacity, cost_per_use: cost_per_use || 0.00 });
    const facilityWithDetails = await HostelFacility.findByPk(facility.id, {
      include: [{ model: Hostel, attributes: ['id', 'name'] }, { model: HostelFacilityType, attributes: ['id', 'name'] }]
    });
    res.status(201).json({ success: true, data: facilityWithDetails, message: 'Facility created successfully' });
  } catch (error) {
    console.error('Facility creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getFacilities = async (req, res) => {
  try {
    const { hostel_id, facility_type_id, search, status } = req.query;
    let whereClause = {};
    if (hostel_id && hostel_id !== 'all') whereClause.hostel_id = hostel_id;
    if (facility_type_id && facility_type_id !== 'all') whereClause.facility_type_id = facility_type_id;
    if (status && status !== 'all') whereClause.status = status;
    if (search) whereClause.name = { [Op.iLike]: `%${search}%` };

    const facilities = await HostelFacility.findAll({
      where: whereClause,
      include: [{ model: Hostel, attributes: ['id', 'name'] }, { model: HostelFacilityType, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: facilities });
  } catch (error) {
    console.error('Facilities fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const { hostel_id, facility_type_id, name, capacity, cost_per_use, status } = req.body;
    const facility = await HostelFacility.findByPk(id);
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });

    await facility.update({ hostel_id, facility_type_id, name, capacity, cost_per_use, status });
    const updatedFacility = await HostelFacility.findByPk(id, {
      include: [{ model: Hostel, attributes: ['id', 'name'] }, { model: HostelFacilityType, attributes: ['id', 'name'] }]
    });
    res.json({ success: true, data: updatedFacility, message: 'Facility updated successfully' });
  } catch (error) {
    console.error('Facility update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const facility = await HostelFacility.findByPk(id);
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });

    let usageCount = 0;
    try {
      usageCount = await HostelFacilityRegister.count({ where: { facility_id: id } });
    } catch (e) {}

    if (usageCount > 0) {
      await facility.update({ status: 'inactive' });
      res.json({ success: true, message: 'Facility deactivated successfully' });
    } else {
      await facility.destroy();
      res.json({ success: true, message: 'Facility deleted successfully' });
    }
  } catch (error) {
    console.error('Facility deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// MAINTENANCE MANAGEMENT
export const createMaintenance = async (req, res) => {
  try {
    const { hostel_id, room_id, facility_id, issue_type, description, priority } = req.body;

    if (!hostel_id || !issue_type || !description) {
      return res.status(400).json({ success: false, message: 'Hostel, issue type, and description are required' });
    }

    const hostelExists = await Hostel.findByPk(hostel_id);
    if (!hostelExists) return res.status(400).json({ success: false, message: 'Selected hostel does not exist' });

    const maintenanceData = {
      hostel_id,
      room_id: room_id || null,
      facility_id: facility_id || null,
      issue_type,
      description,
      priority: priority || 'medium',
      reported_by: req.user ? req.user.userId : 1, // Changed to userId
      status: 'reported'
    };

    const maintenance = await HostelMaintenance.create(maintenanceData);
    const maintenanceWithDetails = await HostelMaintenance.findByPk(maintenance.id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: HostelRoom, attributes: ['id', 'room_number'], required: false },
        { model: HostelFacility, attributes: ['id', 'name'], required: false },
        { model: User, as: 'ReportedBy', attributes: ['userId', 'userName'], required: false } // Changed attributes
      ]
    });

    res.status(201).json({ success: true, data: maintenanceWithDetails, message: 'Maintenance request created successfully' });
  } catch (error) {
    console.error('Maintenance creation error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export const getMaintenance = async (req, res) => {
  try {
    const { hostel_id, status, priority, search } = req.query;
    let whereClause = {};
    if (hostel_id && hostel_id !== 'all') whereClause.hostel_id = hostel_id;
    if (status && status !== 'all') whereClause.status = status;
    if (priority && priority !== 'all') whereClause.priority = priority;
    if (search) {
      whereClause[Op.or] = [{ issue_type: { [Op.iLike]: `%${search}%` } }, { description: { [Op.iLike]: `%${search}%` } }];
    }

    const maintenance = await HostelMaintenance.findAll({
      where: whereClause,
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: HostelRoom, attributes: ['id', 'room_number'], required: false },
        { model: HostelFacility, attributes: ['id', 'name'], required: false },
        { model: User, as: 'ReportedBy', attributes: ['userId', 'userName'] } // Changed attributes
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: maintenance });
  } catch (error) {
    console.error('Maintenance fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, cost, completion_date } = req.body;
    const maintenance = await HostelMaintenance.findByPk(id);
    if (!maintenance) return res.status(404).json({ success: false, message: 'Maintenance request not found' });

    const updateData = {};
    if (status) updateData.status = status;
    if (assigned_to) updateData.assigned_to = assigned_to;
    if (cost) updateData.cost = cost;
    if (completion_date) updateData.completion_date = completion_date;

    await maintenance.update(updateData);
    const updatedMaintenance = await HostelMaintenance.findByPk(id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: HostelRoom, attributes: ['id', 'room_number'], required: false },
        { model: HostelFacility, attributes: ['id', 'name'], required: false },
        { model: User, as: 'ReportedBy', attributes: ['userId', 'userName'] } // Changed attributes
      ]
    });
    res.json({ success: true, data: updatedMaintenance, message: 'Maintenance request updated successfully' });
  } catch (error) {
    console.error('Maintenance update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenance = await HostelMaintenance.findByPk(id);
    if (!maintenance) return res.status(404).json({ success: false, message: 'Maintenance request not found' });
    await maintenance.destroy();
    res.json({ success: true, message: 'Maintenance request deleted successfully' });
  } catch (error) {
    console.error('Maintenance deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// FINANCE MANAGEMENT
export const createIncomeType = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const incomeType = await IncomeType.create({ name, description });
    res.status(201).json({ success: true, data: incomeType, message: 'Income type created successfully' });
  } catch (error) {
    console.error('Income type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getIncomeTypes = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = { is_active: true };
    if (search) whereClause.name = { [Op.iLike]: `%${search}%` };
    const incomeTypes = await IncomeType.findAll({ where: whereClause, order: [['name', 'ASC']] });
    res.json({ success: true, data: incomeTypes });
  } catch (error) {
    console.error('Income types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateIncomeType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const incomeType = await IncomeType.findByPk(id);
    if (!incomeType) return res.status(404).json({ success: false, message: 'Income type not found' });
    await incomeType.update({ name, description });
    res.json({ success: true, data: incomeType, message: 'Income type updated successfully' });
  } catch (error) {
    console.error('Income type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteIncomeType = async (req, res) => {
  try {
    const { id } = req.params;
    const incomeType = await IncomeType.findByPk(id);
    if (!incomeType) return res.status(404).json({ success: false, message: 'Income type not found' });
    await incomeType.update({ is_active: false });
    res.json({ success: true, message: 'Income type deactivated successfully' });
  } catch (error) {
    console.error('Income type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createExpenseType = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const expenseType = await ExpenseType.create({ name, description });
    res.status(201).json({ success: true, data: expenseType, message: 'Expense type created successfully' });
  } catch (error) {
    console.error('Expense type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getExpenseTypes = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = { is_active: true };
    if (search) whereClause.name = { [Op.iLike]: `%${search}%` };
    const expenseTypes = await ExpenseType.findAll({ where: whereClause, order: [['name', 'ASC']] });
    res.json({ success: true, data: expenseTypes });
  } catch (error) {
    console.error('Expense types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateExpenseType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const expenseType = await ExpenseType.findByPk(id);
    if (!expenseType) return res.status(404).json({ success: false, message: 'Expense type not found' });
    await expenseType.update({ name, description });
    res.json({ success: true, data: expenseType, message: 'Expense type updated successfully' });
  } catch (error) {
    console.error('Expense type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteExpenseType = async (req, res) => {
  try {
    const { id } = req.params;
    const expenseType = await ExpenseType.findByPk(id);
    if (!expenseType) return res.status(404).json({ success: false, message: 'Expense type not found' });
    await expenseType.update({ is_active: false });
    res.json({ success: true, message: 'Expense type deactivated successfully' });
  } catch (error) {
    console.error('Expense type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// SUPPLIER MANAGEMENT
export const createSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, supplier_type } = req.body;
    if (!name || !supplier_type) return res.status(400).json({ success: false, message: 'Name and supplier type are required' });
    const supplier = await Supplier.create({ name, contact_person, phone, email, address, supplier_type });
    res.status(201).json({ success: true, data: supplier, message: 'Supplier created successfully' });
  } catch (error) {
    console.error('Supplier creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const { supplier_type, search } = req.query;
    let whereClause = { is_active: true };
    if (supplier_type && supplier_type !== 'all') whereClause.supplier_type = supplier_type;
    if (search) {
      whereClause[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }, { contact_person: { [Op.iLike]: `%${search}%` } }, { email: { [Op.iLike]: `%${search}%` } }];
    }
    const suppliers = await Supplier.findAll({ where: whereClause, order: [['name', 'ASC']] });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Suppliers fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Supplier fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address, supplier_type } = req.body;
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    await supplier.update({ name, contact_person, phone, email, address, supplier_type });
    res.json({ success: true, data: supplier, message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Supplier update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByPk(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const purchaseOrdersCount = await PurchaseOrder.count({ where: { supplier_id: id } });
    const billsCount = await SupplierBill.count({ where: { supplier_id: id } });

    if (purchaseOrdersCount > 0 || billsCount > 0) {
      await supplier.update({ is_active: false });
      res.json({ success: true, message: 'Supplier deactivated successfully' });
    } else {
      await supplier.destroy();
      res.json({ success: true, message: 'Supplier deleted successfully' });
    }
  } catch (error) {
    console.error('Supplier deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// UOM MANAGEMENT
export const createUOM = async (req, res) => {
  try {
    const { name, abbreviation, type } = req.body;
    if (!name || !abbreviation || !type) return res.status(400).json({ success: false, message: 'Required fields missing' });
    const uom = await UOM.create({ name, abbreviation, type });
    res.status(201).json({ success: true, data: uom, message: 'UOM created successfully' });
  } catch (error) {
    console.error('UOM creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getUOMs = async (req, res) => {
  try {
    const { type, search } = req.query;
    let whereClause = {};
    if (type && type !== 'all') whereClause.type = type;
    if (search) {
      whereClause[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }, { abbreviation: { [Op.iLike]: `%${search}%` } }];
    }
    const uoms = await UOM.findAll({ where: whereClause, order: [['name', 'ASC']] });
    res.json({ success: true, data: uoms });
  } catch (error) {
    console.error('UOMs fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUOM = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, abbreviation, type } = req.body;
    const uom = await UOM.findByPk(id);
    if (!uom) return res.status(404).json({ success: false, message: 'UOM not found' });
    await uom.update({ name, abbreviation, type });
    res.json({ success: true, data: uom, message: 'UOM updated successfully' });
  } catch (error) {
    console.error('UOM update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteUOM = async (req, res) => {
  try {
    const { id } = req.params;
    const uom = await UOM.findByPk(id);
    if (!uom) return res.status(404).json({ success: false, message: 'UOM not found' });
    await uom.destroy();
    res.json({ success: true, message: 'UOM deleted successfully' });
  } catch (error) {
    console.error('UOM deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DASHBOARD
export const getDashboardStats = async (req, res) => {
  try {
    const totalHostels = await Hostel.count({ where: { is_active: true } });
    
    // User.roleId is a foreign key, not the role name.
    const dashboardRoles = await Role.findAll({ attributes: ['roleId', 'roleName'], raw: true });
    const idsForRoles = names => dashboardRoles.filter(role => names.includes(String(role.roleName).toLowerCase())).map(role => role.roleId);
    const totalWardens = await User.count({
      where: {
        status: 'Active',
        roleId: { [Op.in]: idsForRoles(['warden']) }
      }
    });

    const totalStudents = await User.count({
      where: {
        status: 'Active',
        roleId: { [Op.in]: idsForRoles(['student', 'lapc']) }
      }
    });

    const totalRooms = await HostelRoom.count({ where: { is_active: true } });
    const occupiedRooms = await HostelRoom.count({ where: { is_occupied: true, is_active: true } });
    const totalSuppliers = await Supplier.count({ where: { is_active: true } });
    const totalFacilities = await HostelFacility.count();
    const pendingMaintenance = await HostelMaintenance.count({ where: { status: 'reported' } });

    // Outpass statistics
    const totalOutpasses = await Outpass.count();
    const pendingOutpasses = await Outpass.count({ where: { status: 'pending' } });
    const approvedOutpasses = await Outpass.count({ where: { status: 'approved' } });
    const rejectedOutpasses = await Outpass.count({ where: { status: 'rejected' } });
    const studentsOutside = await Outpass.count({ where: { status: 'outside' } });
    const lateReturns = await Outpass.count({ where: { status: 'late_return' } });

    res.json({
      success: true,
      data: {
        totalHostels, totalWardens, totalStudents, totalRooms,
        occupiedRooms, availableRooms: totalRooms - occupiedRooms,
        totalSuppliers, totalFacilities, pendingMaintenance,
        outpasses: {
          total: totalOutpasses,
          pending: pendingOutpasses,
          approved: approvedOutpasses,
          rejected: rejectedOutpasses,
          outside: studentsOutside,
          late: lateReturns
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAdminChartData = async (req, res) => {
  try {
    const chartData = {};
    const roles = await Role.findAll({ attributes: ['roleId', 'roleName'], raw: true });
    const roleNames = new Map(roles.map(role => [String(role.roleId), role.roleName]));

    const userRoleCounts = await User.findAll({
      attributes: ['roleId', [fn('COUNT', col('id')), 'count']],
      where: { status: 'Active' },
      group: ['roleId'],
      raw: true
    });

    const labels = [];
    const counts = [];
    userRoleCounts.forEach(item => {
      const roleName = String(roleNames.get(String(item.roleId)) || `Unknown role (${item.roleId})`).trim();
      labels.push(roleName ? roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase() : 'Unknown');
      counts.push(parseInt(item.count, 10));
    });

    chartData.userRoles = { labels, counts };

    const monthsToFetch = 6;
    const financialMonths = [];
    const monthlyIncome = [];
    const monthlyExpenses = [];

    for (let i = monthsToFetch - 1; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const startOfMonth = month.startOf('month').toDate();
      const endOfMonth = month.endOf('month').toDate();
      financialMonths.push(month.format('MMM YYYY'));

      const feesIncome = await Fee.sum('amount', { where: { payment_date: { [Op.between]: [startOfMonth, endOfMonth] }, status: 'paid' } }) || 0;
      const additionalIncome = await AdditionalIncome.sum('amount', { where: { received_date: { [Op.between]: [startOfMonth, endOfMonth] } } }) || 0;
      monthlyIncome.push(feesIncome + additionalIncome);

      const messExpenses = await MessDailyExpense.sum('amount', { where: { expense_date: { [Op.between]: [startOfMonth, endOfMonth] } } }) || 0;
      const otherExpenses = await OtherExpense.sum('amount', { where: { expense_date: { [Op.between]: [startOfMonth, endOfMonth] } } }) || 0;
      const maintenanceExpenses = await HostelMaintenance.sum('cost', { where: { completion_date: { [Op.between]: [startOfMonth, endOfMonth] }, status: 'completed' } }) || 0;
      monthlyExpenses.push(messExpenses + otherExpenses + maintenanceExpenses);
    }

    chartData.monthlyFinancials = { labels: financialMonths, income: monthlyIncome, expenses: monthlyExpenses };

    const maintenanceStatusCounts = await HostelMaintenance.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    const statusLabels = [];
    const statusCounts = [];
    maintenanceStatusCounts.forEach(item => {
      statusLabels.push(item.status.charAt(0).toUpperCase() + item.status.slice(1));
      statusCounts.push(parseInt(item.count, 10));
    });

    chartData.maintenanceStatus = { labels: statusLabels, counts: statusCounts };
    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

export { listReductions as getDayReductionRequestsForAdmin } from './reductionController.js';

export { decideReduction as updateDayReductionRequestStatusByAdmin } from './reductionController.js';

export const updateHostelFeeSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { annual_fee_amount, show_fee_reminder } = req.body;
    const hostel = await Hostel.findByPk(id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found' });

    await hostel.update({ annual_fee_amount, show_fee_reminder });
    res.json({ success: true, message: 'Fee settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
