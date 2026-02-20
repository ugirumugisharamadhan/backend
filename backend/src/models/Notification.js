const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'system'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['activity', 'attendance', 'chat', 'media', 'approval', 'system', 'reminder'],
    required: [true, 'Notification category is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be system notification
  },
  target: {
    type: String,
    enum: ['user', 'cell', 'sector', 'district', 'intore_group', 'activity'],
    required: [true, 'Target type is required']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  actionUrl: {
    type: String,
    maxlength: 500,
    default: ''
  },
  actionText: {
    type: String,
    maxlength: 50,
    default: 'View'
  },
  expiresAt: {
    type: Date,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for expired status
notificationSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Instance method to mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.read = false;
  this.readAt = null;
  return this.save();
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, limit = 50, skip = 0) {
  return this.find({ recipient: userId })
    .populate('sender', 'firstName lastName username profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    read: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to get notifications by category
notificationSchema.statics.getByCategory = function(userId, category, limit = 50) {
  return this.find({
    recipient: userId,
    category: category
  })
  .populate('sender', 'firstName lastName username profilePicture')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to create activity notification
notificationSchema.statics.createActivityNotification = function(activityId, message, category = 'activity') {
  // This would need to be implemented with actual activity and user population
  return Promise.resolve(null);
};

// Static method to create approval notification
notificationSchema.statics.createApprovalNotification = function(targetId, targetType, message) {
  // This would need to be implemented with actual approval workflow
  return Promise.resolve(null);
};

// Static method to create reminder notification
notificationSchema.statics.createReminderNotification = function(userId, message, actionUrl = '', expiresAt = null) {
  return this.create({
    title: 'Reminder',
    message: message,
    type: 'info',
    category: 'reminder',
    recipient: userId,
    target: 'user',
    actionUrl: actionUrl,
    expiresAt: expiresAt,
    priority: 'medium'
  });
};

// Static method to bulk create notifications
notificationSchema.statics.createBulkNotifications = function(recipients, notificationData) {
  const notifications = recipients.map(recipientId => ({
    ...notificationData,
    recipient: recipientId
  }));
  
  return this.insertMany(notifications);
};

// Indexes for performance
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ target: 1, targetId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);