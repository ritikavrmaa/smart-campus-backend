const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const AttendanceSession = require("./models/AttendanceSession");
const Attendance = require("./models/Attendance");
const User = require("./models/User");
const Notice = require("./models/Notice");
const Result = require("./models/Result");
const Subject = require("./models/Subject");
const CampusConfig = require("./models/CampusConfig");
const Department = require("./models/Department");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// -------------------------
// MongoDB connection
// -------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");
    await seedDefaultData();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

// -------------------------
// Default Data Seeder
// -------------------------
let cachedCampusConfig = {
  name: "Cambridge Institute of Technology, Bengaluru",
  address: "TC Palya, KR Puram, Jai Bhuvaneshwari Layout Road, SR Layout, Chikkabasavanapura, Krishnarajapura, Bengaluru, Karnataka 560036, India",
  latitude: parseFloat(process.env.CAMPUS_LATITUDE || "13.0108"),
  longitude: parseFloat(process.env.CAMPUS_LONGITUDE || "77.7012"),
  radiusMeters: parseFloat(process.env.CAMPUS_RADIUS_METERS || "150"),
  maxAccuracyMeters: parseFloat(process.env.CAMPUS_MAX_ACCURACY || "100"),
  attendanceThreshold: parseFloat(process.env.ATTENDANCE_THRESHOLD || "75"),
};

async function seedDefaultData() {
  try {
    // 0. Seed Central Campus Configuration
    let campusDoc = await CampusConfig.findOne();
    if (!campusDoc) {
      campusDoc = await CampusConfig.create(cachedCampusConfig);
    }
    cachedCampusConfig = {
      name: campusDoc.name,
      address: campusDoc.address,
      latitude: campusDoc.latitude,
      longitude: campusDoc.longitude,
      radiusMeters: campusDoc.radiusMeters,
      maxAccuracyMeters: campusDoc.maxAccuracyMeters,
      attendanceThreshold: campusDoc.attendanceThreshold,
    };

    // 0.1 Seed Dynamic Departments
    const initialDepts = [
      { name: "Computer Science and Engineering", code: "CSE", totalSemesters: 8 },
      { name: "CSE (IoT & Cyber Security)", code: "CSE (IoT)", totalSemesters: 8 },
      { name: "Artificial Intelligence & Machine Learning", code: "AI/ML", totalSemesters: 8 },
      { name: "Electronics & Communication Engineering", code: "ECE", totalSemesters: 8 },
      { name: "Information Science and Engineering", code: "ISE", totalSemesters: 8 },
    ];
    for (const d of initialDepts) {
      const dExists = await Department.findOne({ code: d.code });
      if (!dExists) {
        await Department.create(d);
      }
    }

    // 1. Ensure test users exist
    const defaultUsers = [
      {
        name: "Student 1",
        email: "student@test.com",
        password: "Student@123",
        role: "student",
        studentId: "1CD23IC001",
        department: "CSE (IoT)",
        semester: 5,
        rollNumber: "1CD23IC001",
      },
      {
        name: "Student 2",
        email: "student2@test.com",
        password: "Student@123",
        role: "student",
        studentId: "1CD23IC002",
        department: "CSE (IoT)",
        semester: 5,
        rollNumber: "1CD23IC002",
      },
      {
        name: "Ritika Verma",
        email: "ritika.verma.dev@gmail.com",
        password: "Student@123",
        role: "student",
        studentId: "1CD23IC044",
        department: "CSE (IoT)",
        semester: 5,
        rollNumber: "1CD23IC044",
      },
      {
        name: "Prof. Sharma",
        email: "faculty@test.com",
        password: "Faculty@123",
        role: "faculty",
        studentId: "",
        department: "CSE (IoT)",
        assignedSubjects: ["Operating Systems", "Computer Networks", "IoT Architecture & Protocols", "Database Management Systems"],
      },
      {
        name: "System Admin",
        email: "admin@test.com",
        password: "Admin@123",
        role: "admin",
        studentId: "",
        department: "CSE",
      },
    ];

    for (const u of defaultUsers) {
      const existing = await User.findOne({ email: u.email.toLowerCase() });
      const hashedPassword = await bcrypt.hash(u.password, 10);
      if (!existing) {
        await User.create({
          ...u,
          password: hashedPassword,
        });
      } else if (["student@test.com", "admin@test.com", "faculty@test.com"].includes(u.email.toLowerCase())) {
        await User.updateOne(
          { email: u.email.toLowerCase() },
          {
            $set: {
              password: hashedPassword,
              department: u.department || existing.department || "CSE (IoT)",
              semester: u.semester || existing.semester || 5,
              studentId: u.studentId || existing.studentId || "1CD23IC001",
              assignedSubjects: u.assignedSubjects || existing.assignedSubjects || [],
            },
          }
        );
      }
    }

    // 2. Ensure standard subjects exist across departments
    const defaultSubjects = [
      { name: "Operating Systems", code: "BCS501", department: "CSE (IoT)", semester: 5, facultyName: "Prof. Sharma" },
      { name: "Computer Networks", code: "BCS502", department: "CSE (IoT)", semester: 5, facultyName: "Prof. Sharma" },
      { name: "Database Management Systems", code: "BCS503", department: "CSE (IoT)", semester: 5, facultyName: "Prof. Sharma" },
      { name: "Design and Analysis of Algorithms", code: "BCS504", department: "CSE (IoT)", semester: 5, facultyName: "Dr. K. Rao" },
      { name: "IoT Architecture & Protocols", code: "BIO505", department: "CSE (IoT)", semester: 5, facultyName: "Prof. Sharma" },
      { name: "Data Structures & Algorithms", code: "BCS301", department: "CSE", semester: 3, facultyName: "Prof. A. Nair" },
      { name: "Software Engineering", code: "BCS502", department: "CSE", semester: 5, facultyName: "Dr. P. Sen" },
      { name: "Machine Learning", code: "BAI501", department: "AI/ML", semester: 5, facultyName: "Prof. R. Menon" },
      { name: "Deep Learning & Neural Networks", code: "BAI502", department: "AI/ML", semester: 5, facultyName: "Prof. R. Menon" },
      { name: "Digital Signal Processing", code: "BEC501", department: "ECE", semester: 5, facultyName: "Dr. V. Hegde" },
      { name: "Microcontrollers & Embedded Systems", code: "BEC502", department: "ECE", semester: 5, facultyName: "Dr. V. Hegde" },
    ];

    for (const s of defaultSubjects) {
      const exists = await Subject.findOne({ name: s.name, department: s.department });
      if (!exists) {
        await Subject.create(s);
      }
    }

    // 3. Ensure realistic attendance sessions & records for Student 1
    // Matches exact example: Operating Systems 18/30 attended (60% -> 18 needed)
    const seedSubjectsAttendance = [
      { subject: "Operating Systems", heldCount: 30, attendedCount: 18, codeBase: "101" },
      { subject: "Computer Networks", heldCount: 32, attendedCount: 28, codeBase: "201" },
      { subject: "Database Management Systems", heldCount: 28, attendedCount: 24, codeBase: "301" },
      { subject: "Design and Analysis of Algorithms", heldCount: 20, attendedCount: 14, codeBase: "401" },
      { subject: "IoT Architecture & Protocols", heldCount: 25, attendedCount: 22, codeBase: "501" },
    ];

    for (const sa of seedSubjectsAttendance) {
      const existingSessions = await AttendanceSession.countDocuments({
        subject: sa.subject,
        department: "CSE (IoT)",
      });

      if (existingSessions < sa.heldCount) {
        const toCreate = sa.heldCount - existingSessions;
        for (let i = 1; i <= toCreate; i++) {
          const sessIndex = existingSessions + i;
          const sessId = `SEED-${sa.subject.substring(0, 3).toUpperCase()}-${sessIndex}`;
          const sessCode = `${sa.codeBase}${String(sessIndex).padStart(3, "0")}`.substring(0, 6);

          const sessDoc = await AttendanceSession.findOneAndUpdate(
            { sessionId: sessId },
            {
              subject: sa.subject,
              sessionId: sessId,
              sessionCode: sessCode,
              department: "CSE (IoT)",
              semester: 5,
              facultyName: "Prof. Sharma",
              active: sessIndex === sa.heldCount, // latest session active
              attendanceCount: sa.attendedCount,
            },
            { upsert: true, new: true }
          );

          // Mark present for first sa.attendedCount sessions
          if (sessIndex <= sa.attendedCount) {
            await Attendance.findOneAndUpdate(
              { studentId: "1CD23IC001", sessionId: sessId },
              {
                studentId: "1CD23IC001",
                studentName: "Student 1",
                department: "CSE (IoT)",
                semester: 5,
                subject: sa.subject,
                sessionId: sessId,
                sessionCode: sessCode,
                status: "Present",
                locationVerified: true,
                latitude: 13.0108,
                longitude: 77.7012,
                accuracy: 12,
                distanceFromCampus: 15,
                markedAt: new Date(Date.now() - (sa.heldCount - sessIndex) * 86400000),
              },
              { upsert: true }
            );
          }
        }
      }
    }

    // 4. Ensure sample academic results exist for Student 1
    const sampleResults = [
      {
        studentId: "1CD23IC001",
        studentName: "Student 1",
        department: "CSE (IoT)",
        semester: 5,
        subject: "Operating Systems",
        internalMarks: 22,
        assignmentMarks: 14,
        labMarks: 18,
        midtermMarks: 16,
        endSemMarks: 0,
        maxMarks: 100,
        published: true,
        remarks: "Needs improvement in internal assignments",
      },
      {
        studentId: "1CD23IC001",
        studentName: "Student 1",
        department: "CSE (IoT)",
        semester: 5,
        subject: "Computer Networks",
        internalMarks: 26,
        assignmentMarks: 18,
        labMarks: 22,
        midtermMarks: 24,
        endSemMarks: 0,
        maxMarks: 100,
        published: true,
        remarks: "Consistent academic performance",
      },
      {
        studentId: "1CD23IC001",
        studentName: "Student 1",
        department: "CSE (IoT)",
        semester: 5,
        subject: "Database Management Systems",
        internalMarks: 28,
        assignmentMarks: 19,
        labMarks: 24,
        midtermMarks: 27,
        endSemMarks: 0,
        maxMarks: 100,
        published: true,
        remarks: "Excellent grasp of database concepts",
      },
      {
        studentId: "1CD23IC001",
        studentName: "Student 1",
        department: "CSE (IoT)",
        semester: 5,
        subject: "Design and Analysis of Algorithms",
        internalMarks: 18,
        assignmentMarks: 12,
        labMarks: 14,
        midtermMarks: 14,
        endSemMarks: 0,
        maxMarks: 100,
        published: true,
        remarks: "Weak subject. Extra practice on dynamic programming recommended",
      },
      {
        studentId: "1CD23IC001",
        studentName: "Student 1",
        department: "CSE (IoT)",
        semester: 5,
        subject: "IoT Architecture & Protocols",
        internalMarks: 27,
        assignmentMarks: 19,
        labMarks: 25,
        midtermMarks: 26,
        endSemMarks: 0,
        maxMarks: 100,
        published: true,
        remarks: "Very active in hands-on sensor labs",
      },
    ];

    for (const r of sampleResults) {
      const doc = await Result.findOne({ studentId: r.studentId, subject: r.subject });
      if (!doc) {
        const newDoc = new Result(r);
        await newDoc.save();
      } else {
        Object.assign(doc, r);
        await doc.save();
      }
    }

    // 5. Seed Campus Notices
    const sampleNotices = [
      {
        title: "Cambridge Institute: 75% Attendance Mandatory for End-Sem Exams",
        message: "As per VTU guidelines and Cambridge Institute of Technology academic regulations, all students must maintain minimum 75% attendance in each registered subject to be eligible for semester-end examinations.",
        department: "All",
        role: "student",
      },
      {
        title: "Smart Campus Geofencing Active Across KR Puram Campus",
        message: "Mobile attendance marking via QR code or 6-digit session code requires active GPS location verification inside the Cambridge Institute of Technology 150m boundary.",
        department: "All",
        role: "all",
      },
      {
        title: "Internal Assessment 2 Schedule Announced",
        message: "IA-2 for 5th semester CSE (IoT) subjects commences next Monday. Review your weak subjects and performance analytics on your student dashboard.",
        department: "CSE (IoT)",
        role: "student",
      },
    ];

    for (const n of sampleNotices) {
      const nExists = await Notice.findOne({ title: n.title });
      if (!nExists) {
        await Notice.create(n);
      }
    }

    console.log("Default seed data initialized successfully for Cambridge Institute of Technology");
  } catch (err) {
    console.warn("Seeding notice:", err.message);
  }
}

