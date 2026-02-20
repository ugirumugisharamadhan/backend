const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for group messages
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatGroup',
    required: false // Can be null for private messages
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: 2000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'audio', 'system'],
    default: 'text'
  },
  media: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    required: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  edited: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  deleted: {
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reaction: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Compound index for private messages
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

// Index for group messages
messageSchema.index({ group: 1, createdAt: 1 });

// Index for media messages
messageSchema.index({ media: 1 });

// Virtual for message status
messageSchema.virtual('status').get(function() {
  if (this.deleted.isDeleted) return 'deleted';
  if (this.edited.isEdited) return 'edited';
  return 'sent';
});

// Instance method to mark as read
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => r.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to edit message
messageSchema.methods.edit = function(newContent, editedBy) {
  this.content = newContent;
  this.edited = {
    isEdited: true,
    editedAt: new Date(),
    editedBy: editedBy
  };
  return this.save();
};

// Instance method to delete message
messageSchema.methods.deleteMessage = function(deletedBy) {
  this.deleted = {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: deletedBy
  };
  return this.save();
};

// Instance method to add reaction
messageSchema.methods.addReaction = function(userId, reaction) {
  const existingReaction = this.reactions.find(r => r.user.toString() === userId.toString());
  if (existingReaction) {
    existingReaction.reaction = reaction;
    existingReaction.createdAt = new Date();
  } else {
    this.reactions.push({
      user: userId,
      reaction: reaction
    });
  }
  return this.save();
};

// Instance method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

// Static method to get private messages between two users
messageSchema.statics.getPrivateMessages = function(user1Id, user2Id, limit = 50, skip = 0) {
  return this.find({
    $and: [
      { $or: [
        { sender: user1Id, recipient: user2Id },
        { sender: user2Id, recipient: user1Id }
      ]},
      { 'deleted.isDeleted': false }
    ]
  })
  .populate('sender', 'firstName lastName username profilePicture')
  .populate('recipient', 'firstName lastName username profilePicture')
  .populate('media', 'filename type url')
  .populate('replyTo', 'content messageType')
  .populate('reactions.user', 'firstName lastName username')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get group messages
messageSchema.statics.getGroupMessages = function(groupId, limit = 50, skip = 0) {
  return this.find({
    group: groupId,
    'deleted.isDeleted': false
  })
  .populate('sender', 'firstName lastName username profilePicture')
  .populate('media', 'filename type url')
  .populate('replyTo', 'content messageType')
  .populate('reactions.user', 'firstName lastName username')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get unread count for user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.aggregate([
    {
      $match: {
        recipient: userId,
        'deleted.isDeleted': false
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'sender',
        foreignField: '_id',
        as: 'senderInfo'
      }
    },
    {
      $unwind: '$senderInfo'
    },
    {
      $group: {
        _id: '$sender',
        unreadCount: {
          $sum: {
            $cond: [
              { $not: { $in: [userId, '$readBy.user'] } },
              1,
              0
            ]
          }
        },
        lastMessage: { $first: '$$ROOT' },
        senderName: { $first: '$senderInfo.firstName' }
      }
    },
    {
      $match: { unreadCount: { $gt: 0 } }
    }
  ]);
};

const chatGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  type: {
    type: String,
    enum: ['public', 'private', 'cell', 'sector', 'district'],
    default: 'public'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Group creator is required']
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
  isPublic: {
    type: Boolean,
    default: true
  },
  joinApprovalRequired: {
    type: Boolean,
    default: false
  },
  maxMembers: {
    type: Number,
    default: 100,
    min: 2
  },
  lastActivity: {
    type: Date,
    default: Date.now
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

// Virtual for member count
chatGroupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for online members count
chatGroupSchema.virtual('onlineMembersCount').get(function() {
  // This would need to be implemented with real-time presence tracking
  return 0;
});

// Instance method to add member
chatGroupSchema.methods.addMember = function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove member
chatGroupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(id => id.toString() !== userId.toString());
  this.admins = this.admins.filter(id => id.toString() !== userId.toString());
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to add admin
chatGroupSchema.methods.addAdmin = function(userId) {
  if (!this.admins.includes(userId)) {
    this.admins.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove admin
chatGroupSchema.methods.removeAdmin = function(userId) {
  this.admins = this.admins.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// Static method to get user's groups
chatGroupSchema.statics.getUserGroups = function(userId) {
  return this.find({
    $or: [
      { members: userId },
      { admins: userId },
      { createdBy: userId }
    ]
  })
  .populate('createdBy', 'firstName lastName username')
  .populate('admins', 'firstName lastName username')
  .populate('members', 'firstName lastName username')
  .sort({ lastActivity: -1 });
};

// Static method to get public groups
chatGroupSchema.statics.getPublicGroups = function() {
  return this.find({ isPublic: true })
    .populate('createdBy', 'firstName lastName username')
    .populate('admins', 'firstName lastName username')
    .sort({ memberCount: -1, lastActivity: -1 });
};

// Indexes for performance
messageSchema.index({ sender: 1 });
messageSchema.index({ recipient: 1 });
messageSchema.index({ group: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ messageType: 1 });

chatGroupSchema.index({ createdBy: 1 });
chatGroupSchema.index({ members: 1 });
chatGroupSchema.index({ admins: 1 });
chatGroupSchema.index({ type: 1 });
chatGroupSchema.index({ lastActivity: -1 });

const Message = mongoose.model('Message', messageSchema);
const ChatGroup = mongoose.model('ChatGroup', chatGroupSchema);

module.exports = { Message, ChatGroup };