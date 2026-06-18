const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");

const app = express();
const cache = new NodeCache({ stdTTL: 300 });

const PORT = 5000;
const JWT_SECRET = "day07_final_project_secret";

app.use(helmet());
app.use(express.json());

// API rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: {
    message: "Too many requests. Please try again later."
  }
});

app.use(limiter);

// Request logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

// SQLite database connection
const db = new sqlite3.Database("./day07.db", (error) => {
  if (error) {
    console.error("Database connection failed:", error.message);
  } else {
    console.log("SQLite database connected");
  }
});

// Create database tables
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
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      project_id INTEGER NOT NULL,
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(assigned_to) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_projects_owner
    ON projects(owner_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tasks_project
    ON tasks(project_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON tasks(status)
  `);
});

// JWT authentication middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization token is required"
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    req.user = decoded;
    next();
  });
}

// Admin authorization middleware
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only route"
    });
  }

  next();
}

// Home route
app.get("/", (req, res) => {
  res.send("Day 07 Final Project Management Backend API is running");
});

// Register user
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

    const normalizedEmail = email.toLowerCase().trim();
    const assignedRole = role === "admin" ? "admin" : "user";
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), normalizedEmail, hashedPassword, assignedRole],
      function (error) {
        if (error) {
          return res.status(400).json({
            message: "Email already exists or registration data is invalid"
          });
        }

        cache.del("analytics");

        res.status(201).json({
          message: "User registered successfully",
          user: {
            id: this.lastID,
            name: name.trim(),
            email: normalizedEmail,
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

// Login user
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email.toLowerCase().trim()],
    async (error, user) => {
      if (error) {
        return res.status(500).json({
          message: "Login failed"
        });
      }

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      const passwordValid = await bcrypt.compare(password, user.password);

      if (!passwordValid) {
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

// Get profile
app.get("/api/profile", verifyToken, (req, res) => {
  db.get(
    `SELECT id, name, email, role, created_at
     FROM users
     WHERE id = ?`,
    [req.user.id],
    (error, user) => {
      if (error) {
        return res.status(500).json({
          message: "Failed to fetch profile"
        });
      }

      res.status(200).json({
        message: "Profile fetched successfully",
        user
      });
    }
  );
});

// Create project
app.post("/api/projects", verifyToken, (req, res) => {
  const { title, description, status } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      message: "Project title and description are required"
    });
  }

  const allowedStatuses = ["planned", "active", "completed"];
  const projectStatus = allowedStatuses.includes(status)
    ? status
    : "planned";

  db.run(
    `INSERT INTO projects (title, description, status, owner_id)
     VALUES (?, ?, ?, ?)`,
    [title.trim(), description.trim(), projectStatus, req.user.id],
    function (error) {
      if (error) {
        return res.status(500).json({
          message: "Failed to create project"
        });
      }

      cache.del("analytics");

      res.status(201).json({
        message: "Project created successfully",
        project: {
          id: this.lastID,
          title,
          description,
          status: projectStatus
        }
      });
    }
  );
});

// Get user's projects
app.get("/api/projects", verifyToken, (req, res) => {
  db.all(
    `SELECT id, title, description, status, created_at, updated_at
     FROM projects
     WHERE owner_id = ?
     ORDER BY created_at DESC`,
    [req.user.id],
    (error, projects) => {
      if (error) {
        return res.status(500).json({
          message: "Failed to fetch projects"
        });
      }

      res.status(200).json({
        message: "Projects fetched successfully",
        projects
      });
    }
  );
});

// Get one project
app.get("/api/projects/:id", verifyToken, (req, res) => {
  db.get(
    `SELECT id, title, description, status, created_at, updated_at
     FROM projects
     WHERE id = ? AND owner_id = ?`,
    [req.params.id, req.user.id],
    (error, project) => {
      if (error) {
        return res.status(500).json({
          message: "Failed to fetch project"
        });
      }

      if (!project) {
        return res.status(404).json({
          message: "Project not found"
        });
      }

      res.status(200).json({
        message: "Project fetched successfully",
        project
      });
    }
  );
});

// Update project
app.put("/api/projects/:id", verifyToken, (req, res) => {
  const { title, description, status } = req.body;

  const allowedStatuses = ["planned", "active", "completed"];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid project status"
    });
  }

  db.get(
    `SELECT * FROM projects WHERE id = ? AND owner_id = ?`,
    [req.params.id, req.user.id],
    (findError, project) => {
      if (findError) {
        return res.status(500).json({
          message: "Failed to locate project"
        });
      }

      if (!project) {
        return res.status(404).json({
          message: "Project not found"
        });
      }

      const updatedTitle = title || project.title;
      const updatedDescription = description || project.description;
      const updatedStatus = status || project.status;

      db.run(
        `UPDATE projects
         SET title = ?, description = ?, status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND owner_id = ?`,
        [
          updatedTitle,
          updatedDescription,
          updatedStatus,
          req.params.id,
          req.user.id
        ],
        function (updateError) {
          if (updateError) {
            return res.status(500).json({
              message: "Failed to update project"
            });
          }

          cache.del("analytics");

          res.status(200).json({
            message: "Project updated successfully"
          });
        }
      );
    }
  );
});

// Delete project
app.delete("/api/projects/:id", verifyToken, (req, res) => {
  db.get(
    `SELECT * FROM projects WHERE id = ? AND owner_id = ?`,
    [req.params.id, req.user.id],
    (findError, project) => {
      if (findError) {
        return res.status(500).json({
          message: "Failed to locate project"
        });
      }

      if (!project) {
        return res.status(404).json({
          message: "Project not found"
        });
      }

      db.run(
        `DELETE FROM tasks WHERE project_id = ?`,
        [req.params.id],
        (taskDeleteError) => {
          if (taskDeleteError) {
            return res.status(500).json({
              message: "Failed to delete project tasks"
            });
          }

          db.run(
            `DELETE FROM projects WHERE id = ? AND owner_id = ?`,
            [req.params.id, req.user.id],
            function (projectDeleteError) {
              if (projectDeleteError) {
                return res.status(500).json({
                  message: "Failed to delete project"
                });
              }

              cache.del("analytics");

              res.status(200).json({
                message: "Project and related tasks deleted successfully"
              });
            }
          );
        }
      );
    }
  );
});

// Create task
app.post("/api/projects/:projectId/tasks", verifyToken, (req, res) => {
  const { title, description, priority, assignedTo } = req.body;

  if (!title) {
    return res.status(400).json({
      message: "Task title is required"
    });
  }

  const allowedPriorities = ["low", "medium", "high"];
  const taskPriority = allowedPriorities.includes(priority)
    ? priority
    : "medium";

  db.get(
    `SELECT * FROM projects WHERE id = ? AND owner_id = ?`,
    [req.params.projectId, req.user.id],
    (projectError, project) => {
      if (projectError) {
        return res.status(500).json({
          message: "Failed to verify project"
        });
      }

      if (!project) {
        return res.status(404).json({
          message: "Project not found"
        });
      }

      db.run(
        `INSERT INTO tasks
         (title, description, priority, project_id, assigned_to)
         VALUES (?, ?, ?, ?, ?)`,
        [
          title.trim(),
          description || "",
          taskPriority,
          req.params.projectId,
          assignedTo || req.user.id
        ],
        function (error) {
          if (error) {
            return res.status(500).json({
              message: "Failed to create task"
            });
          }

          cache.del("analytics");

          res.status(201).json({
            message: "Task created successfully",
            task: {
              id: this.lastID,
              title,
              description: description || "",
              status: "pending",
              priority: taskPriority
            }
          });
        }
      );
    }
  );
});

// Get project tasks
app.get("/api/projects/:projectId/tasks", verifyToken, (req, res) => {
  db.get(
    `SELECT * FROM projects WHERE id = ? AND owner_id = ?`,
    [req.params.projectId, req.user.id],
    (projectError, project) => {
      if (projectError) {
        return res.status(500).json({
          message: "Failed to verify project"
        });
      }

      if (!project) {
        return res.status(404).json({
          message: "Project not found"
        });
      }

      db.all(
        `SELECT id, title, description, status, priority,
                assigned_to, created_at, updated_at
         FROM tasks
         WHERE project_id = ?
         ORDER BY created_at DESC`,
        [req.params.projectId],
        (error, tasks) => {
          if (error) {
            return res.status(500).json({
              message: "Failed to fetch tasks"
            });
          }

          res.status(200).json({
            message: "Tasks fetched successfully",
            tasks
          });
        }
      );
    }
  );
});

// Update task
app.put("/api/tasks/:id", verifyToken, (req, res) => {
  const { title, description, status, priority } = req.body;

  const allowedStatuses = ["pending", "in-progress", "completed"];
  const allowedPriorities = ["low", "medium", "high"];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid task status"
    });
  }

  if (priority && !allowedPriorities.includes(priority)) {
    return res.status(400).json({
      message: "Invalid task priority"
    });
  }

  db.get(
    `SELECT tasks.*
     FROM tasks
     INNER JOIN projects ON tasks.project_id = projects.id
     WHERE tasks.id = ? AND projects.owner_id = ?`,
    [req.params.id, req.user.id],
    (findError, task) => {
      if (findError) {
        return res.status(500).json({
          message: "Failed to locate task"
        });
      }

      if (!task) {
        return res.status(404).json({
          message: "Task not found"
        });
      }

      db.run(
        `UPDATE tasks
         SET title = ?, description = ?, status = ?, priority = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          title || task.title,
          description || task.description,
          status || task.status,
          priority || task.priority,
          req.params.id
        ],
        function (error) {
          if (error) {
            return res.status(500).json({
              message: "Failed to update task"
            });
          }

          cache.del("analytics");

          res.status(200).json({
            message: "Task updated successfully"
          });
        }
      );
    }
  );
});

