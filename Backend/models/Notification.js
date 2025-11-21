const mongoose = require('mongoose');

/**
 * Notification Schema
 * 
 * Platform notifications/announcements that can be sent to different user groups
 * Admin can create, update, and manage these notifications
 */
const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
  },
  targetAudience: {
    type: String,
    enum: ['all', 'users', 'vendors', 'sellers'],
    default: 'all',
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Optional: Link or action URL
  actionUrl: {
    type: String,
    trim: true,
  },
  actionText: {
    type: String,
    trim: true,
  },
  // Tracking
  views: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  // Admin tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  // Scheduled display (optional)
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
notificationSchema.index({ targetAudience: 1, isActive: 1, createdAt: -1 }); // Get active notifications by audience
notificationSchema.index({ isActive: 1, createdAt: -1 }); // Get all active notifications
notificationSchema.index({ createdBy: 1, createdAt: -1 }); // Admin's notifications

// Virtual: Check if notification is currently active (considering dates)
notificationSchema.virtual('isCurrentlyActive').get(function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  
  return true;
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

