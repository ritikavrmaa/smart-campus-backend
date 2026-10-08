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
async function seedDefaultData() {
  try {
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
        assignedSubjects: ["Operating Systems", "Computer Networks", "IoT Systems"],
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
            },
          }
        );
      }
    }

    // 2. Ensure standard subjects exist across departments
    const defaultSubjects = [
      { name: "Operating Systems", code: "BCS501", department: "CSE (IoT)", semester: 5 },
      { name: "Computer Networks", code: "BCS502", department: "CSE (IoT)", semester: 5 },
      { name: "Database Management Systems", code: "BCS503", department: "CSE (IoT)", semester: 5 },
      { name: "Design and Analysis of Algorithms", code: "BCS504", department: "CSE (IoT)", semester: 5 },
      { name: "IoT Architecture & Protocols", code: "BIO505", department: "CSE (IoT)", semester: 5 },
      { name: "Data Structures & Algorithms", code: "BCS301", department: "CSE", semester: 3 },
      { name: "Software Engineering", code: "BCS502", department: "CSE", semester: 5 },
      { name: "Machine Learning", code: "BAI501", department: "AI/ML", semester: 5 },
      { name: "Deep Learning & Neural Networks", code: "BAI502", department: "AI/ML", semester: 5 },
      { name: "Digital Signal Processing", code: "BEC501", department: "ECE", semester: 5 },
      { name: "Microcontrollers & Embedded Systems", code: "BEC502", department: "ECE", semester: 5 },
    ];

    for (const s of defaultSubjects) {
      const exists = await Subject.findOne({ name: s.name, department: s.department });
      if (!exists) {
        await Subject.create(s);
      }
    }

    // 3. Ensure sample results exist for Student 1 so "My Results" is immediately populated
    const sampleResults = [
      {
        studentId: "1CD23IC001",
        studentName: "Student 1",
        department: "CSE (IoT)",
        semester: 5,
        subject: "Operating Systems",
        internalMarks: 26,
        assignmentMarks: 18,
        labMarks: 23,
        midtermMarks: 24,
        endSemMarks: 0,
        remarks: "Good academic standing",
      },
      {
        studentId: "1CD23IC001",
        studentName: "Student 1",
        department: "CSE (IoT)",
        semester: 5,
        subject: "Computer Networks",
        internalMarks: 22,
        assignmentMarks: 15,
        labMarks: 20,
        midtermMarks: 21,
        endSemMarks: 0,
        remarks: "Needs improvement in lab practice",
      },
      {
        studentId: "1CD23IC001",
        studentName: "Student 1",
        department: "CSE (IoT)",
        semester: 5,
        subject: "Database Management Systems",
        internalMarks: 28,
        assignmentMarks: 19,
        labMarks: 25,
        midtermMarks: 27,
        endSemMarks: 0,
        remarks: "Excellent performance",
      },
    ];

    for (const r of sampleResults) {
      const resExists = await Result.findOne({ studentId: r.studentId, subject: r.subject });
      if (!resExists) {
        const doc = new Result(r);
        await doc.save();
      }
    }

    console.log("Default seed data initialized");
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
  const campusLat = parseFloat(process.env.CAMPUS_LATITUDE);
  const campusLon = parseFloat(process.env.CAMPUS_LONGITUDE);
  const campusRadius = parseFloat(process.env.CAMPUS_RADIUS_METERS || "150");
  const maxAccuracy = parseFloat(
    process.env.MAX_GPS_ACCURACY_METERS ||
      process.env.CAMPUS_MAX_ACCURACY ||
      "100"
  );

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
// Helper: 75% Attendance Mathematical Calculation
// -------------------------
function calculateAttendanceStats(held, attended, threshold = 75) {
  const actualHeld = Math.max(Number(held) || 0, Number(attended) || 0);
  const actualAttended = Math.max(Number(attended) || 0, 0);

  const percentage =
    actualHeld > 0
      ? Number(((actualAttended / actualHeld) * 100).toFixed(1))
      : 0;

  let classesNeeded = 0;
  let status = "75% requirement met";
  let isLow = false;

  // Formula:
  // (attended + x) / (held + x) >= threshold / 100
  // 100 * attended + 100 * x >= threshold * held + threshold * x
  // (100 - threshold) * x >= threshold * held - 100 * attended
  // x >= (threshold * held - 100 * attended) / (100 - threshold)
  if (percentage < threshold) {
    isLow = true;
    status = "Low Attendance";
    const numerator = threshold * actualHeld - 100 * actualAttended;
    const denominator = 100 - threshold;
    classesNeeded = Math.max(0, Math.ceil(numerator / denominator));
  }

  return {
    classesHeld: actualHeld,
    classesAttended: actualAttended,
    percentage,
    classesNeeded,
    status: isLow ? "Low Attendance" : "75% requirement met",
    isLow,
    message: isLow
      ? `You need to attend ${classesNeeded} more classes to reach ${threshold}%.`
      : "75% requirement met",
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

app.get("/api/campus-config", (req, res) => {
  res.json({
    latitude: parseFloat(process.env.CAMPUS_LATITUDE || "13.0108"),
    longitude: parseFloat(process.env.CAMPUS_LONGITUDE || "77.7012"),
    radiusMeters: parseFloat(process.env.CAMPUS_RADIUS_METERS || "150"),
    maxAccuracyMeters: parseFloat(process.env.CAMPUS_MAX_ACCURACY || "100"),
    attendanceThreshold: parseFloat(process.env.ATTENDANCE_THRESHOLD || "75"),
  });
});

// -------------------------
// DEPARTMENTS & SUBJECTS APIs
// -------------------------
const SUPPORTED_DEPARTMENTS = ["CSE", "CSE (IoT)", "AI/ML", "ECE"];

app.get("/api/departments", async (req, res) => {
  try {
    const customDepts = await Subject.distinct("department");
    const merged = Array.from(new Set([...SUPPORTED_DEPARTMENTS, ...customDepts])).filter(Boolean);
    res.json({ departments: merged });
  } catch (err) {
    res.json({ departments: SUPPORTED_DEPARTMENTS });
  }
});

app.get("/api/subjects", async (req, res) => {
  try {
    const { department, semester } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = Number(semester);

    const subjects = await Subject.find(filter).sort({ name: 1 });
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch subjects", error: err.message });
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
      "http://localhost:5001",
    ].filter(Boolean);

    const aiUrls = Array.from(new Set(candidateUrls));

    let lastError = null;
    for (const baseUrl of aiUrls) {
      try {
        const targetUrl = `${baseUrl.replace(/\/$/, "")}/count-people`;
        console.log(`Forwarding headcount request to AI service: ${targetUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const aiRes = await fetch(targetUrl, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

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

app.get("/api/results/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const results = await Result.find({
      studentId: studentId.trim(),
    }).sort({ subject: 1 });

    res.json({
      studentId,
      total: results.length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch student results",
      error: error.message,
    });
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