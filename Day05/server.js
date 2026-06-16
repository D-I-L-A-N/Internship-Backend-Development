const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use("/uploads", express.static("uploads"));

const PORT = 5000;
const JWT_SECRET = "day05_secret_key";

// Simple request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Database connection
const db = new sqlite3.Database("./day05.db", (err) => {
  if (err) {
    console.error("Database connection failed");
  } else {
    console.log("SQLite database connected");
  }
});

// Users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )
`);

// Documents table
db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    filetype TEXT,
    filesize INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

// Certificates table
db.run(`
  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    course_name TEXT NOT NULL,
    certificate_id TEXT UNIQUE NOT NULL,
    issued_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(issued_by) REFERENCES users(id)
  )
`);

// File upload setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// Home route
app.get("/", (req, res) => {
  res.send("Day 05 Backend Document Upload, Certificate & Analytics API is running");
});

// Register API
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required"
    });
  }

  const allowedRole = role === "admin" ? "admin" : "user";
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [name, email, hashedPassword, allowedRole], function (err) {
    if (err) {
      return res.status(400).json({
        message: "Email already exists or invalid data"
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: this.lastID,
      role: allowedRole
    });
  });
});

// Login API
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  const query = `SELECT * FROM users WHERE email = ?`;

  db.get(query, [email], async (err, user) => {
    if (err) {
      return res.status(500).json({
        message: "Server error"
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password"
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token: token,
      role: user.role
    });
  });
});

// Authentication middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({
      message: "Token is required"
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    req.user = decoded;
    next();
  });
}

// Role-based access middleware
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only route"
    });
  }

  next();
}

// Upload document
app.post("/api/documents", verifyToken, upload.single("document"), (req, res) => {
  const { title } = req.body;

  if (!title || !req.file) {
    return res.status(400).json({
      message: "Title and document file are required"
    });
  }

  const query = `
    INSERT INTO documents (title, filename, filetype, filesize, user_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [title, req.file.filename, req.file.mimetype, req.file.size, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "Failed to upload document"
        });
      }

      res.status(201).json({
        message: "Document uploaded successfully",
        document: {
          id: this.lastID,
          title,
          file: `/uploads/${req.file.filename}`,
          filetype: req.file.mimetype,
          filesize: req.file.size
        }
      });
    }
  );
});

// Get user's documents
app.get("/api/documents", verifyToken, (req, res) => {
  const query = `
    SELECT id, title, filename, filetype, filesize, created_at
    FROM documents
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.all(query, [req.user.id], (err, documents) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to fetch documents"
      });
    }

    res.status(200).json({
      message: "Documents fetched successfully",
      documents
    });
  });
});

// Get single document
app.get("/api/documents/:id", verifyToken, (req, res) => {
  const query = `
    SELECT id, title, filename, filetype, filesize, created_at
    FROM documents
    WHERE id = ? AND user_id = ?
  `;

  db.get(query, [req.params.id, req.user.id], (err, document) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to fetch document"
      });
    }

    if (!document) {
      return res.status(404).json({
        message: "Document not found"
      });
    }

    res.status(200).json({
      message: "Document fetched successfully",
      document
    });
  });
});

// Delete document
app.delete("/api/documents/:id", verifyToken, (req, res) => {
  const selectQuery = `
    SELECT * FROM documents
    WHERE id = ? AND user_id = ?
  `;

  db.get(selectQuery, [req.params.id, req.user.id], (err, document) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to find document"
      });
    }

    if (!document) {
      return res.status(404).json({
        message: "Document not found"
      });
    }

    const filePath = path.join(__dirname, "uploads", document.filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.run(`DELETE FROM documents WHERE id = ?`, [req.params.id], function (deleteErr) {
      if (deleteErr) {
        return res.status(500).json({
          message: "Failed to delete document"
        });
      }

      res.status(200).json({
        message: "Document deleted successfully"
      });
    });
  });
});

// Certificate generation API - admin only
app.post("/api/certificates", verifyToken, adminOnly, (req, res) => {
  const { studentName, courseName } = req.body;

  if (!studentName || !courseName) {
    return res.status(400).json({
      message: "Student name and course name are required"
    });
  }

  const certificateId = "CERT-" + Date.now();

  const query = `
    INSERT INTO certificates (student_name, course_name, certificate_id, issued_by)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [studentName, courseName, certificateId, req.user.id], function (err) {
    if (err) {
      return res.status(500).json({
        message: "Failed to generate certificate"
      });
    }

    res.status(201).json({
      message: "Certificate generated successfully",
      certificate: {
        id: this.lastID,
        studentName,
        courseName,
        certificateId
      }
    });
  });
});

// Analytics API - admin only
app.get("/api/analytics", verifyToken, adminOnly, (req, res) => {
  const analytics = {};

  db.get(`SELECT COUNT(*) AS totalUsers FROM users`, [], (err, usersResult) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch analytics" });
    }

    analytics.totalUsers = usersResult.totalUsers;

    db.get(`SELECT COUNT(*) AS totalDocuments FROM documents`, [], (err2, docsResult) => {
      if (err2) {
        return res.status(500).json({ message: "Failed to fetch analytics" });
      }

      analytics.totalDocuments = docsResult.totalDocuments;

      db.get(`SELECT COUNT(*) AS totalCertificates FROM certificates`, [], (err3, certResult) => {
        if (err3) {
          return res.status(500).json({ message: "Failed to fetch analytics" });
        }

        analytics.totalCertificates = certResult.totalCertificates;

        res.status(200).json({
          message: "Analytics fetched successfully",
          analytics
        });
      });
    });
  });
});

// Admin-only users list
app.get("/api/admin/users", verifyToken, adminOnly, (req, res) => {
  const query = `
    SELECT id, name, email, role
    FROM users
    ORDER BY id DESC
  `;

  db.all(query, [], (err, users) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to fetch users"
      });
    }

    res.status(200).json({
      message: "Users fetched successfully",
      users
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});