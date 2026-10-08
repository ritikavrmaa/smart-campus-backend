const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true,
  },

  studentName: {
    type: String,
    required: true,
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

  subjectId: {
    type: String,
    default: "",
  },

  subject: {
    type: String,
    required: true,
    index: true,
  },

  sessionId: {
    type: String,
    required: true,
    index: true,
  },

  sessionCode: {
    type: String,
    index: true,
  },

  date: {
    type: Date,
    default: Date.now,
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },

  status: {
    type: String,
    enum: ["Present", "Absent"],
    default: "Present",
  },

  attendanceMethod: {
    type: String,
    enum: ["QR", "Session Code", "Manual"],
    default: "Session Code",
  },

  latitude: {
    type: Number,
    default: null,
  },

  longitude: {
    type: Number,
    default: null,
  },

  accuracy: {
    type: Number,
    default: null,
  },

  locationVerified: {
    type: Boolean,
    default: true,
  },

  distanceFromCampus: {
    type: Number,
    default: null,
  },

  aiVerification: {
    verified: { type: Boolean, default: null },
    aiHeadCount: { type: Number, default: null },
    attendanceCount: { type: Number, default: null },
    difference: { type: Number, default: null },
    verifiedAt: { type: Date, default: null },
  },

  markedAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate attendance for the same student + session
attendanceSchema.index(
  { studentId: 1, sessionId: 1 },
  { unique: true }
);

// Indexes for fast querying by department, subject, student and date
attendanceSchema.index({ department: 1, subject: 1 });
attendanceSchema.index({ studentId: 1, subject: 1 });
attendanceSchema.index({ date: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);