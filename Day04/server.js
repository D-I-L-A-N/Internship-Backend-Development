const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(express.json());
app.use("/uploads", express.static("uploads"));

const PORT = 5000;
const JWT_SECRET = "day04_secret_key";

// Database connection
const db = new sqlite3.Database("./day04.db", (err) => {
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
    password TEXT NOT NULL
  )
`);

// Notes table
db.run(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    filename TEXT,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
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
  res.send("Day 04 Backend File Upload API is running");
});

// Register API
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password are required"
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

  db.run(query, [name, email, hashedPassword], function (err) {
    if (err) {
      return res.status(400).json({
        message: "Email already exists or invalid data"
      });
    }

    res.status(201).json({
      message: "User registered successfully",
      userId: this.lastID
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
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token: token
    });
  });
});

// Middleware for token checking
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

// Create note with file upload
app.post("/api/notes", verifyToken, upload.single("file"), (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      message: "Title and description are required"
    });
  }

  const filename = req.file ? req.file.filename : null;

  const query = `
    INSERT INTO notes (title, description, filename, user_id)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [title, description, filename, req.user.id], function (err) {
    if (err) {
      return res.status(500).json({
        message: "Failed to create note"
      });
    }

    res.status(201).json({
      message: "Note created successfully",
      note: {
        id: this.lastID,
        title,
        description,
        file: filename ? `/uploads/${filename}` : null
      }
    });
  });
});

// Get logged-in user notes
app.get("/api/notes", verifyToken, (req, res) => {
  const query = `SELECT * FROM notes WHERE user_id = ?`;

  db.all(query, [req.user.id], (err, notes) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to fetch notes"
      });
    }

    res.status(200).json({
      message: "Notes fetched successfully",
      notes: notes
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});