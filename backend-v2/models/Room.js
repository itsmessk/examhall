const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  capacity: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['60', '45', 'custom'],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Room', roomSchema);
