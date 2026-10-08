const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  code: {
    type: String,
    required: true,
  },

  department: {
    type: String,
    required: true,
    index: true,
  },

  semester: {
    type: Number,
    required: true,
    index: true,
  },

  facultyId: {
    type: String,
    default: "",
  },

  facultyName: {
    type: String,
    default: "",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

subjectSchema.index({ name: 1, department: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("Subject", subjectSchema);