// -------------------------
// Helper: GPS Geofencing (Haversine Formula)
// -------------------------
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function verifyCampusLocation(latitude, longitude, accuracy) {
  const campusLat = cachedCampusConfig.latitude || parseFloat(process.env.CAMPUS_LATITUDE || "13.0108");
  const campusLon = cachedCampusConfig.longitude || parseFloat(process.env.CAMPUS_LONGITUDE || "77.7012");
  const campusRadius = cachedCampusConfig.radiusMeters || parseFloat(process.env.CAMPUS_RADIUS_METERS || "150");
  const maxAccuracy = cachedCampusConfig.maxAccuracyMeters || parseFloat(process.env.CAMPUS_MAX_ACCURACY || "100");

  if (!isNaN(campusLat) && !isNaN(campusLon)) {
    if (
      latitude === undefined ||
      longitude === undefined ||
      latitude === null ||
      longitude === null ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return {
        allowed: false,
        message: "Location permission and GPS coordinates are required to mark attendance.",
      };
    }

    const numLat = parseFloat(latitude);
    const numLon = parseFloat(longitude);
    const numAcc = accuracy !== undefined && accuracy !== null ? parseFloat(accuracy) : null;

    if (numAcc !== null && !isNaN(numAcc) && numAcc > maxAccuracy) {
      return {
        allowed: false,
        message: `GPS accuracy is too low (${Math.round(numAcc)}m). Please wait for better signal and try again.`,
      };
    }

    const distance = getDistanceFromLatLonInMeters(
      numLat,
      numLon,
      campusLat,
      campusLon
    );

    if (distance > campusRadius) {
      return {
        allowed: false,
        distance: Math.round(distance),
        message: "Attendance can only be marked from inside the campus.",
      };
    }

    return {
      allowed: true,
      distance: Math.round(distance),
    };
  }

  return { allowed: true, distance: 0 };
}

