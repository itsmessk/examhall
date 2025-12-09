const mongoose = require('mongoose');

/**
 * ClassGroup Model
 * Represents a combination of branch, section, and year
 * Example: CSE A - 3rd Year
 */
const classGroupSchema = new mongoose.Schema({
  branch: {
    type: String,
    required: true,
    enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT']
  },
  section: {
    type: String,
    required: true,
    enum: ['A', 'B']
  },
  year: {
    type: Number,
    required: true
  },
  displayName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create compound index for uniqueness
classGroupSchema.index({ branch: 1, section: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('ClassGroup', classGroupSchema);
