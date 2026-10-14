const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'authority', 'admin'],
      default: 'student',
    },
    // Student specific
    registrationNumber: {
      type: String,
      trim: true,
    },
    // Teacher specific
    employeeId: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    semester: {
      type: String,
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: true, // Auto-approve for now; admin can toggle
    },
    avatar: {
      type: String,
      default: '',
    },
    notifications: [
      {
        message: String,
        complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
        type: {
          type: String,
          enum: ['complaint_fixed', 'complaint_completed', 'new_complaint', 'vote', 'feedback'],
        },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Hash password before saving (Mongoose 9 - promise-based, no next callback)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
