const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  toggleUserApproval,
  createPrivilegedUser,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/users', getAllUsers);
router.patch('/users/:id/toggle-approval', toggleUserApproval);
router.post('/create-user', createPrivilegedUser);

module.exports = router;
