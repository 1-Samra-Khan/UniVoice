const Complaint = require('../models/Complaint');
const User = require('../models/User');

// Helper to add notification to user
const addNotification = async (userId, message, complaintId, type) => {
  await User.findByIdAndUpdate(userId, {
    $push: {
      notifications: {
        message,
        complaintId,
        type,
        isRead: false,
        createdAt: new Date(),
      },
    },
  });
};

// @desc    Get all complaints (sorted by votes desc)
// @route   GET /api/complaints
// @access  Private (all roles)
const getComplaints = async (req, res, next) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const complaints = await Complaint.find(filter)
      .sort({ voteCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('postedBy', 'name role department registrationNumber employeeId')
      .populate('authorityActionBy', 'name role');

    const total = await Complaint.countDocuments(filter);

    // Attach whether current user has voted
    const complaintsWithVoteInfo = complaints.map((c) => {
      const hasVoted = (c.votes || []).some((v) => v.toString() === req.user.id.toString());
      const isOwner = c.postedBy?._id
        ? c.postedBy._id.toString() === req.user.id.toString()
        : c.postedBy?.toString() === req.user.id.toString();
      const obj = c.toObject();
      delete obj.votes;
      return {
        ...obj,
        hasVoted,
        isOwner,
      };
    });

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      complaints: complaintsWithVoteInfo,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
const getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, isDeleted: false })
      .populate('postedBy', 'name role department registrationNumber employeeId')
      .populate('authorityActionBy', 'name role')
      .populate('feedback.postedBy', 'name role');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const hasVoted = (complaint.votes || []).some((v) => v.toString() === req.user.id.toString());
    const isOwner = complaint.postedBy?._id
      ? complaint.postedBy._id.toString() === req.user.id.toString()
      : complaint.postedBy?.toString() === req.user.id.toString();

    const complaintObj = complaint.toObject();
    delete complaintObj.votes;
    complaintObj.hasVoted = hasVoted;
    complaintObj.isOwner = isOwner;

    res.status(200).json({ success: true, complaint: complaintObj });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a complaint
