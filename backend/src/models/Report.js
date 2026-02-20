const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Report description is required'],
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['activity', 'attendance', 'financial', 'performance', 'audit', 'custom'],
    required: [true, 'Report type is required']
  },
  category: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom'],
    required: [true, 'Report category is required']
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Report generator is required']
  },
  cell: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cell',
    required: false
  },
  sector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
    required: false
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: false
  },
  intoreGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntoreGroup',
    required: false
  },
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: false
  },
  dateRange: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    }
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'generated', 'published', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'members_only', 'admins_only'],
    default: 'members_only'
  },
  media: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: {
      type: String,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  approvedAt: {
    type: Date
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

// Virtual for report period
reportSchema.virtual('period').get(function() {
  const start = this.dateRange.startDate.toLocaleDateString();
  const end = this.dateRange.endDate.toLocaleDateString();
  return `${start} - ${end}`;
});

// Virtual for report age
reportSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Instance method to add comment
reportSchema.methods.addComment = function(userId, comment) {
  this.comments.push({
    user: userId,
    comment: comment
  });
  return this.save();
};

// Instance method to approve report
reportSchema.methods.approve = function(approvedBy) {
  this.status = 'published';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Instance method to archive report
reportSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Static method to get reports by cell
reportSchema.statics.getByCell = function(cellId, limit = 20) {
  return this.find({ cell: cellId })
    .populate('generatedBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('media', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get reports by sector
reportSchema.statics.getBySector = function(sectorId, limit = 20) {
  return this.find({ sector: sectorId })
    .populate('generatedBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('media', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get reports by district
reportSchema.statics.getByDistrict = function(districtId, limit = 20) {
  return this.find({ district: districtId })
    .populate('generatedBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('media', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get reports by type
reportSchema.statics.getByType = function(type, limit = 20) {
  return this.find({ type })
    .populate('generatedBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('media', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get user's reports
reportSchema.statics.getUserReports = function(userId, limit = 20) {
  return this.find({ generatedBy: userId })
    .populate('generatedBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('media', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to generate activity report
reportSchema.statics.generateActivityReport = function(activityId) {
  // This would need to be implemented with actual activity data aggregation
  return Promise.resolve(null);
};

// Static method to generate attendance report
reportSchema.statics.generateAttendanceReport = function(cellId, startDate, endDate) {
  // This would need to be implemented with actual attendance data aggregation
  return Promise.resolve(null);
};

// Indexes for performance
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ cell: 1 });
reportSchema.index({ sector: 1 });
reportSchema.index({ district: 1 });
reportSchema.index({ type: 1 });
reportSchema.index({ category: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ 'dateRange.startDate': 1 });
reportSchema.index({ 'dateRange.endDate': 1 });

module.exports = mongoose.model('Report', reportSchema);