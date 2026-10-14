const express = require('express');
const router = express.Router();
const {
  getComplaints,
  getComplaint,
  createComplaint,
  voteComplaint,
  markFixed,
  confirmComplete,
  postFeedback,
  deleteComplaint,
  getStats,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Stats route (authority & admin)
router.get('/stats', authorize('authority', 'admin'), getStats);

// CRUD
router.get('/', getComplaints);
router.post('/', authorize('student', 'teacher'), createComplaint);
router.get('/:id', getComplaint);
router.delete('/:id', deleteComplaint);

// Voting (only students and teachers can vote)
router.post('/:id/vote', authorize('student', 'teacher'), voteComplaint);

// Status actions
router.patch('/:id/mark-fixed', authorize('authority', 'admin'), markFixed);
router.patch('/:id/confirm-complete', confirmComplete);

// Feedback
router.post('/:id/feedback', postFeedback);

module.exports = router;
