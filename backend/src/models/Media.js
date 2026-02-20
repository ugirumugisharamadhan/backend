const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['image', 'video', 'document'],
    required: [true, 'Media type is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: 0
  },
  url: {
    type: String,
    required: [true, 'File URL is required']
  },
  thumbnailUrl: {
    type: String,
    required: false
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  uploadedFor: {
    type: String,
    enum: ['activity', 'intore_group', 'cell', 'sector', 'district', 'general'],
    required: [true, 'Upload target is required']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Target ID is required']
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'members_only'],
    default: 'members_only'
  },
  status: {
    type: String,
    enum: ['active', 'pending_approval', 'rejected', 'deleted'],
    default: 'pending_approval'
  },
  approvalHistory: [{
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['approved', 'rejected']
    },
    reason: {
      type: String,
      maxlength: 500
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  metadata: {
    width: {
      type: Number,
      required: false
    },
    height: {
      type: Number,
      required: false
    },
    duration: {
      type: Number, // in seconds
      required: false
    },
    resolution: {
      type: String,
      required: false
    }
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

// Virtual for file size in human readable format
mediaSchema.virtual('sizeFormatted').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for media dimensions
mediaSchema.virtual('dimensions').get(function() {
  if (this.metadata.width && this.metadata.height) {
    return `${this.metadata.width}x${this.metadata.height}`;
  }
  return null;
});

// Virtual for duration in human readable format
mediaSchema.virtual('durationFormatted').get(function() {
  if (this.metadata.duration) {
    const hours = Math.floor(this.metadata.duration / 3600);
    const minutes = Math.floor((this.metadata.duration % 3600) / 60);
    const seconds = this.metadata.duration % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
  return null;
});

// Instance method to approve media
mediaSchema.methods.approve = function(approvedBy, reason = '') {
  this.status = 'active';
  this.approvalHistory.push({
    approvedBy,
    approvedAt: new Date(),
    status: 'approved',
    reason
  });
  return this.save();
};

// Instance method to reject media
mediaSchema.methods.reject = function(rejectedBy, reason = '') {
  this.status = 'rejected';
  this.approvalHistory.push({
    approvedBy: rejectedBy,
    approvedAt: new Date(),
    status: 'rejected',
    reason
  });
  return this.save();
};

// Static method to get media by target
mediaSchema.statics.getByTarget = function(targetType, targetId, visibility = 'public') {
  const query = {
    uploadedFor: targetType,
    targetId: targetId,
    status: 'active'
  };
  
  if (visibility === 'members_only') {
    query.visibility = { $in: ['public', 'members_only'] };
  }
  
  return this.find(query)
    .populate('uploadedBy', 'firstName lastName username')
    .sort({ createdAt: -1 });
};

// Static method to get media by user
mediaSchema.statics.getByUser = function(userId) {
  return this.find({ uploadedBy: userId })
    .populate('uploadedBy', 'firstName lastName username')
    .sort({ createdAt: -1 });
};

// Static method to get pending approval media
mediaSchema.statics.getPendingApproval = function() {
  return this.find({ status: 'pending_approval' })
    .populate('uploadedBy', 'firstName lastName username')
    .sort({ createdAt: -1 });
};

// Static method to search media
mediaSchema.statics.search = function(query, options = {}) {
  const searchQuery = {
    $and: [
      { status: 'active' },
      {
        $or: [
          { originalName: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  };
  
  if (options.type) {
    searchQuery.$and.push({ type: options.type });
  }
  
  if (options.visibility) {
    searchQuery.$and.push({ visibility: options.visibility });
  }
  
  return this.find(searchQuery)
    .populate('uploadedBy', 'firstName lastName username')
    .sort({ createdAt: -1 });
};

// Indexes for performance
mediaSchema.index({ uploadedFor: 1, targetId: 1 });
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ type: 1 });
mediaSchema.index({ status: 1 });
mediaSchema.index({ visibility: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);