// Delete task
app.delete("/api/tasks/:id", verifyToken, (req, res) => {
  db.get(
    `SELECT tasks.id
     FROM tasks
     INNER JOIN projects ON tasks.project_id = projects.id
     WHERE tasks.id = ? AND projects.owner_id = ?`,
    [req.params.id, req.user.id],
    (findError, task) => {
      if (findError) {
        return res.status(500).json({
          message: "Failed to locate task"
        });
      }

      if (!task) {
        return res.status(404).json({
          message: "Task not found"
        });
      }

      db.run(
        `DELETE FROM tasks WHERE id = ?`,
        [req.params.id],
        function (error) {
          if (error) {
            return res.status(500).json({
              message: "Failed to delete task"
            });
          }

          cache.del("analytics");

          res.status(200).json({
            message: "Task deleted successfully"
          });
        }
      );
    }
  );
});

// Admin analytics
app.get("/api/analytics", verifyToken, adminOnly, (req, res) => {
  const cachedAnalytics = cache.get("analytics");

  if (cachedAnalytics) {
    return res.status(200).json({
      message: "Analytics fetched from cache",
      source: "cache",
      analytics: cachedAnalytics
    });
  }

  const analytics = {};

  db.get(`SELECT COUNT(*) AS totalUsers FROM users`, [], (userError, users) => {
    if (userError) {
      return res.status(500).json({
        message: "Analytics query failed"
      });
    }

    analytics.totalUsers = users.totalUsers;

    db.get(
      `SELECT COUNT(*) AS totalProjects,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeProjects,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedProjects
       FROM projects`,
      [],
      (projectError, projects) => {
        if (projectError) {
          return res.status(500).json({
            message: "Analytics query failed"
          });
        }

        analytics.totalProjects = projects.totalProjects || 0;
        analytics.activeProjects = projects.activeProjects || 0;
        analytics.completedProjects = projects.completedProjects || 0;

        db.get(
          `SELECT COUNT(*) AS totalTasks,
                  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedTasks,
                  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingTasks
           FROM tasks`,
          [],
          (taskError, tasks) => {
            if (taskError) {
              return res.status(500).json({
                message: "Analytics query failed"
              });
            }

            analytics.totalTasks = tasks.totalTasks || 0;
            analytics.completedTasks = tasks.completedTasks || 0;
            analytics.pendingTasks = tasks.pendingTasks || 0;

            cache.set("analytics", analytics);

            res.status(200).json({
              message: "Analytics fetched from database",
              source: "database",
              analytics
            });
          }
        );
      }
    );
  });
});

// Admin user report
app.get("/api/admin/users", verifyToken, adminOnly, (req, res) => {
  db.all(
    `SELECT users.id, users.name, users.email, users.role,
            users.created_at,
            COUNT(projects.id) AS project_count
     FROM users
     LEFT JOIN projects ON users.id = projects.owner_id
     GROUP BY users.id
     ORDER BY users.created_at DESC`,
    [],
    (error, users) => {
      if (error) {
        return res.status(500).json({
          message: "Failed to fetch user report"
        });
      }

      res.status(200).json({
        message: "Admin user report fetched successfully",
        users
      });
    }
  );
});

// Centralized error handler
app.use((error, req, res, next) => {
  console.error("Application error:", error.message);

  res.status(500).json({
    message: "Internal server error"
  });
});

// Invalid route handler
app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});