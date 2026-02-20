const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: 100
  },
  resourceType: {
    type: String,
    required: [true, 'Resource type is required'],
    enum: ['user', 'district', 'sector', 'cell', 'intore_group', 'activity', 'media', 'attendance', 'chat', 'notification', 'report', 'cultural_content'],
    trim: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Resource ID is required']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performer is required']
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  before: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true
});

// Virtual for action details
auditLogSchema.virtual('actionDetails').get(function() {
  return `${this.action} on ${this.resourceType} (${this.resourceId})`;
});

// Virtual for time ago
auditLogSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.performedAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Static method to log action
auditLogSchema.statics.logAction = function(action, resourceType, resourceId, performedBy, before = null, after = null, changes = null, metadata = {}, severity = 'info', description = '', ipAddress = null, userAgent = null) {
  return this.create({
    action,
    resourceType,
    resourceId,
    performedBy,
    before,
    after,
    changes,
    metadata,
    severity,
    description,
    ipAddress,
    userAgent
  });
};

// Static method to get logs by user
auditLogSchema.statics.getByUser = function(userId, limit = 100) {
  return this.find({ performedBy: userId })
    .populate('performedBy', 'firstName lastName username')
    .sort({ performedAt: -1 })
    .limit(limit);
};

// Static method to get logs by resource
auditLogSchema.statics.getByResource = function(resourceType, resourceId, limit = 50) {
  return this.find({ resourceType, resourceId })
    .populate('performedBy', 'firstName lastName username')
    .sort({ performedAt: -1 })
    .limit(limit);
};

// Static method to get logs by action
auditLogSchema.statics.getByAction = function(action, limit = 100) {
  return this.find({ action })
    .populate('performedBy', 'firstName lastName username')
    .sort({ performedAt: -1 })
    .limit(limit);
};

// Static method to get logs by severity
auditLogSchema.statics.getBySeverity = function(severity, limit = 100) {
  return this.find({ severity })
    .populate('performedBy', 'firstName lastName username')
    .sort({ performedAt: -1 })
    .limit(limit);
};

// Static method to get logs by date range
auditLogSchema.statics.getByDateRange = function(startDate, endDate, limit = 100) {
  return this.find({
    performedAt: {
      $gte: startDate,
      $lte: endDate
    }
  })
  .populate('performedBy', 'firstName lastName username')
  .sort({ performedAt: -1 })
  .limit(limit);
};

// Static method to get critical actions
auditLogSchema.statics.getCriticalActions = function(limit = 50) {
  return this.find({ severity: 'critical' })
    .populate('performedBy', 'firstName lastName username')
    .sort({ performedAt: -1 })
    .limit(limit);
};

// Static method to get user actions summary
auditLogSchema.statics.getUserActionsSummary = function(userId) {
  return this.aggregate([
    { $match: { performedBy: userId } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastAction: { $max: '$performedAt' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get resource actions summary
auditLogSchema.statics.getResourceActionsSummary = function(resourceType, resourceId) {
  return this.aggregate([
    { $match: { resourceType, resourceId } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastAction: { $max: '$performedAt' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Indexes for performance
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ resourceType: 1 });
auditLogSchema.index({ resourceId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ performedAt: -1 });
auditLogSchema.index({ ipAddress: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);