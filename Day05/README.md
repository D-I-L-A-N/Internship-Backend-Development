# Day 05 Backend Document Upload, Certificate & Analytics API

## Project Title
Document Upload, Certificate Generation and Analytics API

## Domain
Backend Development

## Objective
The objective of this task is to build scalable backend APIs inspired by real-world products. This project includes authentication, authorization, document upload and retrieval, certificate generation, analytics APIs, role-based access control, logging, error handling, and API documentation.

## Technologies Used
- Node.js
- Express.js
- SQLite
- bcryptjs
- JSON Web Token
- Multer
- PowerShell for API testing

## Features
- User registration and login
- Password hashing using bcryptjs
- JWT authentication
- Role-based access control
- Admin and user roles
- Document upload API
- Document retrieval API
- Single document fetch API
- Document delete API
- Certificate generation API
- Analytics API for dashboard
- Admin-only users list API
- Request logging
- Error handling and validation
- Database integration using SQLite

## Database Design

### Users Table
| Field | Type | Description |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | User name |
| email | TEXT | Unique user email |
| password | TEXT | Hashed password |
| role | TEXT | User role, either user or admin |

### Documents Table
| Field | Type | Description |
|---|---|---|
| id | INTEGER | Primary key |
| title | TEXT | Document title |
| filename | TEXT | Uploaded file name |
| filetype | TEXT | Uploaded file MIME type |
| filesize | INTEGER | Uploaded file size |
| user_id | INTEGER | Foreign key linked with users table |
| created_at | DATETIME | Upload timestamp |

### Certificates Table
| Field | Type | Description |
|---|---|---|
| id | INTEGER | Primary key |
| student_name | TEXT | Student name |
| course_name | TEXT | Course name |
| certificate_id | TEXT | Unique certificate ID |
| issued_by | INTEGER | Admin user ID |
| created_at | DATETIME | Certificate creation timestamp |

## API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | / | Public | Check server status |
| POST | /api/auth/register | Public | Register a new user |
| POST | /api/auth/login | Public | Login and generate JWT token |
| POST | /api/documents | User/Admin | Upload document |
| GET | /api/documents | User/Admin | Fetch logged-in user documents |
| GET | /api/documents/:id | User/Admin | Fetch single document |
| DELETE | /api/documents/:id | User/Admin | Delete document |
| POST | /api/certificates | Admin only | Generate certificate |
| GET | /api/analytics | Admin only | Fetch dashboard analytics |
| GET | /api/admin/users | Admin only | Fetch all users |

## Sample Register Request

```json
{
  "name": "Dilan Mathias",
  "email": "dilan@example.com",
  "password": "123456",
  "role": "user"
}