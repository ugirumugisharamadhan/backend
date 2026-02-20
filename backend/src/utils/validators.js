const validator = require('validator');
const User = require('../models/User');
const District = require('../models/District');
const Sector = require('../models/Sector');
const Cell = require('../models/Cell');

// Email validation
const validateEmail = (email) => {
  return validator.isEmail(email);
};

// Password validation
const validatePassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long.`);
  }

  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter.');
  }

  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter.');
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number.');
  }

  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Phone number validation
const validatePhoneNumber = (phone) => {
  // Remove spaces and common formatting
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check if it's a valid phone number format
  const phoneRegex = /^\+?[\d]{10,15}$/;
  
  return phoneRegex.test(cleanPhone);
};

// Username validation
const validateUsername = async (username) => {
  const errors = [];

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long.');
  }

  if (username.length > 50) {
    errors.push('Username cannot exceed 50 characters.');
  }

  // Check for special characters (allow letters, numbers, underscores, hyphens)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens.');
  }

  // Check if username is already taken
  const existingUser = await User.findByUsername(username);
  if (existingUser) {
    errors.push('Username is already taken.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Check if email is already taken
const validateUniqueEmail = async (email, excludeUserId = null) => {
  const existingUser = await User.findByEmail(email);
  
  if (existingUser && (!excludeUserId || existingUser._id.toString() !== excludeUserId.toString())) {
    return {
      isValid: false,
      error: 'Email is already registered.'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

// Hierarchy validation
const validateHierarchy = async (role, districtId, sectorId, cellId) => {
  const errors = [];

  // Super admin doesn't need hierarchy
  if (role === 'super_admin') {
    return { isValid: true, errors };
  }

  // District admin needs district
  if (role === 'district_admin') {
    if (!districtId) {
      errors.push('District admin must be assigned to a district.');
    } else {
      const district = await District.findById(districtId);
      if (!district) {
        errors.push('Invalid district ID.');
      }
    }
  }

  // Sector admin needs district and sector
  if (role === 'sector_admin') {
    if (!districtId || !sectorId) {
      errors.push('Sector admin must be assigned to a district and sector.');
    } else {
      const sector = await Sector.findById(sectorId);
      if (!sector || sector.district.toString() !== districtId.toString()) {
        errors.push('Invalid sector or sector does not belong to the specified district.');
      }
    }
  }

  // Cell admin needs district, sector, and cell
  if (role === 'cell_admin') {
    if (!districtId || !sectorId || !cellId) {
      errors.push('Cell admin must be assigned to a district, sector, and cell.');
    } else {
      const cell = await Cell.findById(cellId);
      if (!cell || cell.sector.toString() !== sectorId.toString() || cell.district.toString() !== districtId.toString()) {
        errors.push('Invalid cell or cell does not belong to the specified sector and district.');
      }
    }
  }

  // Member needs district, sector, and cell
  if (role === 'member') {
    if (!districtId || !sectorId || !cellId) {
      errors.push('Member must be assigned to a district, sector, and cell.');
    } else {
      const cell = await Cell.findById(cellId);
      if (!cell || cell.sector.toString() !== sectorId.toString() || cell.district.toString() !== districtId.toString()) {
        errors.push('Invalid cell or cell does not belong to the specified sector and district.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Activity validation
const validateActivity = (activityData) => {
  const errors = [];

  if (!activityData.title || activityData.title.trim().length < 5) {
    errors.push('Activity title must be at least 5 characters long.');
  }

  if (!activityData.description || activityData.description.trim().length < 10) {
    errors.push('Activity description must be at least 10 characters long.');
  }

  if (!activityData.type) {
    errors.push('Activity type is required.');
  }

  if (!activityData.date) {
    errors.push('Activity date is required.');
  } else {
    const activityDate = new Date(activityData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (activityDate < today) {
      errors.push('Activity date cannot be in the past.');
    }
  }

  if (!activityData.startTime || !activityData.endTime) {
    errors.push('Start time and end time are required.');
  } else {
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(activityData.startTime) || !timeRegex.test(activityData.endTime)) {
      errors.push('Invalid time format. Use HH:MM format.');
    }
  }

  if (!activityData.location || !activityData.location.name) {
    errors.push('Activity location name is required.');
  }

  if (!activityData.organizer) {
    errors.push('Activity organizer is required.');
  }

  if (!activityData.cell) {
    errors.push('Activity cell is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Media validation
const validateMedia = (mediaData) => {
  const errors = [];

  if (!mediaData.type || !['image', 'video', 'document'].includes(mediaData.type)) {
    errors.push('Invalid media type. Must be image, video, or document.');
  }

  if (!mediaData.uploadedFor || !['activity', 'intore_group', 'cell', 'sector', 'district', 'general'].includes(mediaData.uploadedFor)) {
    errors.push('Invalid upload target.');
  }

  if (!mediaData.targetId) {
    errors.push('Target ID is required.');
  }

  if (!mediaData.visibility || !['public', 'private', 'members_only'].includes(mediaData.visibility)) {
    errors.push('Invalid visibility setting.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Attendance validation
const validateAttendance = (attendanceData) => {
  const errors = [];

  if (!attendanceData.user) {
    errors.push('User is required for attendance.');
  }

  if (!attendanceData.activity) {
    errors.push('Activity is required for attendance.');
  }

  if (!attendanceData.status || !['present', 'absent', 'late', 'excused'].includes(attendanceData.status)) {
    errors.push('Invalid attendance status.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateUsername,
  validateUniqueEmail,
  validateHierarchy,
  validateActivity,
  validateMedia,
  validateAttendance
};