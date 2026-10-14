const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register student or teacher
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, registrationNumber, employeeId, department, semester } =
      req.body;

    // Only students and teachers can self-register
    if (!['student', 'teacher'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students and teachers can self-register. Contact admin for authority/admin accounts.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userData = { name, email, password, role, department };

    if (role === 'student') {
      if (!registrationNumber) {
        return res.status(400).json({ success: false, message: 'Registration number is required for students' });
      }
      userData.registrationNumber = registrationNumber;
      userData.semester = semester;
    }

    if (role === 'teacher') {
      if (!employeeId) {
        return res.status(400).json({ success: false, message: 'Employee ID is required for teachers' });
      }
      userData.employeeId = employeeId;
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        registrationNumber: user.registrationNumber,
        employeeId: user.employeeId,
        semester: user.semester,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: 'Your account is pending approval' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        registrationNumber: user.registrationNumber,
        employeeId: user.employeeId,
        semester: user.semester,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user notifications
// @route   GET /api/auth/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');
    const notifications = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/auth/notifications/read
// @access  Private
const markNotificationsRead = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: { 'notifications.$[].isRead': true },
    });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, getNotifications, markNotificationsRead };
