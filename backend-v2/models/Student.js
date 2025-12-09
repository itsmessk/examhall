const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  registerNumber: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
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
    required: true,
    default: 3
  },
  classGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassGroup'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);