// -------------------------
// Helper: 75% Attendance Mathematical Calculation & Eligibility Buffer
// -------------------------
function calculateAttendanceStats(held, attended, threshold = 75) {
  const actualHeld = Math.max(Number(held) || 0, Number(attended) || 0);
  const actualAttended = Math.max(Number(attended) || 0, 0);
  const classesMissed = Math.max(0, actualHeld - actualAttended);

  if (actualHeld === 0) {
    return {
      classesHeld: 0,
      classesAttended: 0,
      classesMissed: 0,
      percentage: 0,
      classesNeeded: 0,
      classesCanMiss: 0,
      status: "No attendance data yet",
      isLow: false,
      isEligible: false,
      message: "No attendance data yet",
    };
  }

  const percentage = Number(((actualAttended / actualHeld) * 100).toFixed(1));
  let classesNeeded = 0;
  let classesCanMiss = 0;
  const isLow = percentage < threshold;

  if (isLow) {
    // Formula:
    // (attended + x) / (held + x) >= threshold / 100
    // (100 - threshold) * x >= threshold * held - 100 * attended
    // x >= (threshold * held - 100 * attended) / (100 - threshold)
    const numerator = threshold * actualHeld - 100 * actualAttended;
    const denominator = 100 - threshold;
    classesNeeded = Math.max(0, Math.ceil(numerator / denominator));
  } else {
    // Future classes that can still be missed while retaining at least threshold:
    // attended / (held + y) >= threshold / 100
    // 100 * attended >= threshold * held + threshold * y
    // y <= (100 * attended - threshold * held) / threshold
    const numerator = 100 * actualAttended - threshold * actualHeld;
    classesCanMiss = Math.max(0, Math.floor(numerator / threshold));
  }

  return {
    classesHeld: actualHeld,
    classesAttended: actualAttended,
    classesMissed,
    percentage,
    classesNeeded,
    classesCanMiss,
    status: isLow ? "Low Attendance" : "75% requirement met",
    isLow,
    isEligible: !isLow,
    message: isLow
      ? `You need to attend ${classesNeeded} more consecutive classes to reach ${threshold}%.`
      : classesCanMiss > 0
      ? `You can safely miss ${classesCanMiss} upcoming class(es) without falling below ${threshold}%.`
      : "75% requirement met. Maintain attendance to remain eligible.",
  };
}

// -------------------------
// Authentication Middleware
// -------------------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// -------------------------
// Base Test Route
// -------------------------
app.get("/", (req, res) => {
  res.json({
    message: "Smart Campus Backend is running",
    status: "online",
    campusGeofence: {
      latitude: parseFloat(process.env.CAMPUS_LATITUDE),
      longitude: parseFloat(process.env.CAMPUS_LONGITUDE),
      radiusMeters: parseFloat(process.env.CAMPUS_RADIUS_METERS || "150"),
      maxAccuracyMeters: parseFloat(process.env.CAMPUS_MAX_ACCURACY || "100"),
    },
    attendanceThreshold: parseFloat(process.env.ATTENDANCE_THRESHOLD || "75"),
  });
});

// -------------------------
// CAMPUS CONFIGURATION APIs (Central Geofencing & Policy)
// -------------------------
app.get("/api/campus-config", async (req, res) => {
  try {
    const config = await CampusConfig.findOne();
    if (config) {
      cachedCampusConfig = {
        name: config.name,
        address: config.address,
        latitude: config.latitude,
        longitude: config.longitude,
        radiusMeters: config.radiusMeters,
        maxAccuracyMeters: config.maxAccuracyMeters,
        attendanceThreshold: config.attendanceThreshold,
      };
    }
    res.json(cachedCampusConfig);
  } catch (err) {
    res.json(cachedCampusConfig);
  }
});

app.put("/api/admin/campus-config", async (req, res) => {
  try {
    const {
      name,
      address,
      latitude,
      longitude,
      radiusMeters,
      maxAccuracyMeters,
      attendanceThreshold,
    } = req.body;

    let config = await CampusConfig.findOne();
    if (!config) {
      config = new CampusConfig();
    }
    if (name) config.name = name;
    if (address) config.address = address;
    if (latitude !== undefined) config.latitude = Number(latitude);
    if (longitude !== undefined) config.longitude = Number(longitude);
    if (radiusMeters !== undefined) config.radiusMeters = Number(radiusMeters);
    if (maxAccuracyMeters !== undefined) config.maxAccuracyMeters = Number(maxAccuracyMeters);
    if (attendanceThreshold !== undefined) config.attendanceThreshold = Number(attendanceThreshold);
    config.updatedAt = new Date();
    await config.save();

    cachedCampusConfig = {
      name: config.name,
      address: config.address,
      latitude: config.latitude,
      longitude: config.longitude,
      radiusMeters: config.radiusMeters,
      maxAccuracyMeters: config.maxAccuracyMeters,
      attendanceThreshold: config.attendanceThreshold,
    };

    res.json({
      message: "Campus geofence and academic configuration updated successfully",
      config: cachedCampusConfig,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update campus configuration",
      error: err.message,
    });
  }
});

// -------------------------
// DYNAMIC DEPARTMENTS APIs (Requirement 4)
// -------------------------
const SUPPORTED_DEPARTMENTS = ["CSE", "CSE (IoT)", "AI/ML", "ECE", "ISE"];

app.get("/api/departments", async (req, res) => {
  try {
    const dbDepts = await Department.find({ isActive: { $ne: false } }).sort({ code: 1 });
    const deptCodes = dbDepts.map((d) => d.code);
    const customDepts = await Subject.distinct("department");
    const merged = Array.from(new Set([...SUPPORTED_DEPARTMENTS, ...deptCodes, ...customDepts])).filter(Boolean);
    res.json({ departments: merged, details: dbDepts });
  } catch (err) {
    res.json({ departments: SUPPORTED_DEPARTMENTS, details: [] });
  }
});

app.post("/api/admin/departments", async (req, res) => {
  try {
    const { name, code, description, totalSemesters } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "Department name and code are required" });
    }
    const cleanCode = code.trim().toUpperCase();
    const exists = await Department.findOne({ code: cleanCode });
    if (exists) {
      return res.status(400).json({ message: `Department with code ${cleanCode} already exists` });
    }
    const dept = await Department.create({
      name: name.trim(),
      code: cleanCode,
      description: description || "",
      totalSemesters: Number(totalSemesters) || 8,
    });
    res.json({ message: "Department created successfully", department: dept });
  } catch (err) {
    res.status(500).json({ message: "Unable to create department", error: err.message });
  }
});

app.delete("/api/admin/departments/:id", async (req, res) => {
  try {
    await Department.findByIdAndUpdate(req.params.id, { $set: { isActive: false } });
    res.json({ message: "Department deactivated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Unable to deactivate department", error: err.message });
  }
});

// -------------------------
// DYNAMIC SUBJECTS APIs (Requirement 4)
// -------------------------
app.get("/api/subjects", async (req, res) => {
  try {
    const { department, semester } = req.query;
    const filter = {};
    if (department && department !== "All") filter.department = department;
    if (semester && semester !== "All") filter.semester = Number(semester);

    const subjects = await Subject.find(filter).sort({ name: 1 });
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch subjects", error: err.message });
  }
});

app.post("/api/admin/subjects", async (req, res) => {
  try {
    const { name, code, department, semester, credits, facultyId, facultyName } = req.body;
    if (!name || !code || !department) {
      return res.status(400).json({ message: "Subject name, code, and department are required" });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();
    const subject = await Subject.findOneAndUpdate(
      { name: cleanName, department: department.trim() },
      {
        $set: {
          name: cleanName,
          code: cleanCode,
          department: department.trim(),
          semester: Number(semester) || 5,
          facultyId: facultyId || "",
          facultyName: facultyName || "",
        },
      },
      { upsert: true, new: true }
    );

    if (facultyId || facultyName) {
      const userFilter = facultyId
        ? { email: facultyId.toLowerCase() }
        : { name: facultyName, role: "faculty" };
      await User.updateOne(userFilter, { $addToSet: { assignedSubjects: cleanName } });
    }

    res.json({ message: "Subject saved successfully", subject });
  } catch (err) {
    res.status(500).json({ message: "Unable to save subject", error: err.message });
  }
});

app.delete("/api/admin/subjects/:id", async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: "Subject removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Unable to remove subject", error: err.message });
  }
});