// @route   POST /api/complaints
// @access  Private (student, teacher)
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, tags } = req.body;

    if (!['student', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only students and teachers can post complaints' });
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      tags: tags || [],
      postedBy: req.user.id,
    });

    await complaint.populate('postedBy', 'name role department');

    res.status(201).json({
      success: true,
      message: 'Complaint posted successfully!',
      complaint,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Vote on a complaint (toggle)
// @route   POST /api/complaints/:id/vote
// @access  Private (student, teacher)
const voteComplaint = async (req, res, next) => {
  try {
    if (!['student', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students and teachers are allowed to vote on complaints',
      });
    }

    const complaint = await Complaint.findOne({ _id: req.params.id, isDeleted: false });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const userId = req.user.id;

    // Users cannot vote on their own complaint
    if (complaint.postedBy.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote on your own complaint',
      });
    }

    if (!complaint.votes) complaint.votes = [];
    const hasVoted = complaint.votes.some((v) => v.toString() === userId.toString());

    if (hasVoted) {
      // Remove vote
      complaint.votes = complaint.votes.filter((v) => v.toString() !== userId.toString());
    } else {
      // Add vote
      complaint.votes.push(userId);
    }
    complaint.voteCount = complaint.votes.length;

    await complaint.save();

    res.status(200).json({
      success: true,
      message: hasVoted ? 'Vote removed' : 'Vote added',
      voteCount: complaint.voteCount,
      hasVoted: !hasVoted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Authority marks complaint as fixed
// @route   PATCH /api/complaints/:id/mark-fixed
// @access  Private (authority, admin)
const markFixed = async (req, res, next) => {
  try {
    const { authorityNote } = req.body;

    const complaint = await Complaint.findOne({ _id: req.params.id, isDeleted: false });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (['completed'].includes(complaint.status)) {
      return res.status(400).json({ success: false, message: 'Complaint is already completed' });
    }

    complaint.status = 'fixed_by_authority';
    complaint.authorityNote = authorityNote || 'Your complaint has been addressed.';
    complaint.authorityActionBy = req.user.id;
    complaint.authorityActionAt = new Date();

    await complaint.save();

    // Notify the complaint owner
    await addNotification(
      complaint.postedBy,
      `Your complaint "${complaint.title}" has been marked as fixed by the authority. Please verify and confirm.`,
      complaint._id,
      'complaint_fixed'
    );

    res.status(200).json({
      success: true,
      message: 'Complaint marked as fixed. Poster has been notified to verify.',
      complaint,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Poster confirms complaint is resolved
// @route   PATCH /api/complaints/:id/confirm-complete
// @access  Private (only complaint owner)
const confirmComplete = async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, isDeleted: false });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.postedBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the complaint owner can confirm completion' });
    }

    if (complaint.status !== 'fixed_by_authority') {
      return res.status(400).json({
        success: false,
        message: 'Complaint must be marked as fixed by authority first',
      });
    }

    complaint.status = 'completed';
    complaint.completedAt = new Date();
    await complaint.save();

    // Notify authority
    if (complaint.authorityActionBy) {
      await addNotification(
        complaint.authorityActionBy,
        `Complaint "${complaint.title}" has been confirmed as resolved by the user.`,
        complaint._id,
        'complaint_completed'
      );
    }

    res.status(200).json({
      success: true,
      message: 'Complaint marked as completed! You can now leave feedback.',
      complaint,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Post feedback on completed complaint
// @route   POST /api/complaints/:id/feedback
// @access  Private (only complaint owner)
const postFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const complaint = await Complaint.findOne({ _id: req.params.id, isDeleted: false });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.postedBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the complaint owner can post feedback' });
    }

    if (complaint.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Feedback can only be posted after complaint is completed' });
    }

    if (complaint.feedback && complaint.feedback.rating) {
      return res.status(400).json({ success: false, message: 'Feedback already submitted' });
    }

    complaint.feedback = {
      rating,
      comment: comment || '',
      postedBy: req.user.id,
      createdAt: new Date(),
    };

    await complaint.save();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully! Thank you.',
      feedback: complaint.feedback,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete complaint (only owner, only if completed)
// @route   DELETE /api/complaints/:id
// @access  Private (complaint owner)
const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, isDeleted: false });
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.postedBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the complaint owner or admin can delete this complaint' });
    }

    if (!['completed'].includes(complaint.status) && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You can only delete a complaint after it is marked as completed',
      });
    }

    // Soft delete
    complaint.isDeleted = true;
    complaint.deletedAt = new Date();
    await complaint.save();

    res.status(200).json({ success: true, message: 'Complaint deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get complaint stats (admin/authority dashboard)
// @route   GET /api/complaints/stats
// @access  Private (admin, authority)
const getStats = async (req, res, next) => {
  try {
    const [total, pending, inReview, fixed, completed] = await Promise.all([
      Complaint.countDocuments({ isDeleted: false }),
      Complaint.countDocuments({ isDeleted: false, status: 'pending' }),
      Complaint.countDocuments({ isDeleted: false, status: 'in_review' }),
      Complaint.countDocuments({ isDeleted: false, status: 'fixed_by_authority' }),
      Complaint.countDocuments({ isDeleted: false, status: 'completed' }),
    ]);

    const categoryStats = await Complaint.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const recentComplaints = await Complaint.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('postedBy', 'name role')
      .select('title status voteCount createdAt category');

    res.status(200).json({
      success: true,
      stats: { total, pending, inReview, fixed, completed },
      categoryStats,
      recentComplaints,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: Get all users
// @route   GET /api/admin/users
// @access  Private (admin)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: Toggle user approval
// @route   PATCH /api/admin/users/:id/toggle-approval
// @access  Private (admin)
const toggleUserApproval = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.isApproved = !user.isApproved;
    await user.save();
    res.status(200).json({
      success: true,
      message: `User ${user.isApproved ? 'approved' : 'suspended'} successfully`,
      isApproved: user.isApproved,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: Create authority/admin account
// @route   POST /api/admin/create-user
// @access  Private (admin)
const createPrivilegedUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!['authority', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'This endpoint is for authority/admin accounts only' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role, department, isApproved: true });

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getComplaints,
  getComplaint,
  createComplaint,
  voteComplaint,
  markFixed,
  confirmComplete,
  postFeedback,
  deleteComplaint,
  getStats,
  getAllUsers,
  toggleUserApproval,
  createPrivilegedUser,
};
