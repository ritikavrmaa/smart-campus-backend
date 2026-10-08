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

  remarks: {
    type: String,
    default: "",
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-calculate total and grade before save
resultSchema.pre("save", function () {
  this.total =
    (this.internalMarks || 0) +
    (this.assignmentMarks || 0) +
    (this.labMarks || 0) +
    (this.midtermMarks || 0) +
    (this.endSemMarks || 0);

  // Default grading based on total (out of 100 or standard)
  if (this.total >= 90) this.grade = "O";
  else if (this.total >= 80) this.grade = "A+";
  else if (this.total >= 70) this.grade = "A";
  else if (this.total >= 60) this.grade = "B+";
  else if (this.total >= 50) this.grade = "B";
  else if (this.total >= 40) this.grade = "P";
  else this.grade = "F";

  this.updatedAt = new Date();
});

resultSchema.index({ studentId: 1, subject: 1 }, { unique: true });
resultSchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model("Result", resultSchema);
