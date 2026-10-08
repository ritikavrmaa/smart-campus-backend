const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    index: true,
  },

  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  sessionCode: {
    type: String,
    required: true,
    index: true,
  },

  facultyId: {
    type: String,
    default: "",
    index: true,
  },

  facultyName: {
    type: String,
    default: "",
  },

  department: {
    type: String,
    default: "CSE (IoT)",
    index: true,
  },

  semester: {
    type: Number,
    default: 5,
  },

  active: {
    type: Boolean,
    default: true,
  },

  aiHeadCount: {
    type: Number,
    default: null,
  },

  attendanceCount: {
    type: Number,
    default: 0,
  },

  difference: {
    type: Number,
    default: null,
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "mismatch"],
    default: "pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  completedAt: {
    type: Date,
    default: null,
  },
});

attendanceSessionSchema.index({ department: 1, subject: 1 });
attendanceSessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model(
  "AttendanceSession",
  attendanceSessionSchema
);