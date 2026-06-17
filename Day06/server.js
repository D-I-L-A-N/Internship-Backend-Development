const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const NodeCache = require("node-cache");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");

const app = express();
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60
});

const PORT = 5000;
const JWT_SECRET = "day06_secure_secret_key";

app.use(helmet());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    message: "Too many requests. Please try again later."
  }
});

app.use(limiter);

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

const db = new sqlite3.Database("./day06.db", (err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("SQLite database connected");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      filetype TEXT,
      filesize INTEGER,
      status TEXT DEFAULT 'processing',
      verification_code TEXT UNIQUE,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_documents_user_id
    ON documents(user_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_documents_status
    ON documents(status)
  `);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "image/png",
      "image/jpeg"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PDF, TXT, PNG and JPG files are allowed"));
    }

    cb(null, true);
  }
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Valid authorization token is required"
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

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only route"
    });
  }

  next();
}

function processDocumentInBackground(documentId) {
  setTimeout(() => {
    db.run(
      `UPDATE documents SET status = ? WHERE id = ?`,
      ["processed", documentId],
      (err) => {
        if (err) {
          console.error("Background processing failed:", err.message);
          return;
        }

        cache.del("analytics");
        console.log(`Document ${documentId} processed successfully`);
      }
    );
  }, 3000);
}

app.get("/", (req, res) => {
  res.send("Day 06 Secure Document Processing API is running");
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters"
      });
    }

    const assignedRole = role === "admin" ? "admin" : "user";
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, ?)`,
      [name, email.toLowerCase(), hashedPassword, assignedRole],
      function (err) {
        if (err) {
          return res.status(400).json({
            message: "Email already exists or invalid data"
          });
        }

        cache.del("analytics");

        res.status(201).json({
          message: "User registered successfully",
          user: {
            id: this.lastID,
            name,
            email: email.toLowerCase(),
            role: assignedRole
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      message: "Registration failed"
    });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email.toLowerCase()],
    async (err, user) => {
      if (err) {
        return res.status(500).json({
          message: "Login failed"
        });
      }

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({
          message: "Invalid password"
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.status(200).json({
        message: "Login successful",
        token,
        role: user.role
      });
    }
  );
});

app.post(
  "/api/documents",
  verifyToken,
  upload.single("document"),
  (req, res) => {
    const { title } = req.body;

    if (!title || !req.file) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        message: "Title and document file are required"
      });
    }

    const verificationCode =
      "DOC-" + Date.now() + "-" + Math.floor(Math.random() * 10000);

    db.run(
      `INSERT INTO documents
       (title, filename, original_name, filetype, filesize, status, verification_code, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        "processing",
        verificationCode,
        req.user.id
      ],
      function (err) {
        if (err) {
          fs.unlinkSync(req.file.path);

          return res.status(500).json({
            message: "Document upload failed"
          });
        }

        processDocumentInBackground(this.lastID);

        res.status(201).json({
          message: "Document uploaded and sent for background processing",
          document: {
            id: this.lastID,
            title,
            status: "processing",
            verificationCode,
            fileUrl: `/uploads/${req.file.filename}`
          }
        });
      }
    );
  }
);

app.get("/api/documents", verifyToken, (req, res) => {
  db.all(
    `SELECT id, title, original_name, filetype, filesize, status,
            verification_code, created_at
     FROM documents
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [req.user.id],
    (err, documents) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to retrieve documents"
        });
      }

      res.status(200).json({
        message: "Documents retrieved successfully",
        documents
      });
    }
  );
});

app.get("/api/documents/:id", verifyToken, (req, res) => {
  db.get(
    `SELECT id, title, original_name, filename, filetype, filesize,
            status, verification_code, created_at
     FROM documents
     WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user.id],
    (err, document) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to retrieve document"
        });
      }

      if (!document) {
        return res.status(404).json({
          message: "Document not found"
        });
      }

      res.status(200).json({
        message: "Document retrieved successfully",
        document
      });
    }
  );
});

app.get("/api/verify/:code", (req, res) => {
  db.get(
    `SELECT title, original_name, status, verification_code, created_at
     FROM documents
     WHERE verification_code = ?`,
    [req.params.code],
    (err, document) => {
      if (err) {
        return res.status(500).json({
          message: "Verification failed"
        });
      }

      if (!document) {
        return res.status(404).json({
          message: "Invalid verification code"
        });
      }

      res.status(200).json({
        message: "Document verification successful",
        valid: true,
        document
      });
    }
  );
});

app.delete("/api/documents/:id", verifyToken, (req, res) => {
  db.get(
    `SELECT * FROM documents WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user.id],
    (err, document) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to locate document"
        });
      }

      if (!document) {
        return res.status(404).json({
          message: "Document not found"
        });
      }

      const filePath = path.join(__dirname, "uploads", document.filename);

      db.run(
        `DELETE FROM documents WHERE id = ?`,
        [req.params.id],
        function (deleteErr) {
          if (deleteErr) {
            return res.status(500).json({
              message: "Document deletion failed"
            });
          }

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          cache.del("analytics");

          res.status(200).json({
            message: "Document deleted successfully"
          });
        }
      );
    }
  );
});

app.get("/api/analytics", verifyToken, adminOnly, (req, res) => {
  const cachedAnalytics = cache.get("analytics");

  if (cachedAnalytics) {
    return res.status(200).json({
      message: "Analytics retrieved from cache",
      source: "cache",
      analytics: cachedAnalytics
    });
  }

  const analytics = {};

  db.get(`SELECT COUNT(*) AS totalUsers FROM users`, [], (err, usersResult) => {
    if (err) {
      return res.status(500).json({
        message: "Analytics query failed"
      });
    }

    analytics.totalUsers = usersResult.totalUsers;

    db.get(
      `SELECT COUNT(*) AS totalDocuments,
              SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) AS processedDocuments,
              SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processingDocuments
       FROM documents`,
      [],
      (docsErr, documentsResult) => {
        if (docsErr) {
          return res.status(500).json({
            message: "Analytics query failed"
          });
        }

        analytics.totalDocuments = documentsResult.totalDocuments || 0;
        analytics.processedDocuments =
          documentsResult.processedDocuments || 0;
        analytics.processingDocuments =
          documentsResult.processingDocuments || 0;

        cache.set("analytics", analytics);

        res.status(200).json({
          message: "Analytics retrieved from database",
          source: "database",
          analytics
        });
      }
    );
  });
});

app.get("/api/admin/documents", verifyToken, adminOnly, (req, res) => {
  db.all(
    `SELECT documents.id, documents.title, documents.status,
            documents.filetype, documents.filesize,
            documents.verification_code, documents.created_at,
            users.name AS owner_name, users.email AS owner_email
     FROM documents
     INNER JOIN users ON documents.user_id = users.id
     ORDER BY documents.created_at DESC`,
    [],
    (err, documents) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to retrieve admin document report"
        });
      }

      res.status(200).json({
        message: "Admin document report retrieved successfully",
        documents
      });
    }
  );
});

app.use((err, req, res, next) => {
  console.error("Application error:", err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message
    });
  }

  res.status(400).json({
    message: err.message || "Unexpected request error"
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});