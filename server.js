const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const PORT = 5000;
const JWT_SECRET = "day03_secret_key";

// Database connection
const db = new sqlite3.Database("./users.db", (err) => {
  if (err) {
    console.error("Database connection failed");
  } else {
    console.log("SQLite database connected");
  }
});

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

// Home route
app.get("/", (req, res) => {
  res.send("Day 03 Backend Authentication API is running");
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

// Middleware to verify token
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

// Protected profile route
app.get("/api/auth/profile", verifyToken, (req, res) => {
  const query = `SELECT id, name, email FROM users WHERE id = ?`;

  db.get(query, [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({
        message: "Server error"
      });
    }

    res.status(200).json({
      message: "Protected profile accessed successfully",
      user: user
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});