// -------------------------
// FACULTY ASSIGNED SUBJECTS (Requirement 4)
// -------------------------
app.get("/api/faculty/my-subjects", async (req, res) => {
  try {
    const { email, name } = req.query;
    let assigned = [];

    if (email) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (user && user.assignedSubjects?.length > 0) {
        assigned = user.assignedSubjects;
      }
    }

    const query = {
      $or: [
        ...(assigned.length > 0 ? [{ name: { $in: assigned } }] : []),
        ...(email ? [{ facultyId: email.toLowerCase().trim() }] : []),
        ...(name ? [{ facultyName: name.trim() }] : []),
      ],
    };

    let subjects = [];
    if (query.$or.length > 0) {
      subjects = await Subject.find(query).sort({ name: 1 });
    }

    // If none assigned explicitly, fallback to department subjects for smooth faculty demo
    if (subjects.length === 0) {
      subjects = await Subject.find({ department: "CSE (IoT)" }).sort({ name: 1 });
    }

    res.json({ count: subjects.length, subjects });
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch faculty subjects", error: err.message });
  }
});

// -------------------------
// ADMIN USER MANAGEMENT & ANALYTICS
// -------------------------
app.get("/api/admin/users", async (req, res) => {
  try {
    const { role, department } = req.query;
    const filter = {};
    if (role && role !== "All") filter.role = role;
    if (department && department !== "All") filter.department = department;

    const users = await User.find(filter).select("-password").sort({ name: 1 });
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch users", error: err.message });
  }
});

app.post("/api/admin/users", async (req, res) => {
  try {
    const { name, email, password, role, studentId, department, semester, rollNumber, assignedSubjects } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role,
      studentId: studentId ? studentId.trim() : "",
      department: department || "CSE (IoT)",
      semester: semester ? Number(semester) : 5,
      rollNumber: rollNumber || studentId || "",
      assignedSubjects: Array.isArray(assignedSubjects) ? assignedSubjects : [],
    });
    res.json({ message: "User account created successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Failed to create user", error: err.message });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
});

app.get("/api/admin/analytics", async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalFaculty = await User.countDocuments({ role: "faculty" });
    const totalDepts = await Department.countDocuments({ isActive: { $ne: false } });
    const totalSubjects = await Subject.countDocuments();
    const activeSessions = await AttendanceSession.countDocuments({ active: true });
    const totalSessions = await AttendanceSession.countDocuments();
    const totalAttendanceMarked = await Attendance.countDocuments();

    const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || "75");
    const students = await User.find({ role: "student" });
    let lowAttendanceCount = 0;
    const lowAttendanceList = [];

    for (const st of students) {
      const records = await Attendance.find({ studentId: st.studentId, status: "Present" });
      const deptSessions = await AttendanceSession.countDocuments({ department: st.department || "CSE (IoT)" });
      const held = Math.max(deptSessions, records.length);
      const stats = calculateAttendanceStats(held, records.length, threshold);
      if (stats.isLow && held > 0) {
        lowAttendanceCount++;
        lowAttendanceList.push({
          studentId: st.studentId,
          name: st.name,
          department: st.department,
          percentage: stats.percentage,
          classesNeeded: stats.classesNeeded,
        });
      }
    }

    res.json({
      institution: cachedCampusConfig.name,
      totalStudents,
      totalFaculty,
      totalDepartments: Math.max(totalDepts, 5),
      totalSubjects,
      activeSessions,
      totalSessions,
      totalAttendanceMarked,
      lowAttendanceCount,
      lowAttendanceStudents: lowAttendanceList.slice(0, 10),
      campusConfig: cachedCampusConfig,
    });
  } catch (err) {
    res.status(500).json({ message: "Unable to generate analytics", error: err.message });
  }
});

// -------------------------
// Faculty creates session
// -------------------------
app.post("/api/session/create", async (req, res) => {
  try {
    const {
      subject,
      sessionId,
      sessionCode,
      department,
      semester,
      facultyId,
      facultyName,
    } = req.body;

    if (!subject || !sessionId || !sessionCode) {
      return res.status(400).json({
        message: "Missing session details (subject, sessionId, sessionCode)",
      });
    }

    const existingSession = await AttendanceSession.findOne({ sessionId });
    if (existingSession) {
      return res.status(400).json({
        message: "Session already exists",
      });
    }

    const session = await AttendanceSession.create({
      subject: subject.trim(),
      sessionId: sessionId.trim(),
      sessionCode: sessionCode.trim(),
      department: department || "CSE (IoT)",
      semester: semester ? Number(semester) : 5,
      facultyId: facultyId || "",
      facultyName: facultyName || "",
      active: true,
    });

    res.json({
      message: "Attendance session created",
      session,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to create session",
      error: error.message,
    });
  }
});

// -------------------------
// Faculty closes session
// -------------------------
app.post("/api/session/close", async (req, res) => {
  try {
    const { sessionId, sessionCode } = req.body;
    if (!sessionId && !sessionCode) {
      return res.status(400).json({ message: "sessionId or sessionCode is required" });
    }
    const query = sessionId ? { sessionId: String(sessionId).trim() } : { sessionCode: String(sessionCode).trim() };
    const session = await AttendanceSession.findOne(query);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    session.active = false;
    session.closedAt = new Date();
    await session.save();
    res.json({ message: "Session closed successfully", session });
  } catch (err) {
    res.status(500).json({ message: "Failed to close session", error: err.message });
  }
});

// -------------------------
// Student marks using code (with GPS Geofencing)
// -------------------------
app.post("/api/attendance/code", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      sessionCode,
      latitude,
      longitude,
      accuracy,
    } = req.body;

    if (!studentId || !sessionCode) {
      return res.status(400).json({
        message: "Student ID and session code are required",
      });
    }

    // 1. GPS Verification
    const locCheck = verifyCampusLocation(latitude, longitude, accuracy);
    if (!locCheck.allowed) {
      return res.status(403).json({
        message: locCheck.message,
        locationVerified: false,
        distance: locCheck.distance,
      });
    }

    // 2. Validate Session
    const session = await AttendanceSession.findOne({
      sessionCode: sessionCode.trim(),
      active: true,
    });

    if (!session) {
      return res.status(404).json({
        message: "Invalid or inactive session code",
      });
    }

    // 3. Duplicate Check
    const duplicate = await Attendance.findOne({
      studentId: studentId.trim(),
      sessionId: session.sessionId,
    });

    if (duplicate) {
      return res.status(400).json({
        message: "Attendance already marked",
      });
    }

    // Lookup student details from User for department & semester
    const userDoc = await User.findOne({ studentId: studentId.trim() });
    const studentDept = userDoc?.department || session.department || "CSE (IoT)";
    const studentSem = userDoc?.semester || session.semester || 5;

    // 4. Create Record
    const record = await Attendance.create({
      studentId: studentId.trim(),
      studentName: studentName || userDoc?.name || "Student",
      department: studentDept,
      semester: studentSem,
      subject: session.subject,
      sessionId: session.sessionId,
      sessionCode: session.sessionCode,
      attendanceMethod: "Session Code",
      status: "Present",
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      accuracy: accuracy !== undefined ? Number(accuracy) : null,
      distanceFromCampus: locCheck.distance || 0,
      locationVerified: true,
    });

    const headCount = await Attendance.countDocuments({
      sessionId: session.sessionId,
    });

    await AttendanceSession.updateOne(
      { sessionId: session.sessionId },
      { $set: { attendanceCount: headCount } }
    );

    res.json({
      message: "Attendance marked successfully",
      subject: session.subject,
      headCount,
      record,
      locationVerified: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Attendance already marked" });
    }
    res.status(500).json({
      message: "Unable to mark attendance",
      error: error.message,
    });
  }
});

