const mongoose = require('mongoose');

const sectorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sector name is required'],
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: [true, 'Sector code is required'],
    uppercase: true,
    trim: true,
    maxlength: 10
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District',
    required: [true, 'District is required']
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
  cells: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cell'
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

// Compound unique index for sector code within district
sectorSchema.index({ code: 1, district: 1 }, { unique: true });

// Virtual for cell count
sectorSchema.virtual('cellCount').get(function() {
  return this.cells.length;
});

// Virtual for total population (sum of all cells)
sectorSchema.virtual('totalPopulation').get(function() {
  return this.population;
});

// Pre-save middleware to update admin role and hierarchy
sectorSchema.pre('save', function(next) {
  if (this.isModified('admin') && this.admin) {
    // Update the admin user's role to sector_admin and hierarchy
    this.model('User').findByIdAndUpdate(
      this.admin,
      { 
        role: 'sector_admin',
        'hierarchy.district': this.district,
        'hierarchy.sector': this._id 
      }
    ).exec();
  }
  next();
});

// Static method to find by code and district
sectorSchema.statics.findByCodeAndDistrict = function(code, districtId) {
  return this.findOne({ 
    code: code.toUpperCase(), 
    district: districtId 
  });
};

// Static method to get sector with cells
sectorSchema.statics.getWithCells = function(sectorId) {
  return this.findById(sectorId)
    .populate('admin', 'firstName lastName email')
    .populate('district', 'name code')
    .populate('cells', 'name code description');
};

// Static method to get all sectors in a district
sectorSchema.statics.getByDistrict = function(districtId) {
  return this.find({ district: districtId })
    .populate('admin', 'firstName lastName email')
    .populate('district', 'name code');
};

// Indexes for performance
sectorSchema.index({ name: 1 });
sectorSchema.index({ district: 1 });
sectorSchema.index({ admin: 1 });

module.exports = mongoose.model('Sector', sectorSchema);