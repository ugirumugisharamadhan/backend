const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: [true, 'Activity is required']
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
  date: {
    type: Date,
    required: [true, 'Attendance date is required'],
    default: Date.now
  },
  checkInTime: {
    type: Date,
    required: false
  },
  checkOutTime: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present'
  },
  reason: {
    type: String,
    maxlength: 500,
    default: ''
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  verifiedAt: {
    type: Date,
    required: false
  },
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
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

// Compound unique index for user and activity on the same date
attendanceSchema.index({ user: 1, activity: 1, date: 1 }, { unique: true });

// Virtual for attendance duration in hours
attendanceSchema.virtual('duration').get(function() {
  if (this.checkInTime && this.checkOutTime) {
    return (this.checkOutTime - this.checkInTime) / (1000 * 60 * 60);
  }
  return 0;
});

// Virtual for late status
attendanceSchema.virtual('isLate').get(function() {
  return this.status === 'late';
});

// Instance method to check in
attendanceSchema.methods.checkIn = function() {
  this.checkInTime = new Date();
  this.status = 'present';
  return this.save();
};

// Instance method to check out
attendanceSchema.methods.checkOut = function() {
  this.checkOutTime = new Date();
  return this.save();
};

// Instance method to mark as absent
attendanceSchema.methods.markAbsent = function(reason = '') {
  this.status = 'absent';
  this.reason = reason;
  return this.save();
};

// Instance method to mark as late
attendanceSchema.methods.markLate = function(reason = '') {
  this.status = 'late';
  this.reason = reason;
  return this.save();
};

// Instance method to mark as excused
attendanceSchema.methods.markExcused = function(reason = '') {
  this.status = 'excused';
  this.reason = reason;
  return this.save();
};

// Static method to get daily attendance for an activity
attendanceSchema.statics.getDailyAttendance = function(activityId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    activity: activityId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  })
  .populate('user', 'firstName lastName username')
  .populate('activity', 'title date')
  .sort({ checkInTime: 1 });
};

// Static method to get monthly attendance for a user
attendanceSchema.statics.getMonthlyAttendance = function(userId, year, month) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
  return this.find({
    user: userId,
    date: {
      $gte: startOfMonth,
      $lte: endOfMonth
    }
  })
  .populate('activity', 'title date type')
  .sort({ date: 1 });
};

// Static method to get attendance statistics for a cell
attendanceSchema.statics.getCellStatistics = function(cellId, startDate, endDate) {
  const query = {
    cell: cellId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get attendance statistics for a sector
attendanceSchema.statics.getSectorStatistics = function(sectorId, startDate, endDate) {
  const query = {
    sector: sectorId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get attendance statistics for a district
attendanceSchema.statics.getDistrictStatistics = function(districtId, startDate, endDate) {
  const query = {
    district: districtId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get user's attendance history
attendanceSchema.statics.getUserHistory = function(userId, limit = 50) {
  return this.find({ user: userId })
    .populate('activity', 'title date type location.name')
    .populate('cell', 'name code')
    .sort({ date: -1 })
    .limit(limit);
};

// Indexes for performance
attendanceSchema.index({ user: 1 });
attendanceSchema.index({ activity: 1 });
attendanceSchema.index({ cell: 1 });
attendanceSchema.index({ sector: 1 });
attendanceSchema.index({ district: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ verifiedBy: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);