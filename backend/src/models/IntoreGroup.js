const mongoose = require('mongoose');

const intoreGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Intore group name is required'],
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: [true, 'Intore group code is required'],
    uppercase: true,
    trim: true,
    maxlength: 10,
    unique: true
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  type: {
    type: String,
    enum: ['dance', 'music', 'storytelling', 'craft', 'agriculture', 'traditional_knowledge'],
    required: [true, 'Intore group type is required']
  },
  establishedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  cell: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cell',
    required: [true, 'Cell is required']
  },
  sector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector',
    required: [true, 'Sector is required']
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: [true, 'District is required']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  media: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
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

// Virtual for member count
intoreGroupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for activity count
intoreGroupSchema.virtual('activityCount').get(function() {
  return this.activities.length;
});

// Virtual for media count
intoreGroupSchema.virtual('mediaCount').get(function() {
  return this.media.length;
});

// Pre-save middleware to update leader role
intoreGroupSchema.pre('save', function(next) {
  if (this.isModified('leader') && this.leader) {
    // Update the leader user's intoreGroup reference
    this.model('User').findByIdAndUpdate(
      this.leader,
      { intoreGroup: this._id }
    ).exec();
  }
  next();
});

// Pre-save middleware to update hierarchy references
intoreGroupSchema.pre('save', function(next) {
  if (this.isNew && this.cell) {
    // Populate cell to get sector and district references
    this.model('Cell').findById(this.cell)
      .then(cell => {
        if (cell) {
          this.sector = cell.sector;
          this.district = cell.district;
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

// Static method to find by code
intoreGroupSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

// Static method to get intore group with details
intoreGroupSchema.statics.getWithDetails = function(groupId) {
  return this.findById(groupId)
    .populate('leader', 'firstName lastName email username')
    .populate('cell', 'name code sector')
    .populate('sector', 'name code district')
    .populate('district', 'name code')
    .populate('members', 'firstName lastName username role')
    .populate('activities', 'title description date type')
    .populate('media', 'filename originalName type url');
};

// Static method to get all intore groups in a cell
intoreGroupSchema.statics.getByCell = function(cellId) {
  return this.find({ cell: cellId })
    .populate('leader', 'firstName lastName email')
    .populate('cell', 'name code');
};

// Static method to get all intore groups by type
intoreGroupSchema.statics.getByType = function(type) {
  return this.find({ type })
    .populate('leader', 'firstName lastName email')
    .populate('cell', 'name code');
};

// Indexes for performance
intoreGroupSchema.index({ name: 1 });
intoreGroupSchema.index({ code: 1 });
intoreGroupSchema.index({ type: 1 });
intoreGroupSchema.index({ leader: 1 });
intoreGroupSchema.index({ cell: 1 });
intoreGroupSchema.index({ sector: 1 });
intoreGroupSchema.index({ district: 1 });

module.exports = mongoose.model('IntoreGroup', intoreGroupSchema);