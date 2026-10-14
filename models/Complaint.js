const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Feedback cannot exceed 500 characters'],
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Academic',
        'Infrastructure',
        'Facilities',
        'Administration',
        'Faculty',
        'Hostel',
        'Transport',
        'Library',
        'Fee',
        'Examination',
        'Other',
      ],
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Voting
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    voteCount: {
      type: Number,
      default: 0,
    },
    // Status flow: pending → in_review → fixed_by_authority → completed
    status: {
      type: String,
      enum: ['pending', 'in_review', 'fixed_by_authority', 'completed'],
      default: 'pending',
    },
    // Authority note when marking as fixed
    authorityNote: {
      type: String,
      trim: true,
      maxlength: [1000, 'Authority note cannot exceed 1000 characters'],
    },
    authorityActionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    authorityActionAt: Date,
    // When poster confirms complete
    completedAt: Date,
    // Feedback after completion
    feedback: feedbackSchema,
    // Visibility
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    // Tags for search
    tags: [String],
  },
  { timestamps: true }
);

// Index for sorting by votes descending
complaintSchema.index({ voteCount: -1, createdAt: -1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ postedBy: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
