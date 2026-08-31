const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
  },

  studentName: {
    type: String,
    required: true,
  },

  subject: {
    type: String,
    required: true,
  },

  sessionId: {
    type: String,
    required: true,
  },

  sessionCode: {
    type: String,
  },

  markedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "Attendance",
  attendanceSchema
);