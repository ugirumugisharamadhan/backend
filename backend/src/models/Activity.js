const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Activity title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Activity description is required'],
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['meeting', 'training', 'cultural_event', 'community_service', 'workshop', 'celebration'],
    required: [true, 'Activity type is required']
  },
  date: {
    type: Date,
    required: [true, 'Activity date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)`
    }
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)`
    }
  },
  location: {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      maxlength: 200
    },
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    },
    address: {
      type: String,
      maxlength: 500
    }
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  intoreGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntoreGroup',
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
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'declined', 'waitlist'],
      default: 'pending'
    },
    confirmedAt: {
      type: Date
    }
  }],
  maxAttendees: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  media: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
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

// Virtual for confirmed attendees count
activitySchema.virtual('confirmedAttendeesCount').get(function() {
  return this.attendees.filter(a => a.status === 'confirmed').length;
});

// Virtual for pending attendees count
activitySchema.virtual('pendingAttendeesCount').get(function() {
  return this.attendees.filter(a => a.status === 'pending').length;
});

// Virtual for event duration in hours
activitySchema.virtual('duration').get(function() {
  if (this.startTime && this.endTime) {
    const start = new Date(`1970-01-01T${this.startTime}:00`);
    const end = new Date(`1970-01-01T${this.endTime}:00`);
    return (end - start) / (1000 * 60 * 60);
  }
  return 0;
});

// Instance method to check if user is attending
activitySchema.methods.isUserAttending = function(userId) {
  return this.attendees.some(a => a.user.toString() === userId.toString());
};

// Instance method to get user's attendance status
activitySchema.methods.getUserStatus = function(userId) {
  const attendee = this.attendees.find(a => a.user.toString() === userId.toString());
  return attendee ? attendee.status : 'not_registered';
};

// Static method to get upcoming activities
activitySchema.statics.getUpcoming = function(limit = 10) {
  return this.find({
    date: { $gte: new Date() },
    status: 'published'
  })
  .sort({ date: 1 })
  .limit(limit)
  .populate('organizer', 'firstName lastName username')
  .populate('intoreGroup', 'name type')
  .populate('cell', 'name code')
  .populate('media', 'filename type url');
};

// Static method to get activities by cell
activitySchema.statics.getByCell = function(cellId) {
  return this.find({ cell: cellId })
    .sort({ date: -1 })
    .populate('organizer', 'firstName lastName username')
    .populate('intoreGroup', 'name type')
    .populate('attendees.user', 'firstName lastName username');
};

// Static method to get activities by intore group
activitySchema.statics.getByIntoreGroup = function(groupId) {
  return this.find({ intoreGroup: groupId })
    .sort({ date: -1 })
    .populate('organizer', 'firstName lastName username')
    .populate('cell', 'name code');
};

// Indexes for performance
activitySchema.index({ date: 1 });
activitySchema.index({ cell: 1 });
activitySchema.index({ sector: 1 });
activitySchema.index({ district: 1 });
activitySchema.index({ organizer: 1 });
activitySchema.index({ intoreGroup: 1 });
activitySchema.index({ status: 1 });

module.exports = mongoose.model('Activity', activitySchema);