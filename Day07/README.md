# Day 07 Final Backend Project

## Project Title

Secure Project Management Backend API

## Domain

Backend Development

## Objective

The objective of this final project is to demonstrate the backend development skills learned during the internship training. The project includes system design, API development, authentication, authorization, database management, validation, performance optimization, security, testing, and technical documentation.

## Technologies Used

* Node.js
* Express.js
* SQLite
* bcryptjs
* JSON Web Token
* Helmet
* express-rate-limit
* Node-Cache
* PowerShell for API testing

## Main Features

* User registration and login
* Password hashing using bcryptjs
* JWT authentication
* User and admin roles
* Role-based access control
* User profile API
* Project CRUD operations
* Task CRUD operations
* Project and task relationships
* Admin analytics API
* Admin user report
* API caching
* Rate limiting
* Security headers
* Database indexing
* Request logging
* Input validation
* Centralized error handling
* Invalid route handling

## System Modules

### Authentication Module

Handles user registration, login, password hashing, JWT generation, and token verification.

### User Management Module

Supports normal users and administrators with role-based authorization.

### Project Management Module

Allows users to create, view, update, and delete projects.

### Task Management Module

Allows users to create, view, update, and delete tasks associated with their projects.

### Analytics Module

Provides administrative statistics for users, projects, and tasks.

### Security Module

Includes JWT authentication, Helmet headers, API rate limiting, validation, and protected routes.

## Database Design

### Users Table

| Field      | Type     | Description           |
| ---------- | -------- | --------------------- |
| id         | INTEGER  | Primary key           |
| name       | TEXT     | User name             |
| email      | TEXT     | Unique user email     |
| password   | TEXT     | Hashed password       |
| role       | TEXT     | User or admin role    |
| created_at | DATETIME | Account creation time |

### Projects Table

| Field       | Type     | Description                   |
| ----------- | -------- | ----------------------------- |
| id          | INTEGER  | Primary key                   |
| title       | TEXT     | Project title                 |
| description | TEXT     | Project description           |
| status      | TEXT     | Planned, active, or completed |
| owner_id    | INTEGER  | Foreign key linked to users   |
| created_at  | DATETIME | Project creation time         |
| updated_at  | DATETIME | Project update time           |

### Tasks Table

| Field       | Type     | Description                        |
| ----------- | -------- | ---------------------------------- |
| id          | INTEGER  | Primary key                        |
| title       | TEXT     | Task title                         |
| description | TEXT     | Task description                   |
| status      | TEXT     | Pending, in-progress, or completed |
| priority    | TEXT     | Low, medium, or high               |
| project_id  | INTEGER  | Foreign key linked to projects     |
| assigned_to | INTEGER  | Foreign key linked to users        |
| created_at  | DATETIME | Task creation time                 |
| updated_at  | DATETIME | Task update time                   |

## API Endpoints

| Method | Endpoint                       | Access     | Description          |
| ------ | ------------------------------ | ---------- | -------------------- |
| GET    | /                              | Public     | Check server status  |
| POST   | /api/auth/register             | Public     | Register user        |
| POST   | /api/auth/login                | Public     | Login user           |
| GET    | /api/profile                   | User/Admin | Get profile          |
| POST   | /api/projects                  | User/Admin | Create project       |
| GET    | /api/projects                  | User/Admin | Get user projects    |
| GET    | /api/projects/:id              | User/Admin | Get one project      |
| PUT    | /api/projects/:id              | User/Admin | Update project       |
| DELETE | /api/projects/:id              | User/Admin | Delete project       |
| POST   | /api/projects/:projectId/tasks | User/Admin | Create task          |
| GET    | /api/projects/:projectId/tasks | User/Admin | Get project tasks    |
| PUT    | /api/tasks/:id                 | User/Admin | Update task          |
| DELETE | /api/tasks/:id                 | User/Admin | Delete task          |
| GET    | /api/analytics                 | Admin only | Get system analytics |
| GET    | /api/admin/users               | Admin only | Get user report      |

## Sample User Registration Request

```json
{
  "name": "Dilan Mathias",
  "email": "dilan.day07@example.com",
  "password": "123456",
  "role": "user"
}
```

## Sample Login Request

```json
{
  "email": "dilan.day07@example.com",
  "password": "123456"
}
```

## Sample Project Request

```json
{
  "title": "Internship Management System",
  "description": "A backend project to manage projects and tasks",
  "status": "active"
}
```

## Sample Task Request

```json
{
  "title": "Create Authentication Module",
  "description": "Implement JWT login and registration",
  "priority": "high"
}
```

## Authentication and Authorization Flow

1. A user registers with a name, email, password, and role.
2. The password is hashed using bcryptjs.
3. The user logs in with email and password.
4. A JWT token is generated after successful login.
5. The token is sent in the Authorization header.
6. Protected routes verify the token.
7. Admin middleware restricts analytics and user-report endpoints.

## Validation and Error Handling

The application validates required fields, password length, project status, task status, and task priority. It also provides proper error responses for invalid credentials, missing tokens, unauthorized access, missing projects, missing tasks, and invalid endpoints.

## Performance Optimization

* SQLite indexes were created for project owners, task projects, and task status.
* Node-Cache was used to cache analytics responses.
* Cached analytics data is cleared after project, task, or user changes.
* Database queries retrieve only the necessary fields.

## Security Implementation

* Password hashing with bcryptjs
* JWT-based authentication
* Role-based authorization
* Helmet security headers
* API rate limiting
* Protected routes
* Input validation
* Error handling without exposing sensitive information

## Testing Performed

The following functionalities were tested:

* Server startup
* Home route
* User registration
* Admin registration
* User login
* Admin login
* Project creation
* Project retrieval
* Task creation
* Task retrieval
* Task update
* Project update
* Admin analytics
* Analytics cache
* Admin user report
* Role-based access denial

## Architecture Workflow

```text
Client
  |
  v
Express API Server
  |
  +--> Authentication Middleware
  |
  +--> Authorization Middleware
  |
  +--> Project and Task Routes
  |
  +--> Analytics and Cache Layer
  |
  v
SQLite Database
```

## Learning Outcomes

Through this final project, I learned how to design and build a complete backend solution. I improved my understanding of authentication, authorization, CRUD APIs, database relationships, validation, performance optimization, security, caching, logging, testing, and technical documentation.

## Challenges Faced

The main challenges were managing project-task relationships, implementing role-based access, keeping analytics cache updated, validating inputs, and testing multiple protected API routes.

## Conclusion

I successfully developed a secure and complete Project Management Backend API using Node.js, Express.js, SQLite, JWT, bcryptjs, Helmet, express-rate-limit, and Node-Cache. The project demonstrates system design, API development, database management, security, validation, performance optimization, testing, and deployment readiness.
## Git Workflow

This project is maintained using a feature branch and pull request workflow.