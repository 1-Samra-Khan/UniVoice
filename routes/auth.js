const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getNotifications,
  markNotificationsRead,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read', protect, markNotificationsRead);

module.exports = router;
