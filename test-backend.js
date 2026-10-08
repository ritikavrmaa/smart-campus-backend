const http = require("http");

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const request = http.request(
      {
        hostname: "localhost",
        port: 5000,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (d) => (chunks += d));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch {
            resolve({ status: res.statusCode, raw: chunks });
          }
        });
      }
    );
    request.on("error", reject);
    if (data) request.write(data);
    request.end();
  });
}

async function test() {
  console.log("--- 1. Login Tests ---");
  const stuLogin = await req("POST", "/api/auth/login", {
    email: "student@test.com",
    password: "Student@123",
    role: "student",
  });
  console.log(
    "Student login status:",
    stuLogin.status,
    stuLogin.body.user?.name
  );

  const facLogin = await req("POST", "/api/auth/login", {
    email: "faculty@test.com",
    password: "Faculty@123",
    role: "faculty",
  });
  console.log(
    "Faculty login status:",
    facLogin.status,
    facLogin.body.user?.name
  );

  const admLogin = await req("POST", "/api/auth/login", {
    email: "admin@test.com",
    password: "Admin@123",
    role: "admin",
  });
  console.log(
    "Admin login status:",
    admLogin.status,
    admLogin.body.user?.name
  );

  console.log("\n--- 2. Create Session ---");
  const testCode = String(Math.floor(100000 + Math.random() * 900000));
  const testSessionId = "TestSess-" + Date.now();
  const sess = await req("POST", "/api/session/create", {
    subject: "Operating Systems",
    sessionId: testSessionId,
    sessionCode: testCode,
    department: "CSE (IoT)",
    semester: 5,
  });
  console.log(
    "Session create status:",
    sess.status,
    sess.body.session?.sessionCode
  );

  console.log("\n--- 3. GPS Geofencing Tests ---");
  // Outside campus test (Bangalore South, far from campus)
  const outsideGPS = await req("POST", "/api/attendance/code", {
    studentId: "1CD23IC001",
    studentName: "Student 1",
    sessionCode: testCode,
    latitude: 12.91,
    longitude: 77.5,
    accuracy: 10,
  });
  console.log(
    "Outside campus rejected (403):",
    outsideGPS.status === 403,
    outsideGPS.body.message
  );

  // Poor accuracy test
  const poorAcc = await req("POST", "/api/attendance/code", {
    studentId: "1CD23IC001",
    studentName: "Student 1",
    sessionCode: testCode,
    latitude: 13.0108,
    longitude: 77.7012,
    accuracy: 350,
  });
  console.log(
    "Poor accuracy rejected (403):",
    poorAcc.status === 403,
    poorAcc.body.message
  );

  // Inside campus test
  const insideGPS = await req("POST", "/api/attendance/code", {
    studentId: "1CD23IC001",
    studentName: "Student 1",
    sessionCode: testCode,
    latitude: 13.0108,
    longitude: 77.7012,
    accuracy: 15,
  });
  console.log(
    "Inside campus accepted:",
    insideGPS.status === 200,
    insideGPS.body.message
  );

  // Duplicate test
  const dupGPS = await req("POST", "/api/attendance/code", {
    studentId: "1CD23IC001",
    studentName: "Student 1",
    sessionCode: testCode,
    latitude: 13.0108,
    longitude: 77.7012,
    accuracy: 15,
  });
  console.log(
    "Duplicate rejected:",
    dupGPS.status === 400,
    dupGPS.body.message
  );

  console.log("\n--- 4. AI Headcount Verification Recording ---");
  const verify = await req("POST", "/api/attendance/verify-session", {
    sessionCode: testCode,
    aiHeadCount: 1,
    qrCount: 1,
    verified: true,
  });
  console.log(
    "AI verification record status:",
    verify.status,
    verify.body.status
  );

  console.log("\n--- 5. Student Attendance Report (75% Math) ---");
  const report = await req(
    "GET",
    "/api/attendance/student/1CD23IC001/report"
  );
  console.log(
    "Report overall %:",
    report.body.overall?.percentage + "%",
    "Status:",
    report.body.overall?.status
  );
  console.log(
    "Subjects summary:",
    report.body.subjects?.map(
      (s) =>
        s.subject +
        ": " +
        s.classesAttended +
        "/" +
        s.classesHeld +
        " (" +
        s.percentage +
        "%) Needed: " +
        s.classesNeeded
    )
  );

  console.log("\n--- 6. Student Academic Results ---");
  const results = await req("GET", "/api/results/student/1CD23IC001");
  console.log("Results count:", results.body.results?.length);
  console.log(
    "Sample result:",
    results.body.results?.[0]?.subject,
    "Total:",
    results.body.results?.[0]?.total,
    "Grade:",
    results.body.results?.[0]?.grade
  );

  console.log("\n--- 7. Admin Summary ---");
  const adminSummary = await req(
    "GET",
    encodeURI("/api/attendance/admin/summary?department=CSE (IoT)")
  );
  console.log("Admin records found:", adminSummary.body.records?.length);

  console.log("\n--- 8. CSV Report Test ---");
  const csvRes = await req(
    "GET",
    encodeURI("/api/reports/student/1CD23IC001/csv")
  );
  console.log(
    "CSV Status:",
    csvRes.status,
    "Lines:",
    csvRes.raw ? csvRes.raw.split("\n").length : 0
  );
}

test().catch(console.error);
