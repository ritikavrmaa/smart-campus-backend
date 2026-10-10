const mongoose = require("mongoose");

const campusConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    default: "Cambridge Institute of Technology, Bengaluru",
  },
  address: {
    type: String,
    default:
      "TC Palya, KR Puram, Jai Bhuvaneshwari Layout Road, SR Layout, Chikkabasavanapura, Krishnarajapura, Bengaluru, Karnataka 560036, India",
  },
  latitude: {
    type: Number,
    default: 13.0108,
    required: true,
  },
  longitude: {
    type: Number,
    default: 77.7012,
    required: true,
  },
  radiusMeters: {
    type: Number,
    default: 150,
    required: true,
  },
  maxAccuracyMeters: {
    type: Number,
    default: 100,
    required: true,
  },
  attendanceThreshold: {
    type: Number,
    default: 75,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CampusConfig", campusConfigSchema);
