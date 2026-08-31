const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AttendanceSession = require("./models/AttendanceSession");
const Attendance = require("./models/Attendance");
const User = require("./models/User");
const Notice = require("./models/Notice");
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// -------------------------
// MongoDB connection
// -------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

// -------------------------
// Test route
// -------------------------
app.get("/", (req, res) => {
  res.json({
    message: "Smart Campus Backend is running",
  });
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
    } = req.body;

    if (!subject || !sessionId || !sessionCode) {
      return res.status(400).json({
        message: "Missing session details",
      });
    }

    const existingSession =
      await AttendanceSession.findOne({
        sessionId,
      });

    if (existingSession) {
      return res.status(400).json({
        message: "Session already exists",
      });
    }

    const session =
      await AttendanceSession.create({
        subject,
        sessionId,
        sessionCode,
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
// Student marks using code
// -------------------------
app.post("/api/attendance/code", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      sessionCode,
    } = req.body;

    if (!studentId || !sessionCode) {
      return res.status(400).json({
        message:
          "Student ID and session code are required",
      });
    }

    const session =
      await AttendanceSession.findOne({
        sessionCode,
        active: true,
      });

    if (!session) {
      return res.status(404).json({
        message:
          "Invalid or inactive session code",
      });
    }

    const duplicate =
      await Attendance.findOne({
        studentId,
        sessionId: session.sessionId,
      });

    if (duplicate) {
      return res.status(400).json({
        message:
          "Attendance already marked",
      });
    }

    const record =
      await Attendance.create({
        studentId,
        studentName,
        subject: session.subject,
        sessionId: session.sessionId,
        sessionCode: session.sessionCode,
      });

    const headCount =
      await Attendance.countDocuments({
        sessionId: session.sessionId,
      });

    res.json({
      message:
        "Attendance marked successfully",
      subject: session.subject,
      headCount,
      record,
    });

  } catch (error) {
    res.status(500).json({
      message:
        "Unable to mark attendance",
      error: error.message,
    });
  }
});

// -------------------------
// Student marks using QR
// -------------------------
app.post("/api/attendance/mark", async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      sessionId,
      subject,
    } = req.body;

    if (!studentId || !sessionId || !subject) {
      return res.status(400).json({
        message:
          "Missing attendance details",
      });
    }

    const session =
      await AttendanceSession.findOne({
        sessionId,
        active: true,
      });

    if (!session) {
      return res.status(404).json({
        message:
          "Invalid or inactive attendance session",
      });
    }

    const duplicate =
      await Attendance.findOne({
        studentId,
        sessionId,
      });

    if (duplicate) {
      return res.status(400).json({
        message:
          "Attendance already marked",
      });
    }

    const record =
      await Attendance.create({
        studentId,
        studentName,
        sessionId,
        subject,
        sessionCode:
          session.sessionCode,
      });

    const headCount =
      await Attendance.countDocuments({
        sessionId,
      });

    res.json({
      message:
        "Attendance marked successfully",
      headCount,
      record,
    });

  } catch (error) {
    res.status(500).json({
      message:
        "Unable to mark attendance",
      error: error.message,
    });
  }
});

// -------------------------
// Faculty gets count by code
// -------------------------
app.get(
  "/api/attendance/count-by-code/:sessionCode",
  async (req, res) => {
    try {
      const sessionCode =
        req.params.sessionCode.trim();

      console.log(
        "Looking for session code:",
        sessionCode
      );

      const session =
        await AttendanceSession.findOne({
          sessionCode: sessionCode,
        });

      if (!session) {
        return res.status(404).json({
          message: "Session not found",
        });
      }

      const students =
        await Attendance.find({
          sessionId: session.sessionId,
        }).sort({
          markedAt: 1,
        });

      console.log(
        "Students found:",
        students.length
      );

      res.json({
        subject: session.subject,
        sessionCode: session.sessionCode,
        headCount: students.length,
        students: students,
      });

    } catch (error) {
      console.error(
        "Attendance count error:",
        error
      );

      res.status(500).json({
        message: "Unable to fetch attendance",
        error: error.message,
      });
    }
  }
);
// -------------------------
// Faculty gets count by ID
// -------------------------
app.get(
  "/api/attendance/count/:sessionId",
  async (req, res) => {
    try {
      const { sessionId } =
        req.params;

      const students =
        await Attendance.find({
          sessionId,
        }).sort({
          markedAt: 1,
        });

      res.json({
        headCount: students.length,
        students,
      });

    } catch (error) {
      res.status(500).json({
        message:
          "Unable to fetch attendance",
        error: error.message,
      });
    }
  }
);


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

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
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
      },
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});
app.get(
  "/api/attendance/student/:studentId",
  async (req, res) => {
    try {
      const { studentId } = req.params;

      const attendance = await Attendance.find({
        studentId: studentId,
      }).sort({
        markedAt: -1,
      });

      res.json({
        attendance: attendance,
      });

    } catch (error) {
      console.log("Student attendance error:", error);

      res.status(500).json({
        message: "Unable to fetch attendance",
        error: error.message,
      });
    }
  }
);


app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, studentId } = req.body;

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
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      studentId: studentId || "",
    });

    res.json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
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
// Faculty sends notice
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

// -------------------------
// Student gets notices
// -------------------------
app.get("/api/notices", async (req, res) => {
  try {
    const notices = await Notice.find()
      .sort({ createdAt: -1 });

    res.json({
      notices,
    });

  } catch (error) {
    console.error(
      "Fetch notices error:",
      error
    );

    res.status(500).json({
      message: "Unable to fetch notices",
      error: error.message,
    });
  }
});
const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Server running at http://localhost:${PORT}`
    );
  }
);