// -------------------------
// Student marks using QR (with GPS Geofencing)
// -------------------------
app.post("/api/attendance/mark", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      sessionId,
      subject,
      latitude,
      longitude,
      accuracy,
    } = req.body;

    if (!studentId || !sessionId || !subject) {
      return res.status(400).json({
        message: "Missing attendance details",
      });
    }

    // 1. GPS Verification
    const locCheck = verifyCampusLocation(latitude, longitude, accuracy);
    if (!locCheck.allowed) {
      return res.status(403).json({
        message: locCheck.message,
        locationVerified: false,
        distance: locCheck.distance,
      });
    }

    // 2. Validate Session
    const session = await AttendanceSession.findOne({
      sessionId: sessionId.trim(),
      active: true,
    });

    if (!session) {
      return res.status(404).json({
        message: "Invalid or inactive attendance session",
      });
    }

    // 3. Duplicate Check
    const duplicate = await Attendance.findOne({
      studentId: studentId.trim(),
      sessionId: sessionId.trim(),
    });

    if (duplicate) {
      return res.status(400).json({
        message: "Attendance already marked",
      });
    }

    const userDoc = await User.findOne({ studentId: studentId.trim() });
    const studentDept = userDoc?.department || session.department || "CSE (IoT)";
    const studentSem = userDoc?.semester || session.semester || 5;

    // 4. Create Record
    const record = await Attendance.create({
      studentId: studentId.trim(),
      studentName: studentName || userDoc?.name || "Student",
      department: studentDept,
      semester: studentSem,
      sessionId: session.sessionId,
      subject: session.subject,
      sessionCode: session.sessionCode,
      attendanceMethod: "QR",
      status: "Present",
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      accuracy: accuracy !== undefined ? Number(accuracy) : null,
      distanceFromCampus: locCheck.distance || 0,
      locationVerified: true,
    });

    const headCount = await Attendance.countDocuments({
      sessionId: session.sessionId,
    });

    await AttendanceSession.updateOne(
      { sessionId: session.sessionId },
      { $set: { attendanceCount: headCount } }
    );

    res.json({
      message: "Attendance marked successfully",
      headCount,
      record,
      locationVerified: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Attendance already marked" });
    }
    res.status(500).json({
      message: "Unable to mark attendance",
      error: error.message,
    });
  }
});

// -------------------------
// Faculty gets count by code
// -------------------------
app.get("/api/attendance/count-by-code/:sessionCode", async (req, res) => {
  try {
    const sessionCode = req.params.sessionCode.trim();

    const session = await AttendanceSession.findOne({ sessionCode });
    if (!session) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    const students = await Attendance.find({
      sessionId: session.sessionId,
    }).sort({ markedAt: 1 });

    res.json({
      subject: session.subject,
      sessionCode: session.sessionCode,
      sessionId: session.sessionId,
      headCount: students.length,
      aiHeadCount: session.aiHeadCount,
      difference: session.difference,
      verificationStatus: session.verificationStatus,
      students,
    });
  } catch (error) {
    console.error("Attendance count error:", error);
    res.status(500).json({
      message: "Unable to fetch attendance",
      error: error.message,
    });
  }
});

// -------------------------
// Faculty gets count by ID
// -------------------------
app.get("/api/attendance/count/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await AttendanceSession.findOne({ sessionId });
    const students = await Attendance.find({ sessionId }).sort({ markedAt: 1 });

    res.json({
      subject: session ? session.subject : "",
      headCount: students.length,
      aiHeadCount: session?.aiHeadCount || null,
      students,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch attendance",
      error: error.message,
    });
  }
});

// -------------------------
// AI Headcount Bridge Endpoint (Converts Base64 to Multipart for YOLO)
// -------------------------
app.post("/api/ai/count-people", async (req, res) => {
  try {
    const { image_base64, image } = req.body;
    let rawB64 = image_base64 || image;

    if (!rawB64) {
      return res.status(400).json({
        success: false,
        message: "No image received. Please provide image_base64 in request body.",
      });
    }

    if (typeof rawB64 === "string" && rawB64.includes(",")) {
      rawB64 = rawB64.split(",")[1];
    }

    const buffer = Buffer.from(rawB64, "base64");
    const blob = new Blob([buffer], { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("image", blob, "classroom.jpg");

    const candidateUrls = [
      process.env.AI_SERVICE_URL,
      "https://smart-campus-ai-pz3m.onrender.com",
      "http://127.0.0.1:5001",
    ].filter(Boolean);

    const aiUrls = Array.from(new Set(candidateUrls));

    let lastError = null;
    for (const baseUrl of aiUrls) {
      try {
        const targetUrl = `${baseUrl.replace(/\/$/, "")}/count-people`;
        console.log(`Forwarding headcount request to AI service: ${targetUrl}`);

        const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
        const timeoutMs = isLocal ? 3000 : 60000;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Try JSON Base64 first
        let aiRes = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: rawB64 }),
          signal: controller.signal,
        }).catch((err) => {
          console.warn(`JSON attempt to ${targetUrl} failed:`, err.message);
          return null;
        });

        // Fallback to FormData if needed
        if (!aiRes || !aiRes.ok) {
          try {
            aiRes = await fetch(targetUrl, {
              method: "POST",
              body: formData,
              signal: controller.signal,
            });
          } catch (fdErr) {
            console.warn(`FormData attempt to ${targetUrl} failed:`, fdErr.message);
          }
        }

        clearTimeout(timeoutId);

        if (!aiRes) continue;

        const aiText = await aiRes.text();
        let aiJson;
        try {
          aiJson = JSON.parse(aiText);
        } catch {
          aiJson = { message: aiText };
        }

        if (aiRes.ok && aiJson && aiJson.success !== false) {
          return res.json({
            success: true,
            count: Number(aiJson.count) || 0,
            confidence: aiJson.confidence || [],
            detections: aiJson.detections || [],
            annotated_image: aiJson.annotated_image || null,
            message: aiJson.message || "People detected successfully",
            aiUrl: targetUrl,
          });
        } else {
          lastError = new Error(aiJson?.message || `AI error HTTP ${aiRes.status}`);
        }
      } catch (err) {
        lastError = err;
        console.warn(`AI attempt to ${baseUrl} failed:`, err.message);
      }
    }

    throw lastError || new Error("Failed to contact AI service");
  } catch (error) {
    console.error("AI bridge error:", error);
    res.status(500).json({
      success: false,
      message: "AI person detection service error: " + error.message,
    });
  }
});

// -------------------------
// AI Headcount Verification Recording
// -------------------------
app.post("/api/attendance/verify-session", async (req, res) => {
  try {
    const { sessionCode, sessionId, aiHeadCount, qrCount, difference, verified } = req.body;

    const query = sessionCode
      ? { sessionCode: String(sessionCode).trim() }
      : { sessionId: String(sessionId).trim() };

    const session = await AttendanceSession.findOne(query);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const diff =
      difference !== undefined
        ? Number(difference)
        : Math.abs((Number(qrCount) || 0) - (Number(aiHeadCount) || 0));

    const isVerified = verified !== undefined ? Boolean(verified) : diff === 0;

    session.aiHeadCount = Number(aiHeadCount);
    session.attendanceCount = Number(qrCount);
    session.difference = diff;
    session.verificationStatus = isVerified ? "verified" : "mismatch";
    await session.save();

    // Update attendance records for audit
    await Attendance.updateMany(
      { sessionId: session.sessionId },
      {
        $set: {
          "aiVerification.verified": isVerified,
          "aiVerification.aiHeadCount": Number(aiHeadCount),
          "aiVerification.attendanceCount": Number(qrCount),
          "aiVerification.difference": diff,
          "aiVerification.verifiedAt": new Date(),
        },
      }
    );

    res.json({
      message: "AI attendance verification recorded successfully",
      status: session.verificationStatus,
      session,
    });
  } catch (error) {
    console.error("AI verification error:", error);
    res.status(500).json({
      message: "Unable to record AI verification",
      error: error.message,
    });
  }
});

