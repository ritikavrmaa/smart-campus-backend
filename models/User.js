const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["student", "faculty", "admin"],
    required: true,
  },

  studentId: {
    type: String,
    default: "",
    index: true,
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

  rollNumber: {
    type: String,
    default: "",
  },

  assignedSubjects: {
    type: [String],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ role: 1, department: 1 });

module.exports = mongoose.model("User", userSchema);