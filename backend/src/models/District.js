const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'District name is required'],
    trim: true,
    maxlength: 100,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'District code is required'],
    uppercase: true,
    trim: true,
    maxlength: 10,
    unique: true
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  location: {
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
      maxlength: 200
    }
  },
  population: {
    type: Number,
    default: 0,
    min: 0
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
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  sectors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sector'
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

// Virtual for sector count
districtSchema.virtual('sectorCount').get(function() {
  return this.sectors.length;
});

// Virtual for total population (sum of all sectors)
districtSchema.virtual('totalPopulation').get(function() {
  // This would need to be populated or calculated separately
  return this.population;
});

// Pre-save middleware to update admin role
districtSchema.pre('save', function(next) {
  if (this.isModified('admin') && this.admin) {
    // Update the admin user's role to district_admin
    this.model('User').findByIdAndUpdate(
      this.admin,
      { 
        role: 'district_admin',
        'hierarchy.district': this._id 
      }
    ).exec();
  }
  next();
});

// Static method to find by code
districtSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

// Static method to get district with sectors
districtSchema.statics.getWithSectors = function(districtId) {
  return this.findById(districtId)
    .populate('admin', 'firstName lastName email')
    .populate('sectors', 'name code description');
};

// Indexes for performance
districtSchema.index({ name: 1 });
districtSchema.index({ code: 1 });
districtSchema.index({ admin: 1 });

module.exports = mongoose.model('District', districtSchema);