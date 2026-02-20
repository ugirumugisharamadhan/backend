const mongoose = require('mongoose');

const culturalContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Content title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Content description is required'],
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['story', 'song', 'dance', 'craft', 'tradition', 'history', 'language', 'recipe'],
    required: [true, 'Content type is required']
  },
  category: {
    type: String,
    enum: ['educational', 'entertainment', 'preservation', 'community'],
    required: [true, 'Content category is required']
  },
  content: {
    text: {
      type: String,
      required: false
    },
    audio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      required: false
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      required: false
    },
    images: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    }]
  },
  language: {
    type: String,
    enum: ['kinyarwanda', 'english', 'french', 'swahili'],
    default: 'kinyarwanda'
  },
  ageGroup: {
    type: String,
    enum: ['children', 'youth', 'adults', 'seniors', 'all'],
    default: 'all'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number, // in minutes
    required: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Content creator is required']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  approvedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'archived'],
    default: 'pending_approval'
  },
  visibility: {
    type: String,
    enum: ['public', 'members_only', 'admins_only'],
    default: 'members_only'
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
  relatedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CulturalContent'
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
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shares: {
    type: Number,
    default: 0
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

// Virtual for content duration in human readable format
culturalContentSchema.virtual('durationFormatted').get(function() {
  if (this.duration) {
    if (this.duration < 60) {
      return `${this.duration} minutes`;
    } else {
      const hours = Math.floor(this.duration / 60);
      const minutes = this.duration % 60;
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
  return 'N/A';
});

// Virtual for average rating
culturalContentSchema.virtual('averageRating').get(function() {
  if (this.comments.length === 0) return 0;
  const totalRating = this.comments.reduce((sum, comment) => sum + (comment.rating || 0), 0);
  return totalRating / this.comments.length;
});

// Virtual for like count
culturalContentSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Instance method to add comment
culturalContentSchema.methods.addComment = function(userId, comment, rating = 0) {
  this.comments.push({
    user: userId,
    comment: comment,
    rating: rating
  });
  return this.save();
};

// Instance method to add like
culturalContentSchema.methods.addLike = function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove like
culturalContentSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// Instance method to approve content
culturalContentSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Instance method to reject content
culturalContentSchema.methods.reject = function(rejectedBy) {
  this.status = 'rejected';
  this.approvedBy = rejectedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Static method to get content by type
culturalContentSchema.statics.getByType = function(type, limit = 20) {
  return this.find({ type, status: 'approved' })
    .populate('createdBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('content.audio', 'filename type url')
    .populate('content.video', 'filename type url')
    .populate('content.images', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get content by category
culturalContentSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ category, status: 'approved' })
    .populate('createdBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('content.audio', 'filename type url')
    .populate('content.video', 'filename type url')
    .populate('content.images', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get content by language
culturalContentSchema.statics.getByLanguage = function(language, limit = 20) {
  return this.find({ language, status: 'approved' })
    .populate('createdBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('content.audio', 'filename type url')
    .populate('content.video', 'filename type url')
    .populate('content.images', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get content by age group
culturalContentSchema.statics.getByAgeGroup = function(ageGroup, limit = 20) {
  return this.find({ ageGroup, status: 'approved' })
    .populate('createdBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('content.audio', 'filename type url')
    .populate('content.video', 'filename type url')
    .populate('content.images', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get content by difficulty
culturalContentSchema.statics.getByDifficulty = function(difficulty, limit = 20) {
  return this.find({ difficulty, status: 'approved' })
    .populate('createdBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('content.audio', 'filename type url')
    .populate('content.video', 'filename type url')
    .populate('content.images', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get content by cell
culturalContentSchema.statics.getByCell = function(cellId, limit = 20) {
  return this.find({ cell: cellId, status: 'approved' })
    .populate('createdBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('content.audio', 'filename type url')
    .populate('content.video', 'filename type url')
    .populate('content.images', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get content by intore group
culturalContentSchema.statics.getByIntoreGroup = function(groupId, limit = 20) {
  return this.find({ intoreGroup: groupId, status: 'approved' })
    .populate('createdBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('content.audio', 'filename type url')
    .populate('content.video', 'filename type url')
    .populate('content.images', 'filename type url')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search content
culturalContentSchema.statics.search = function(query, options = {}) {
  const searchQuery = {
    $and: [
      { status: 'approved' },
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  };
  
  if (options.type) {
    searchQuery.$and.push({ type: options.type });
  }
  
  if (options.category) {
    searchQuery.$and.push({ category: options.category });
  }
  
  if (options.language) {
    searchQuery.$and.push({ language: options.language });
  }
  
  if (options.ageGroup) {
    searchQuery.$and.push({ ageGroup: options.ageGroup });
  }
  
  if (options.difficulty) {
    searchQuery.$and.push({ difficulty: options.difficulty });
  }
  
  return this.find(searchQuery)
    .populate('createdBy', 'firstName lastName username')
    .populate('approvedBy', 'firstName lastName username')
    .populate('content.audio', 'filename type url')
    .populate('content.video', 'filename type url')
    .populate('content.images', 'filename type url')
    .sort({ createdAt: -1 });
};

// Indexes for performance
culturalContentSchema.index({ type: 1 });
culturalContentSchema.index({ category: 1 });
culturalContentSchema.index({ language: 1 });
culturalContentSchema.index({ ageGroup: 1 });
culturalContentSchema.index({ difficulty: 1 });
culturalContentSchema.index({ status: 1 });
culturalContentSchema.index({ createdBy: 1 });
culturalContentSchema.index({ cell: 1 });
culturalContentSchema.index({ sector: 1 });
culturalContentSchema.index({ district: 1 });
culturalContentSchema.index({ intoreGroup: 1 });
culturalContentSchema.index({ createdAt: -1 });
culturalContentSchema.index({ views: -1 });
culturalContentSchema.index({ tags: 1 });

module.exports = mongoose.model('CulturalContent', culturalContentSchema);