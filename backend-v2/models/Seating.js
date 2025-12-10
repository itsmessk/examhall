const mongoose = require('mongoose');

const seatingSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: true
  },
  examDate: {
    type: Date,
    required: true
  },
  includedClasses: [{
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassGroup'
    },
    branch: String,
    section: String,
    year: Number,
    displayName: String
  }],
  usedRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  rooms: [{
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    roomName: String,
    layout: {
      type: [[mongoose.Schema.Types.Mixed]], // 2D array
      required: true
    }
  }],
  // NEW: Track unassigned students when capacity exceeded
  unassignedCount: {
    type: Number,
    default: 0
  },
  unassignedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Seating', seatingSchema);