// -------------------------
// Student Attendance History (Personal)
// -------------------------
app.get("/api/attendance/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const attendance = await Attendance.find({
      studentId: studentId.trim(),
    }).sort({ markedAt: -1 });

    res.json({
      studentId,
      total: attendance.length,
      attendance,
    });
  } catch (error) {
    console.log("Student attendance error:", error);
    res.status(500).json({
      message: "Unable to fetch attendance",
      error: error.message,
    });
  }
});

// -------------------------
// Student Attendance Report (Dynamic 75% Calculation)
// -------------------------
app.get("/api/attendance/student/:studentId/report", async (req, res) => {
  try {
    const { studentId } = req.params;
    const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || "75");

    const user = await User.findOne({ studentId: studentId.trim() });
    const studentDept = user?.department || "CSE (IoT)";
    const studentSem = user?.semester || 5;

    // Get all completed/created sessions for the student's department & subjects
    const departmentSubjects = await Subject.find({
      department: studentDept,
      semester: studentSem,
    });

    const subjectNamesSet = new Set(departmentSubjects.map((s) => s.name));

    // Also get subjects the student has marked attendance in
    const studentRecords = await Attendance.find({
      studentId: studentId.trim(),
    }).sort({ markedAt: -1 });

    studentRecords.forEach((r) => subjectNamesSet.add(r.subject));

    // Also include any sessions created for those subjects
    const allSessions = await AttendanceSession.find();
    allSessions.forEach((s) => {
      if (s.department === studentDept || !s.department) {
        subjectNamesSet.add(s.subject);
      }
    });

    const subjectList = Array.from(subjectNamesSet).filter(Boolean);

    let totalClassesHeld = 0;
    let totalClassesAttended = 0;
    const subjectReports = [];
    const subjectsRequiringAttention = [];
    const goodStandingSubjects = [];

    for (const sub of subjectList) {
      // Classes Held = total sessions conducted for this subject
      const sessionsHeldCount = await AttendanceSession.countDocuments({
        subject: sub,
        ...(studentDept ? { $or: [{ department: studentDept }, { department: { $exists: false } }] } : {}),
      });

      // Classes Attended = student records marked Present
      const studentAttendedCount = studentRecords.filter(
        (r) => r.subject.toLowerCase() === sub.toLowerCase() && r.status === "Present"
      ).length;

      // Actual held is at least attended
      const held = Math.max(sessionsHeldCount, studentAttendedCount);
      const attended = studentAttendedCount;

      totalClassesHeld += held;
      totalClassesAttended += attended;

      const stats = calculateAttendanceStats(held, attended, threshold);

      const subData = {
        subject: sub,
        classesHeld: stats.classesHeld,
        classesAttended: stats.classesAttended,
        percentage: stats.percentage,
        classesNeeded: stats.classesNeeded,
        status: stats.status,
        isLow: stats.isLow,
        message: stats.message,
      };

      subjectReports.push(subData);

      if (stats.isLow) {
        subjectsRequiringAttention.push(subData);
      } else {
        goodStandingSubjects.push(subData);
      }
    }

    const overallStats = calculateAttendanceStats(
      totalClassesHeld,
      totalClassesAttended,
      threshold
    );

    res.json({
      studentId: studentId.trim(),
      studentName: user?.name || "Student",
      department: studentDept,
      semester: studentSem,
      threshold,
      overall: {
        totalHeld: overallStats.classesHeld,
        totalAttended: overallStats.classesAttended,
        percentage: overallStats.percentage,
        status: overallStats.status,
        subjectsBelow75: subjectsRequiringAttention.length,
      },
      subjects: subjectReports,
      subjectsRequiringAttention,
      goodStandingSubjects,
      recentAttendance: studentRecords.slice(0, 15),
    });
  } catch (error) {
    console.error("Student report error:", error);
    res.status(500).json({
      message: "Unable to calculate attendance report",
      error: error.message,
    });
  }
});

// -------------------------
// Subject-wise Attendance (Admin / Faculty)
// -------------------------
app.get("/api/attendance/subject/:subject", async (req, res) => {
  try {
    const { subject } = req.params;
    const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || "75");

    const sessions = await AttendanceSession.find({
      subject: new RegExp(`^${subject.trim()}$`, "i"),
    });

    const sessionIds = sessions.map((s) => s.sessionId);
    const classesHeld = sessions.length;

    // Get all attendance for these sessions
    const attendances = await Attendance.find({
      $or: [
        { sessionId: { $in: sessionIds } },
        { subject: new RegExp(`^${subject.trim()}$`, "i") },
      ],
    });

    // Group by student
    const studentMap = {};
    attendances.forEach((att) => {
      if (!studentMap[att.studentId]) {
        studentMap[att.studentId] = {
          studentId: att.studentId,
          studentName: att.studentName,
          department: att.department,
          attended: 0,
        };
      }
      if (att.status === "Present") {
        studentMap[att.studentId].attended += 1;
      }
    });

    const students = Object.values(studentMap).map((st) => {
      const stats = calculateAttendanceStats(classesHeld, st.attended, threshold);
      return {
        ...st,
        held: stats.classesHeld,
        percentage: stats.percentage,
        classesNeeded: stats.classesNeeded,
        status: stats.status,
        isLow: stats.isLow,
      };
    });

    const above75 = students.filter((s) => !s.isLow).length;
    const below75 = students.filter((s) => s.isLow).length;
    const avgPercentage =
      students.length > 0
        ? Number(
            (
              students.reduce((sum, s) => sum + s.percentage, 0) /
              students.length
            ).toFixed(1)
          )
        : 0;

    res.json({
      subject,
      classesHeld,
      totalStudents: students.length,
      averageAttendance: avgPercentage,
      studentsAbove75: above75,
      studentsBelow75: below75,
      threshold,
      students,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch subject attendance",
      error: error.message,
    });
  }
});

// -------------------------
// Department-wise Record (Admin)
// -------------------------
app.get("/api/attendance/department/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || "75");

    const students = await User.find({
      role: "student",
      department: new RegExp(`^${department.trim()}$`, "i"),
    });

    const studentSummaries = [];
    let totalDeptAttended = 0;
    let totalDeptHeld = 0;

    for (const student of students) {
      const records = await Attendance.find({
        studentId: student.studentId,
        status: "Present",
      });

      // Total sessions for this department
      const sessions = await AttendanceSession.find({
        department: new RegExp(`^${department.trim()}$`, "i"),
      });

      const held = Math.max(sessions.length, records.length);
      const attended = records.length;

      totalDeptHeld += held;
      totalDeptAttended += attended;

      // Check subjects below 75%
      const subjectGroups = {};
      records.forEach((r) => {
        subjectGroups[r.subject] = (subjectGroups[r.subject] || 0) + 1;
      });

      let weakSubjectCount = 0;
      for (const [sub, attCount] of Object.entries(subjectGroups)) {
        const subSessions = sessions.filter((s) => s.subject === sub).length;
        const subStats = calculateAttendanceStats(subSessions, attCount, threshold);
        if (subStats.isLow) weakSubjectCount++;
      }

      const overall = calculateAttendanceStats(held, attended, threshold);

      studentSummaries.push({
        studentId: student.studentId,
        name: student.name,
        rollNumber: student.rollNumber || student.studentId,
        department: student.department,
        semester: student.semester,
        held: overall.classesHeld,
        attended: overall.classesAttended,
        overallAttendance: overall.percentage,
        subjectsBelow75: weakSubjectCount,
        status: overall.status,
      });
    }

    const deptAvg =
      totalDeptHeld > 0
        ? Number(((totalDeptAttended / totalDeptHeld) * 100).toFixed(1))
        : 0;

    res.json({
      department,
      totalStudents: students.length,
      averageAttendance: deptAvg,
      threshold,
      students: studentSummaries,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch department attendance",
      error: error.message,
    });
  }
});

