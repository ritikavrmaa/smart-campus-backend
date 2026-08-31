const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },

  sessionId: {
    type: String,
    required: true,
    unique: true,
  },

  sessionCode: {
    type: String,
    required: true,
  },

  active: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "AttendanceSession",
  attendanceSessionSchema
);