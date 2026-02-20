const mongoose = require('mongoose');

const cellSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Cell name is required'],
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: [true, 'Cell code is required'],
    uppercase: true,
    trim: true,
    maxlength: 10
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
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
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  intoreGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntoreGroup'
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

// Compound unique index for cell code within sector
cellSchema.index({ code: 1, sector: 1 }, { unique: true });

// Virtual for member count
cellSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for intore group count
cellSchema.virtual('intoreGroupCount').get(function() {
  return this.intoreGroups.length;
});

// Virtual for total population
cellSchema.virtual('totalPopulation').get(function() {
  return this.population;
});

// Pre-save middleware to update admin role and hierarchy
cellSchema.pre('save', function(next) {
  if (this.isModified('admin') && this.admin) {
    // Update the admin user's role to cell_admin and hierarchy
    this.model('User').findByIdAndUpdate(
      this.admin,
      { 
        role: 'cell_admin',
        'hierarchy.district': this.district,
        'hierarchy.sector': this.sector,
        'hierarchy.cell': this._id 
      }
    ).exec();
  }
  next();
});

// Pre-save middleware to update district and sector references
cellSchema.pre('save', function(next) {
  if (this.isNew && this.sector) {
    // Populate sector to get district reference
    this.model('Sector').findById(this.sector)
      .then(sector => {
        if (sector) {
          this.district = sector.district;
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

// Static method to find by code and sector
cellSchema.statics.findByCodeAndSector = function(code, sectorId) {
  return this.findOne({ 
    code: code.toUpperCase(), 
    sector: sectorId 
  });
};

// Static method to get cell with members and intore groups
cellSchema.statics.getWithDetails = function(cellId) {
  return this.findById(cellId)
    .populate('admin', 'firstName lastName email')
    .populate('sector', 'name code district')
    .populate('district', 'name code')
    .populate('members', 'firstName lastName username role status')
    .populate('intoreGroups', 'name description leader');
};

// Static method to get all cells in a sector
cellSchema.statics.getBySector = function(sectorId) {
  return this.find({ sector: sectorId })
    .populate('admin', 'firstName lastName email')
    .populate('sector', 'name code');
};

// Static method to get all cells in a district
cellSchema.statics.getByDistrict = function(districtId) {
  return this.find({ district: districtId })
    .populate('admin', 'firstName lastName email')
    .populate('sector', 'name code');
};

// Indexes for performance
cellSchema.index({ name: 1 });
cellSchema.index({ sector: 1 });
cellSchema.index({ district: 1 });
cellSchema.index({ admin: 1 });

module.exports = mongoose.model('Cell', cellSchema);