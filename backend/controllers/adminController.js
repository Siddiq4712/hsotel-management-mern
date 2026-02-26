import bcrypt from 'bcryptjs';
import { Op, fn, col, literal } from 'sequelize';
import sequelize from '../config/database.js';
import {
  User, Role, Hostel, RoomType, HostelRoom, Session, Attendance,
  HostelFacilityType, HostelFacility, HostelMaintenance,
  IncomeType, ExpenseType, UOM, Supplier, PurchaseOrder, SupplierBill, DayReductionRequest,
  Fee,
  AdditionalIncome,
  MessDailyExpense,
  OtherExpense
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
export const createHostel = async (req, res) => {
  try {
    const { name, address, contact_number, email, capacity } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Name and capacity are required'
      });
    }

    const hostel = await Hostel.create({
      name,
      address,
      contact_number,
      email,
      capacity
    });

    res.status(201).json({
      success: true,
      data: hostel,
      message: 'Hostel created successfully'
    });
  } catch (error) {
    console.error('Hostel creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getHostels = async (req, res) => {
  try {
    const { search } = req.query;

    let whereClause = { is_active: true };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const hostels = await Hostel.findAll({
      where: whereClause,
      include: [
        {
          model: HostelRoom,
          include: [{ model: RoomType }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: hostels });
  } catch (error) {
    console.error('Hostels fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getHostelById = async (req, res) => {
  try {
    const { id } = req.params;

    const hostel = await Hostel.findByPk(id, {
      include: [
        {
          model: HostelRoom,
          include: [{ model: RoomType }]
        }
      ]
    });

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    res.json({ success: true, data: hostel });
  } catch (error) {
    console.error('Hostel fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateHostel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, contact_number, email, capacity } = req.body;

    const hostel = await Hostel.findByPk(id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    await hostel.update({
      name,
      address,
      contact_number,
      email,
      capacity
    });

    res.json({
      success: true,
      data: hostel,
      message: 'Hostel updated successfully'
    });
  } catch (error) {
    console.error('Hostel update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteHostel = async (req, res) => {
  try {
    const { id } = req.params;

    const hostel = await Hostel.findByPk(id);

    if (!hostel) {
      return res.status(404).json({
        success: false,
        message: 'Hostel not found'
      });
    }

    const usersCount = await User.count({ where: { hostel_id: id } });
    const roomsCount = await HostelRoom.count({ where: { hostel_id: id } });

    if (usersCount > 0 || roomsCount > 0) {
      await hostel.update({ is_active: false });
      res.json({
        success: true,
        message: 'Hostel deactivated successfully (has associated records)'
      });
    } else {
      await hostel.destroy();
      res.json({
        success: true,
        message: 'Hostel deleted successfully'
      });
    }
  } catch (error) {
    console.error('Hostel deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
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
    const { username, email, password, roleId, role, hostel_id } = req.body;

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

    const isAdminRole = roleData.roleName?.toLowerCase() === 'admin';
    if (!isAdminRole && !hostel_id) {
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
      hostel_id: isAdminRole ? null : parseInt(hostel_id, 10),
      status: 'Active'
    });

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
    const { username, email, roleId, role, hostel_id, password } = req.body;

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

    const isAdminRole = roleData.roleName?.toLowerCase() === 'admin';
    if (!isAdminRole && !hostel_id) {
      return res.status(400).json({
        success: false,
        message: 'Hostel selection is required for this role'
      });
    }

    const updateData = {
      userName: username,
      userMail: email,
      roleId: roleData.roleId,
      hostel_id: isAdminRole ? null : parseInt(hostel_id, 10)
    };

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    await user.update(updateData);

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

// SESSION MANAGEMENT
export const createSession = async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Name, start date, and end date are required' });
    }
    const session = await Session.create({ name, start_date, end_date });
    res.status(201).json({ success: true, data: session, message: 'Session created successfully' });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getSessions = async (req, res) => {
  try {
    const { search, is_active } = req.query;
    let whereClause = {};
    if (is_active !== undefined && is_active !== 'all') whereClause.is_active = is_active === 'true';
    if (search) whereClause.name = { [Op.iLike]: `%${search}%` };

    const sessions = await Session.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, is_active } = req.body;
    const session = await Session.findByPk(id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    await session.update({ name, start_date, end_date, is_active });
    res.json({ success: true, data: session, message: 'Session updated successfully' });
  } catch (error) {
    console.error('Session update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findByPk(id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    await session.update({ is_active: false });
    res.json({ success: true, message: 'Session deactivated successfully' });
  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
    
    // Join Role to count Wardens and Students
    const totalWardens = await User.count({ 
      where: { status: 'Active' },
      include: [{ model: Role, as: 'role', where: { roleName: 'Warden' } }]
    });
    
    const totalStudents = await User.count({ 
      where: { status: 'Active' },
      include: [{ model: Role, as: 'role', where: { roleName: 'Student' } }]
    });

    const totalRooms = await HostelRoom.count({ where: { is_active: true } });
    const occupiedRooms = await HostelRoom.count({ where: { is_occupied: true, is_active: true } });
    const totalSuppliers = await Supplier.count({ where: { is_active: true } });
    const totalFacilities = await HostelFacility.count();
    const pendingMaintenance = await HostelMaintenance.count({ where: { status: 'reported' } });

    res.json({
      success: true,
      data: {
        totalHostels, totalWardens, totalStudents, totalRooms,
        occupiedRooms, availableRooms: totalRooms - occupiedRooms,
        totalSuppliers, totalFacilities, pendingMaintenance
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

    const userRoleCounts = await User.findAll({
      attributes: [[fn('COUNT', col('User.userId')), 'count']], // Changed to userId
      where: { status: 'Active' }, // Changed to status
      include: [{ model: Role, as: 'role', attributes: ['roleName'] }],
      group: ['role.roleId', 'role.roleName'],
      raw: true
    });

    const labels = [];
    const counts = [];
    userRoleCounts.forEach(item => {
      labels.push(item['role.roleName']);
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

export const getDayReductionRequestsForAdmin = async (req, res) => {
  try {
    const { status, hostel_id, student_id, from_date, to_date } = req.query;
    let whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    } else {
      whereClause.status = { [Op.in]: ['pending_admin', 'approved_by_admin', 'rejected_by_admin', 'approved_by_warden', 'rejected_by_warden'] };
    }
    if (hostel_id) whereClause.hostel_id = hostel_id;
    if (student_id) whereClause.student_id = student_id;
    if (from_date && to_date) {
      whereClause[Op.and] = [{ from_date: { [Op.lte]: to_date } }, { to_date: { [Op.gte]: from_date } }];
    }

    const requests = await DayReductionRequest.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Student', attributes: ['userId', 'userName', 'userMail', 'roll_number'] }, // Changed attributes
        { model: User, as: 'AdminProcessor', attributes: ['userId', 'userName'], required: false }, // Changed attributes
        { model: User, as: 'WardenProcessor', attributes: ['userId', 'userName'], required: false }, // Changed attributes
        { model: Hostel, as: 'Hostel', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateDayReductionRequestStatusByAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, admin_remarks } = req.body;
    const admin_id = req.user.userId; // Changed to userId

    const request = await DayReductionRequest.findByPk(id, { transaction });
    if (!request || request.status !== 'pending_admin') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Request not found or invalid status' });
    }

    let newStatus = action === 'approve' ? 'approved_by_admin' : 'rejected_by_admin';

    await request.update({ status: newStatus, admin_id, admin_remarks }, { transaction });

    if (newStatus === 'approved_by_admin') {
      const { student_id, from_date, to_date, hostel_id } = request;
      let currentDate = moment(from_date);
      const endDate = moment(to_date);

      while (currentDate.isSameOrBefore(endDate)) {
        const dateString = currentDate.format('YYYY-MM-DD');
        let existingAttendance = await Attendance.findOne({ where: { student_id, hostel_id, date: dateString }, transaction });

        if (existingAttendance) {
          if (existingAttendance.status !== 'P') {
            await existingAttendance.update({
              status: 'OD',
              totalManDays: 1,
              remarks: (existingAttendance.remarks || '') + '; Day reduction approved by Admin',
              marked_by: admin_id
            }, { transaction });
          }
        } else {
          await Attendance.create({
            student_id, hostel_id, date: dateString, status: 'OD', totalManDays: 1,
            remarks: 'Day reduction request approved by Admin', marked_by: admin_id
          }, { transaction });
        }
        currentDate.add(1, 'day');
      }
    }

    await transaction.commit();
    res.json({ success: true, data: request, message: `Request ${newStatus} successfully.` });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

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