// -------------------------
// Admin Attendance Dashboard (Filtered Table)
// -------------------------
app.get("/api/attendance/admin/summary", async (req, res) => {
  try {
    const { department, semester, subject, from, to } = req.query;
    const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || "75");

    const userFilter = { role: "student" };
    if (department && department !== "All") {
      userFilter.department = department;
    }
    if (semester && semester !== "All") {
      userFilter.semester = Number(semester);
    }

    const students = await User.find(userFilter).sort({ studentId: 1 });

    const attendanceDateFilter = {};
    if (from || to) {
      attendanceDateFilter.markedAt = {};
      if (from) attendanceDateFilter.markedAt.$gte = new Date(from);
      if (to) attendanceDateFilter.markedAt.$lte = new Date(to);
    }

    const resultsTable = [];

    for (const st of students) {
      const matchCriteria = {
        studentId: st.studentId,
        status: "Present",
        ...attendanceDateFilter,
      };

      if (subject && subject !== "All") {
        matchCriteria.subject = new RegExp(`^${subject.trim()}$`, "i");
      }

      const records = await Attendance.find(matchCriteria);

      let held = 0;
      if (subject && subject !== "All") {
        held = await AttendanceSession.countDocuments({
          subject: new RegExp(`^${subject.trim()}$`, "i"),
        });
      } else {
        held = await AttendanceSession.countDocuments({
          ...(department && department !== "All" ? { department } : {}),
        });
      }

      const stats = calculateAttendanceStats(held, records.length, threshold);

      resultsTable.push({
        studentId: st.studentId,
        studentName: st.name,
        department: st.department || "CSE",
        semester: st.semester || 5,
        subject: subject && subject !== "All" ? subject : "All Subjects",
        held: stats.classesHeld,
        attended: stats.classesAttended,
        percentage: stats.percentage,
        classesNeeded: stats.classesNeeded,
        status: stats.status,
        isLow: stats.isLow,
      });
    }

    res.json({
      total: resultsTable.length,
      threshold,
      records: resultsTable,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to generate admin summary",
      error: error.message,
    });
  }
});

// -------------------------
// ACADEMIC RESULTS APIs (Requirement 9)
// -------------------------
app.post("/api/results/upload", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      department,
      semester,
      subject,
      internalMarks,
      assignmentMarks,
      labMarks,
      midtermMarks,
      endSemMarks,
      remarks,
    } = req.body;

    if (!studentId || !subject) {
      return res.status(400).json({
        message: "Student ID and Subject are required",
      });
    }

    let resolvedName = studentName;
    let resolvedDept = department;
    let resolvedSem = semester;

    if (!resolvedName || !resolvedDept) {
      const user = await User.findOne({ studentId: studentId.trim() });
      if (user) {
        resolvedName = resolvedName || user.name;
        resolvedDept = resolvedDept || user.department;
        resolvedSem = resolvedSem || user.semester;
      }
    }

    const filter = { studentId: studentId.trim(), subject: subject.trim() };
    const updateData = {
      studentId: studentId.trim(),
      studentName: resolvedName || "Student",
      department: resolvedDept || "CSE (IoT)",
      semester: resolvedSem ? Number(resolvedSem) : 5,
      subject: subject.trim(),
      internalMarks: Number(internalMarks) || 0,
      assignmentMarks: Number(assignmentMarks) || 0,
      labMarks: Number(labMarks) || 0,
      midtermMarks: Number(midtermMarks) || 0,
      endSemMarks: Number(endSemMarks) || 0,
      remarks: remarks || "",
      updatedAt: new Date(),
    };

    const total =
      updateData.internalMarks +
      updateData.assignmentMarks +
      updateData.labMarks +
      updateData.midtermMarks +
      updateData.endSemMarks;

    let grade = "F";
    if (total >= 90) grade = "O";
    else if (total >= 80) grade = "A+";
    else if (total >= 70) grade = "A";
    else if (total >= 60) grade = "B+";
    else if (total >= 50) grade = "B";
    else if (total >= 40) grade = "P";

    updateData.total = total;
    updateData.grade = grade;

    const result = await Result.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json({
      message: "Result recorded successfully",
      result,
    });
  } catch (error) {
    console.error("Result upload error:", error);
    res.status(500).json({
      message: "Unable to upload result",
      error: error.message,
    });
  }
});

