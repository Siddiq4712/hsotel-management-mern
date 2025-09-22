// controllers/adminController.js - Complete version with all CRUD operations
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { 
  User, Hostel, RoomType, HostelRoom, Session, 
  HostelFacilityType, HostelFacility, HostelMaintenance,
  IncomeType, ExpenseType, UOM, Supplier, PurchaseOrder, SupplierBill
} = require('../models');

// HOSTEL MANAGEMENT - Complete CRUD
const createHostel = async (req, res) => {
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

const getHostels = async (req, res) => {
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

const getHostelById = async (req, res) => {
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

const updateHostel = async (req, res) => {
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

const deleteHostel = async (req, res) => {
  try {
    const { id } = req.params;

    const hostel = await Hostel.findByPk(id);
    
    if (!hostel) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hostel not found' 
      });
    }

    // Check if hostel has users or rooms
    const usersCount = await User.count({ where: { hostel_id: id } });
    const roomsCount = await HostelRoom.count({ where: { hostel_id: id } });

    if (usersCount > 0 || roomsCount > 0) {
      // Soft delete
      await hostel.update({ is_active: false });
      res.json({ 
        success: true, 
        message: 'Hostel deactivated successfully (has associated records)' 
      });
    } else {
      // Hard delete
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

// USER MANAGEMENT - Complete CRUD
const createUser = async (req, res) => {
  try {
    const { username, email, password, role, hostel_id } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username },
          { email }
        ]
      } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this username or email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      hostel_id: role === 'admin' ? null : hostel_id
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

const getUsers = async (req, res) => {
  try {
    const { role, hostel_id, search } = req.query;
    
    let whereClause = { is_active: true };
    
    if (role && role !== 'all') {
      whereClause.role = role;
    }
    
    if (hostel_id && hostel_id !== 'all') {
      whereClause.hostel_id = hostel_id;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
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

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, hostel_id, password } = req.body;

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const updateData = {
      username,
      email,
      role,
      hostel_id: role === 'admin' ? null : hostel_id
    };

    // Update password if provided
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

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Soft delete - set is_active to false
    await user.update({ is_active: false });
    
    res.json({ 
      success: true, 
      message: 'User deactivated successfully' 
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ROOM TYPE MANAGEMENT - Complete CRUD
const createRoomType = async (req, res) => {
  try {
    const { name, capacity, description } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and capacity are required' 
      });
    }

    const roomType = await RoomType.create({
      name,
      capacity,
      description
    });

    res.status(201).json({ 
      success: true, 
      data: roomType,
      message: 'Room type created successfully' 
    });
  } catch (error) {
    console.error('Room type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getRoomTypes = async (req, res) => {
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

const updateRoomType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity, description } = req.body;

    const roomType = await RoomType.findByPk(id);
    if (!roomType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room type not found' 
      });
    }

    await roomType.update({
      name,
      capacity,
      description
    });

    res.json({ 
      success: true, 
      data: roomType,
      message: 'Room type updated successfully' 
    });
  } catch (error) {
    console.error('Room type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteRoomType = async (req, res) => {
  try {
    const { id } = req.params;

    const roomType = await RoomType.findByPk(id);
    if (!roomType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room type not found' 
      });
    }

    // Check if room type is being used by any rooms
    const roomsCount = await HostelRoom.count({ where: { room_type_id: id } });
    if (roomsCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete room type. It is being used by existing rooms.' 
      });
    }

    await roomType.destroy();
    res.json({ 
      success: true, 
      message: 'Room type deleted successfully' 
    });
  } catch (error) {
    console.error('Room type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ROOM MANAGEMENT - Complete CRUD
const createRoom = async (req, res) => {
  try {
    const { hostel_id, room_type_id, room_number, floor } = req.body;

    if (!hostel_id || !room_type_id || !room_number) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hostel, room type, and room number are required' 
      });
    }

    // Check if room number already exists in this hostel
    const existingRoom = await HostelRoom.findOne({
      where: { hostel_id, room_number }
    });

    if (existingRoom) {
      return res.status(400).json({ 
        success: false, 
        message: 'Room number already exists in this hostel' 
      });
    }

    const room = await HostelRoom.create({
      hostel_id,
      room_type_id,
      room_number,
      floor
    });

    const roomWithDetails = await HostelRoom.findByPk(room.id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: RoomType, attributes: ['id', 'name', 'capacity'] }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: roomWithDetails,
      message: 'Room created successfully' 
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getRooms = async (req, res) => {
  try {
    const { hostel_id, room_type_id, search, is_occupied } = req.query;
    
    let whereClause = { is_active: true };
    
    if (hostel_id && hostel_id !== 'all') {
      whereClause.hostel_id = hostel_id;
    }
    
    if (room_type_id && room_type_id !== 'all') {
      whereClause.room_type_id = room_type_id;
    }
    
    if (is_occupied !== undefined && is_occupied !== 'all') {
      whereClause.is_occupied = is_occupied === 'true';
    }
    
    if (search) {
      whereClause.room_number = { [Op.iLike]: `%${search}%` };
    }

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

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { hostel_id, room_type_id, room_number, floor } = req.body;

    const room = await HostelRoom.findByPk(id);
    
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room not found' 
      });
    }

    await room.update({
      hostel_id,
      room_type_id,
      room_number,
      floor
    });

    const updatedRoom = await HostelRoom.findByPk(id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: RoomType, attributes: ['id', 'name', 'capacity'] }
      ]
    });

    res.json({ 
      success: true, 
      data: updatedRoom,
      message: 'Room updated successfully' 
    });
  } catch (error) {
    console.error('Room update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await HostelRoom.findByPk(id);
    
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: 'Room not found' 
      });
    }

    if (room.is_occupied) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete occupied room' 
      });
    }

    await room.update({ is_active: false });
    
    res.json({ 
      success: true, 
      message: 'Room deactivated successfully' 
    });
  } catch (error) {
    console.error('Room deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// SESSION MANAGEMENT - Complete CRUD
const createSession = async (req, res) => {
  try {
    const { name, start_date, end_date } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, start date, and end date are required' 
      });
    }

    const session = await Session.create({
      name,
      start_date,
      end_date
    });

    res.status(201).json({ 
      success: true, 
      data: session,
      message: 'Session created successfully' 
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSessions = async (req, res) => {
  try {
    const { search, is_active } = req.query;
    
    let whereClause = {};
    
    if (is_active !== undefined && is_active !== 'all') {
      whereClause.is_active = is_active === 'true';
    }
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const sessions = await Session.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, is_active } = req.body;

    const session = await Session.findByPk(id);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session not found' 
      });
    }

    await session.update({
      name,
      start_date,
      end_date,
      is_active
    });

    res.json({ 
      success: true, 
      data: session,
      message: 'Session updated successfully' 
    });
  } catch (error) {
    console.error('Session update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findByPk(id);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session not found' 
      });
    }

    await session.update({ is_active: false });
    
    res.json({ 
      success: true, 
      message: 'Session deactivated successfully' 
    });
  } catch (error) {
    console.error('Session deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// FACILITY TYPE MANAGEMENT - Complete CRUD
const createFacilityType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name is required' 
      });
    }

    const facilityType = await HostelFacilityType.create({
      name,
      description
    });

    res.status(201).json({ 
      success: true, 
      data: facilityType,
      message: 'Facility type created successfully' 
    });
  } catch (error) {
    console.error('Facility type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getFacilityTypes = async (req, res) => {
  try {
    const { search } = req.query;
    
    let whereClause = { is_active: true };
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const facilityTypes = await HostelFacilityType.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: facilityTypes });
  } catch (error) {
    console.error('Facility types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFacilityType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const facilityType = await HostelFacilityType.findByPk(id);
    
    if (!facilityType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Facility type not found' 
      });
    }

    await facilityType.update({
      name,
      description
    });

    res.json({ 
      success: true, 
      data: facilityType,
      message: 'Facility type updated successfully' 
    });
  } catch (error) {
    console.error('Facility type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteFacilityType = async (req, res) => {
  try {
    const { id } = req.params;

    const facilityType = await HostelFacilityType.findByPk(id);
    
    if (!facilityType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Facility type not found' 
      });
    }

    // Check if facility type is being used
    const facilitiesCount = await HostelFacility.count({ 
      where: { facility_type_id: id } 
    });
    
    if (facilitiesCount > 0) {
      await facilityType.update({ is_active: false });
      res.json({ 
        success: true, 
        message: 'Facility type deactivated successfully (has associated facilities)' 
      });
    } else {
      await facilityType.destroy();
      res.json({ 
        success: true, 
        message: 'Facility type deleted successfully' 
      });
    }
  } catch (error) {
    console.error('Facility type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// FACILITY MANAGEMENT - Complete CRUD
const createFacility = async (req, res) => {
  try {
    const { hostel_id, facility_type_id, name, capacity, cost_per_use } = req.body;

    if (!hostel_id || !facility_type_id || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hostel, facility type, and name are required' 
      });
    }

    const facility = await HostelFacility.create({
      hostel_id,
      facility_type_id,
      name,
      capacity,
      cost_per_use: cost_per_use || 0.00
    });

    const facilityWithDetails = await HostelFacility.findByPk(facility.id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: HostelFacilityType, attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: facilityWithDetails,
      message: 'Facility created successfully' 
    });
  } catch (error) {
    console.error('Facility creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getFacilities = async (req, res) => {
  try {
    const { hostel_id, facility_type_id, search, status } = req.query;
    
    let whereClause = {};
    
    if (hostel_id && hostel_id !== 'all') {
      whereClause.hostel_id = hostel_id;
    }
    
    if (facility_type_id && facility_type_id !== 'all') {
      whereClause.facility_type_id = facility_type_id;
    }
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const facilities = await HostelFacility.findAll({
      where: whereClause,
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: HostelFacilityType, attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: facilities });
  } catch (error) {
    console.error('Facilities fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const { hostel_id, facility_type_id, name, capacity, cost_per_use, status } = req.body;

    const facility = await HostelFacility.findByPk(id);
    
    if (!facility) {
      return res.status(404).json({ 
        success: false, 
        message: 'Facility not found' 
      });
    }

    await facility.update({
      hostel_id,
      facility_type_id,
      name,
      capacity,
      cost_per_use,
      status
    });

    const updatedFacility = await HostelFacility.findByPk(id, {
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: HostelFacilityType, attributes: ['id', 'name'] }
      ]
    });

    res.json({ 
      success: true, 
      data: updatedFacility,
      message: 'Facility updated successfully' 
    });
  } catch (error) {
    console.error('Facility update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;

    const facility = await HostelFacility.findByPk(id);
    
    if (!facility) {
      return res.status(404).json({ 
        success: false, 
        message: 'Facility not found' 
      });
    }

    // Check if facility has usage records
    const usageCount = await HostelFacilityRegister.count({ 
      where: { facility_id: id } 
    });
    
    if (usageCount > 0) {
      await facility.update({ status: 'inactive' });
      res.json({ 
        success: true, 
        message: 'Facility deactivated successfully (has usage records)' 
      });
    } else {
      await facility.destroy();
      res.json({ 
        success: true, 
        message: 'Facility deleted successfully' 
      });
    }
  } catch (error) {
    console.error('Facility deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// MAINTENANCE MANAGEMENT - Complete CRUD
// In adminController.js - Fix createMaintenance
const createMaintenance = async (req, res) => {
  try {
    const { hostel_id, room_id, facility_id, issue_type, description, priority } = req.body;

    if (!hostel_id || !issue_type || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hostel, issue type, and description are required' 
      });
    }

    // Validate hostel exists
    const hostelExists = await Hostel.findByPk(hostel_id);
    if (!hostelExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Selected hostel does not exist' 
      });
    }

    const maintenanceData = {
      hostel_id,
      room_id: room_id || null,
      facility_id: facility_id || null,
      issue_type,
      description,
      priority: priority || 'medium',
      reported_by: req.user ? req.user.id : 1, // Use authenticated user ID or fallback
      status: 'reported'
    };

    const maintenance = await HostelMaintenance.create(maintenanceData);

    // Fetch the created maintenance with related data
    const maintenanceWithDetails = await HostelMaintenance.findByPk(maintenance.id, {
      include: [
        { 
          model: Hostel, 
          attributes: ['id', 'name'] 
        },
        { 
          model: HostelRoom, 
          attributes: ['id', 'room_number'], 
          required: false 
        },
        { 
          model: HostelFacility, 
          attributes: ['id', 'name'], 
          required: false 
        },
        { 
          model: User, 
          as: 'ReportedBy', // Make sure this alias matches your model association
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: maintenanceWithDetails,
      message: 'Maintenance request created successfully' 
    });
  } catch (error) {
    console.error('Maintenance creation error:', error);
    console.error('Error details:', error.message);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
};

const getMaintenance = async (req, res) => {
  try {
    const { hostel_id, status, priority, search } = req.query;
    
    let whereClause = {};
    
    if (hostel_id && hostel_id !== 'all') {
      whereClause.hostel_id = hostel_id;
    }
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (priority && priority !== 'all') {
      whereClause.priority = priority;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { issue_type: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const maintenance = await HostelMaintenance.findAll({
      where: whereClause,
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: HostelRoom, attributes: ['id', 'room_number'], required: false },
        { model: HostelFacility, attributes: ['id', 'name'], required: false },
        { model: User, as: 'ReportedBy', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: maintenance });
  } catch (error) {
    console.error('Maintenance fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, cost, completion_date } = req.body;

    const maintenance = await HostelMaintenance.findByPk(id);
    
    if (!maintenance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Maintenance request not found' 
      });
    }

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
        { model: User, as: 'ReportedBy', attributes: ['id', 'username'] }
      ]
    });

    res.json({ 
      success: true, 
      data: updatedMaintenance,
      message: 'Maintenance request updated successfully' 
    });
  } catch (error) {
    console.error('Maintenance update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await HostelMaintenance.findByPk(id);
    
    if (!maintenance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Maintenance request not found' 
      });
    }

    await maintenance.destroy();
    
    res.json({ 
      success: true, 
      message: 'Maintenance request deleted successfully' 
    });
  } catch (error) {
    console.error('Maintenance deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// INCOME TYPE MANAGEMENT - Complete CRUD
const createIncomeType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name is required' 
      });
    }

    const incomeType = await IncomeType.create({
      name,
      description
    });

    res.status(201).json({ 
      success: true, 
      data: incomeType,
      message: 'Income type created successfully' 
    });
  } catch (error) {
    console.error('Income type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getIncomeTypes = async (req, res) => {
  try {
    const { search } = req.query;
    
    let whereClause = { is_active: true };
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const incomeTypes = await IncomeType.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: incomeTypes });
  } catch (error) {
    console.error('Income types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateIncomeType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const incomeType = await IncomeType.findByPk(id);
    
    if (!incomeType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Income type not found' 
      });
    }

    await incomeType.update({
      name,
      description
    });

    res.json({ 
      success: true, 
      data: incomeType,
      message: 'Income type updated successfully' 
    });
  } catch (error) {
    console.error('Income type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Continuing from deleteIncomeType...
const deleteIncomeType = async (req, res) => {
  try {
    const { id } = req.params;

    const incomeType = await IncomeType.findByPk(id);
    
    if (!incomeType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Income type not found' 
      });
    }

    await incomeType.update({ is_active: false });
    
    res.json({ 
      success: true, 
      message: 'Income type deactivated successfully' 
    });
  } catch (error) {
    console.error('Income type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// EXPENSE TYPE MANAGEMENT - Complete CRUD
const createExpenseType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name is required' 
      });
    }

    const expenseType = await ExpenseType.create({
      name,
      description
    });

    res.status(201).json({ 
      success: true, 
      data: expenseType,
      message: 'Expense type created successfully' 
    });
  } catch (error) {
    console.error('Expense type creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getExpenseTypes = async (req, res) => {
  try {
    const { search } = req.query;
    
    let whereClause = { is_active: true };
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const expenseTypes = await ExpenseType.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: expenseTypes });
  } catch (error) {
    console.error('Expense types fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateExpenseType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const expenseType = await ExpenseType.findByPk(id);
    
    if (!expenseType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense type not found' 
      });
    }

    await expenseType.update({
      name,
      description
    });

    res.json({ 
      success: true, 
      data: expenseType,
      message: 'Expense type updated successfully' 
    });
  } catch (error) {
    console.error('Expense type update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteExpenseType = async (req, res) => {
  try {
    const { id } = req.params;

    const expenseType = await ExpenseType.findByPk(id);
    
    if (!expenseType) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense type not found' 
      });
    }

    await expenseType.update({ is_active: false });
    
    res.json({ 
      success: true, 
      message: 'Expense type deactivated successfully' 
    });
  } catch (error) {
    console.error('Expense type deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// SUPPLIER MANAGEMENT - Complete CRUD
const createSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, supplier_type } = req.body;

    if (!name || !supplier_type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and supplier type are required' 
      });
    }

    const supplier = await Supplier.create({
      name,
      contact_person,
      phone,
      email,
      address,
      supplier_type
    });

    res.status(201).json({ 
      success: true, 
      data: supplier,
      message: 'Supplier created successfully' 
    });
  } catch (error) {
    console.error('Supplier creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSuppliers = async (req, res) => {
  try {
    const { supplier_type, search } = req.query;
    
    let whereClause = { is_active: true };
    
    if (supplier_type && supplier_type !== 'all') {
      whereClause.supplier_type = supplier_type;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { contact_person: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const suppliers = await Supplier.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Suppliers fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const supplier = await Supplier.findByPk(id);
    
    if (!supplier) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found' 
      });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Supplier fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address, supplier_type } = req.body;

    const supplier = await Supplier.findByPk(id);
    
    if (!supplier) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found' 
      });
    }

    await supplier.update({
      name,
      contact_person,
      phone,
      email,
      address,
      supplier_type
    });

    res.json({ 
      success: true, 
      data: supplier,
      message: 'Supplier updated successfully' 
    });
  } catch (error) {
    console.error('Supplier update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id);
    
    if (!supplier) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found' 
      });
    }

    // Check if supplier has any purchase orders or bills
    const purchaseOrdersCount = await PurchaseOrder.count({ 
      where: { supplier_id: id } 
    });
    
    const billsCount = await SupplierBill.count({ 
      where: { supplier_id: id } 
    });

    if (purchaseOrdersCount > 0 || billsCount > 0) {
      // Soft delete
      await supplier.update({ is_active: false });
      res.json({ 
        success: true, 
        message: 'Supplier deactivated successfully (has associated records)' 
      });
    } else {
      // Hard delete
      await supplier.destroy();
      res.json({ 
        success: true, 
        message: 'Supplier deleted successfully' 
      });
    }
  } catch (error) {
    console.error('Supplier deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// UOM MANAGEMENT - Complete CRUD
const createUOM = async (req, res) => {
  try {
    const { name, abbreviation, type } = req.body;

    if (!name || !abbreviation || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, abbreviation, and type are required' 
      });
    }

    const uom = await UOM.create({
      name,
      abbreviation,
      type
    });

    res.status(201).json({ 
      success: true, 
      data: uom,
      message: 'UOM created successfully' 
    });
  } catch (error) {
    console.error('UOM creation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUOMs = async (req, res) => {
  try {
    const { type, search } = req.query;
    
    let whereClause = {};
    
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { abbreviation: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const uoms = await UOM.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: uoms });
  } catch (error) {
    console.error('UOMs fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateUOM = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, abbreviation, type } = req.body;

    const uom = await UOM.findByPk(id);
    
    if (!uom) {
      return res.status(404).json({ 
        success: false, 
        message: 'UOM not found' 
      });
    }

    await uom.update({
      name,
      abbreviation,
      type
    });

    res.json({ 
      success: true, 
      data: uom,
      message: 'UOM updated successfully' 
    });
  } catch (error) {
    console.error('UOM update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteUOM = async (req, res) => {
  try {
    const { id } = req.params;

    const uom = await UOM.findByPk(id);
    
    if (!uom) {
      return res.status(404).json({ 
        success: false, 
        message: 'UOM not found' 
      });
    }

    await uom.destroy();
    
    res.json({ 
      success: true, 
      message: 'UOM deleted successfully' 
    });
  } catch (error) {
    console.error('UOM deletion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DASHBOARD STATISTICS
const getDashboardStats = async (req, res) => {
  try {
    const totalHostels = await Hostel.count({ where: { is_active: true } });
    const totalWardens = await User.count({ where: { role: 'warden', is_active: true } });
    const totalStudents = await User.count({ where: { role: 'student', is_active: true } });
    const totalRooms = await HostelRoom.count({ where: { is_active: true } });
    const occupiedRooms = await HostelRoom.count({ where: { is_occupied: true, is_active: true } });
    const totalSuppliers = await Supplier.count({ where: { is_active: true } });
    const totalFacilities = await HostelFacility.count();
    const pendingMaintenance = await HostelMaintenance.count({ where: { status: 'reported' } });

    res.json({
      success: true,
      data: {
        totalHostels,
        totalWardens,
        totalStudents,
        totalRooms,
        occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        totalSuppliers,
        totalFacilities,
        pendingMaintenance
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  // Hostel Management
  createHostel,
  getHostels,
  getHostelById,
  updateHostel,
  deleteHostel,
  
  // User Management
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  
  // Room Type Management
  createRoomType,
  getRoomTypes,
  updateRoomType,
  deleteRoomType,
  
  // Room Management
  createRoom,
  getRooms,
  updateRoom,
  deleteRoom,
  
  // Session Management
  createSession,
  getSessions,
  updateSession,
  deleteSession,
  
  // Facility Type Management
  createFacilityType,
  getFacilityTypes,
  updateFacilityType,
  deleteFacilityType,
  
  // Facility Management
  createFacility,
  getFacilities,
  updateFacility,
  deleteFacility,
  
  // Maintenance Management
  createMaintenance,
  getMaintenance,
  updateMaintenance,
  deleteMaintenance,
  
  // Finance Management
  createIncomeType,
  getIncomeTypes,
  updateIncomeType,
  deleteIncomeType,
  createExpenseType,
  getExpenseTypes,
  updateExpenseType,
  deleteExpenseType,
  
  // Supplier Management
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  
  // UOM Management
  createUOM,
  getUOMs,
  updateUOM,
  deleteUOM,
  
  // Dashboard
  getDashboardStats
};
