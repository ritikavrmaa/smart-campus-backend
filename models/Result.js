const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
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

  subject: {
    type: String,
    required: true,
    index: true,
  },

  internalMarks: {
    type: Number,
    default: 0,
    min: 0,
  },

  assignmentMarks: {
    type: Number,
    default: 0,
    min: 0,
  },

  labMarks: {
    type: Number,
    default: 0,
    min: 0,
  },

  midtermMarks: {
    type: Number,
    default: 0,
    min: 0,
  },

  endSemMarks: {
    type: Number,
    default: 0,
    min: 0,
  },

  total: {
    type: Number,
    default: 0,
  },

  grade: {
    type: String,
    default: "N/A",
  },

  maxMarks: {
    type: Number,
    default: 100,
  },

  percentage: {
    type: Number,
    default: 0,
  },

  published: {
    type: Boolean,
    default: true,
    index: true,
  },

  facultyId: {
    type: String,
    default: "",
  },

  remarks: {
    type: String,
    default: "",
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-calculate total, percentage and grade before save
resultSchema.pre("save", function () {
  this.total =
    (this.internalMarks || 0) +
    (this.assignmentMarks || 0) +
    (this.labMarks || 0) +
    (this.midtermMarks || 0) +
    (this.endSemMarks || 0);

  const max = this.maxMarks || 100;
  this.percentage = max > 0 ? Number(((this.total / max) * 100).toFixed(1)) : 0;

  // Standard VTU / Autonomous grading scale
  if (this.percentage >= 90) this.grade = "O";
  else if (this.percentage >= 80) this.grade = "A+";
  else if (this.percentage >= 70) this.grade = "A";
  else if (this.percentage >= 60) this.grade = "B+";
  else if (this.percentage >= 50) this.grade = "B";
  else if (this.percentage >= 40) this.grade = "P";
  else this.grade = "F";

  this.updatedAt = new Date();
});

resultSchema.index({ studentId: 1, subject: 1 }, { unique: true });
resultSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model("Result", resultSchema);