app.post("/api/results/publish", async (req, res) => {
  try {
    const { department, semester, subject } = req.body;
    const filter = {};
    if (department && department !== "All") filter.department = department;
    if (semester && semester !== "All") filter.semester = Number(semester);
    if (subject && subject !== "All") filter.subject = new RegExp(`^${subject.trim()}$`, "i");

    const updateRes = await Result.updateMany(filter, { $set: { published: true, updatedAt: new Date() } });
    res.json({
      message: "Results published successfully",
      matchedCount: updateRes.matchedCount,
      modifiedCount: updateRes.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to publish results", error: err.message });
  }
});

app.post("/api/results/unpublish", async (req, res) => {
  try {
    const { department, semester, subject } = req.body;
    const filter = {};
    if (department && department !== "All") filter.department = department;
    if (semester && semester !== "All") filter.semester = Number(semester);
    if (subject && subject !== "All") filter.subject = new RegExp(`^${subject.trim()}$`, "i");

    const updateRes = await Result.updateMany(filter, { $set: { published: false, updatedAt: new Date() } });
    res.json({
      message: "Results unpublished successfully",
      matchedCount: updateRes.matchedCount,
      modifiedCount: updateRes.modifiedCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to unpublish results", error: err.message });
  }
});

app.get("/api/results/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { all } = req.query;

    const filter = { studentId: studentId.trim() };
    if (!all || all === "false") {
      filter.published = { $ne: false };
    }

    const results = await Result.find(filter).sort({ subject: 1 });

    const enrichedResults = results.map((r) => {
      const obj = r.toObject();
      const pct = obj.percentage !== undefined ? obj.percentage : (obj.total || 0);
      obj.isWeak = pct < 60;
      return obj;
    });

    res.json({
      studentId,
      total: enrichedResults.length,
      weakSubjectsCount: enrichedResults.filter((r) => r.isWeak).length,
      results: enrichedResults,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch student results",
      error: error.message,
    });
  }
});

// -------------------------
// Full Student Comprehensive Academic Report (Requirement 9, 14, 16)
// -------------------------
app.get("/api/reports/student/:studentId/full", async (req, res) => {
  try {
    const { studentId } = req.params;
    const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || "75");

    const user = await User.findOne({ studentId: studentId.trim() });
    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }

    const studentDept = user.department || "CSE (IoT)";
    const studentSem = user.semester || 5;

    // 1. Attendance Data
    const studentRecords = await Attendance.find({ studentId: studentId.trim() }).sort({ markedAt: -1 });
    const departmentSubjects = await Subject.find({ department: studentDept, semester: studentSem });
    const allSessions = await AttendanceSession.find();

    const subjectSet = new Set(departmentSubjects.map((s) => s.name));
    studentRecords.forEach((r) => subjectSet.add(r.subject));
    allSessions.forEach((s) => {
      if (s.department === studentDept || !s.department) subjectSet.add(s.subject);
    });

    const subjectList = Array.from(subjectSet).filter(Boolean);
    let totalHeld = 0;
    let totalAttended = 0;
    const subjectAttendance = [];

    for (const sub of subjectList) {
      const sessionsHeldCount = await AttendanceSession.countDocuments({
        subject: sub,
        ...(studentDept ? { $or: [{ department: studentDept }, { department: { $exists: false } }] } : {}),
      });
      const attended = studentRecords.filter(
        (r) => r.subject.toLowerCase() === sub.toLowerCase() && r.status === "Present"
      ).length;
      const held = Math.max(sessionsHeldCount, attended);
      totalHeld += held;
      totalAttended += attended;

      const stats = calculateAttendanceStats(held, attended, threshold);
      subjectAttendance.push({
        subject: sub,
        classesHeld: stats.classesHeld,
        classesAttended: stats.classesAttended,
        percentage: stats.percentage,
        classesNeeded: stats.classesNeeded,
        classesCanMiss: stats.classesCanMiss,
        isEligible: stats.isEligible,
        status: stats.status,
      });
    }

    const overallAttendance = calculateAttendanceStats(totalHeld, totalAttended, threshold);

    // 2. Results Data
    const results = await Result.find({ studentId: studentId.trim(), published: { $ne: false } }).sort({ subject: 1 });
    let totalMarks = 0;
    let maxMarksTotal = 0;
    const weakSubjects = [];

    const enrichedResults = results.map((r) => {
      const obj = r.toObject();
      const pct = obj.percentage !== undefined ? obj.percentage : (obj.total || 0);
      obj.isWeak = pct < 60;
      totalMarks += obj.total || 0;
      maxMarksTotal += obj.maxMarks || 100;
      if (obj.isWeak) {
        weakSubjects.push({ subject: obj.subject, total: obj.total, percentage: pct, grade: obj.grade });
      }
      return obj;
    });

    const overallPercentage = maxMarksTotal > 0 ? Number(((totalMarks / maxMarksTotal) * 100).toFixed(1)) : 0;
    const sgpa = Number((overallPercentage / 10).toFixed(2));

    res.json({
      student: {
        id: user._id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        department: studentDept,
        semester: studentSem,
        rollNumber: user.rollNumber || user.studentId,
      },
      campusConfig: cachedCampusConfig,
      attendance: {
        threshold,
        overall: overallAttendance,
        subjects: subjectAttendance,
        lowAttendanceCount: subjectAttendance.filter((s) => !s.isEligible).length,
      },
      academics: {
        results: enrichedResults,
        totalSubjectsEvaluated: enrichedResults.length,
        overallPercentage,
        sgpa,
        weakSubjects,
        weakSubjectsCount: weakSubjects.length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate comprehensive report", error: err.message });
  }
});

app.get("/api/results/all", async (req, res) => {
  try {
    const { department, semester, subject } = req.query;
    const filter = {};
    if (department && department !== "All") filter.department = department;
    if (semester && semester !== "All") filter.semester = Number(semester);
    if (subject && subject !== "All") filter.subject = new RegExp(`^${subject.trim()}$`, "i");

    const results = await Result.find(filter).sort({ studentId: 1, subject: 1 });
    res.json({ count: results.length, results });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch results",
      error: error.message,
    });
  }
});

// -------------------------
// CSV / REPORT EXPORTS (Requirement 16)
// -------------------------
app.get("/api/reports/student/:studentId/csv", async (req, res) => {
  try {
    const { studentId } = req.params;
    const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || "75");

    const user = await User.findOne({ studentId: studentId.trim() });
    const records = await Attendance.find({ studentId: studentId.trim() });
    const sessions = await AttendanceSession.find();

    const subjectGroups = {};
    records.forEach((r) => {
      subjectGroups[r.subject] = (subjectGroups[r.subject] || 0) + (r.status === "Present" ? 1 : 0);
    });

    sessions.forEach((s) => {
      if (subjectGroups[s.subject] === undefined) {
        subjectGroups[s.subject] = 0;
      }
    });

    let csvContent = `Institution,Smart Campus System\n`;
    csvContent += `Student ID,${studentId}\n`;
    csvContent += `Student Name,${user?.name || "Student"}\n`;
    csvContent += `Department,${user?.department || "CSE (IoT)"}\n`;
    csvContent += `Semester,${user?.semester || 5}\n`;
    csvContent += `Report Generated,${new Date().toISOString()}\n\n`;
    csvContent += `Subject,Classes Held,Classes Attended,Attendance %,75% Requirement,Additional Classes Needed,Status\n`;

    for (const [sub, att] of Object.entries(subjectGroups)) {
      const held = Math.max(
        sessions.filter((s) => s.subject === sub).length,
        att
      );
      const stats = calculateAttendanceStats(held, att, threshold);
      csvContent += `"${sub}",${stats.classesHeld},${stats.classesAttended},${stats.percentage}%,${threshold}%,${stats.classesNeeded},"${stats.status}"\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_report_${studentId}.csv"`
    );
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate CSV", error: err.message });
  }
});

app.get("/api/reports/department/:department/csv", async (req, res) => {
  try {
    const { department } = req.params;
    const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || "75");

    const students = await User.find({
      role: "student",
      department: new RegExp(`^${department.trim()}$`, "i"),
    });

    let csvContent = `Institution,Smart Campus System\n`;
    csvContent += `Department,${department}\n`;
    csvContent += `Generated Date,${new Date().toISOString()}\n\n`;
    csvContent += `Student ID,Student Name,Roll Number,Total Held,Total Attended,Overall %,Status,Weak Subjects\n`;

    for (const st of students) {
      const records = await Attendance.find({
        studentId: st.studentId,
        status: "Present",
      });
      const sessions = await AttendanceSession.find({
        department: new RegExp(`^${department.trim()}$`, "i"),
      });

      const held = Math.max(sessions.length, records.length);
      const attended = records.length;
      const stats = calculateAttendanceStats(held, attended, threshold);

      csvContent += `"${st.studentId}","${st.name}","${st.rollNumber || st.studentId}",${stats.classesHeld},${stats.classesAttended},${stats.percentage}%,"${stats.status}",0\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="department_${department}_report.csv"`
    );
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate CSV", error: err.message });
  }
});

// -------------------------
// User Login
// -------------------------
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password and role are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.role !== role) {
      return res.status(401).json({
        message: "Incorrect role selected",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        semester: user.semester,
        assignedSubjects: user.assignedSubjects,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

// -------------------------
// User Registration
// -------------------------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, studentId, department, semester } =
      req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password and role are required",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      studentId: studentId ? studentId.trim() : "",
      department: department || "CSE (IoT)",
      semester: semester ? Number(semester) : 5,
    });

    res.json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        semester: user.semester,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Unable to create user",
      error: error.message,
    });
  }
});

// -------------------------
// Notices APIs
// -------------------------
app.post("/api/notices", async (req, res) => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Title and message are required",
      });
    }

    const notice = await Notice.create({
      title: title.trim(),
      message: message.trim(),
    });

    res.json({
      message: "Notice sent successfully",
      notice,
    });
  } catch (error) {
    console.error("Send notice error:", error);
    res.status(500).json({
      message: "Unable to send notice",
      error: error.message,
    });
  }
});

app.get("/api/notices", async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json({
      notices,
    });
  } catch (error) {
    console.error("Fetch notices error:", error);
    res.status(500).json({
      message: "Unable to fetch notices",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});