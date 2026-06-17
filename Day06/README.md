# Day 06 Secure Document Processing API

## Project Title

Secure Document Processing and Verification API

## Domain

Backend Development

## Objective

The objective of this project is to build a secure and scalable backend API for document upload, processing, verification, analytics, and role-based access control.

## Technologies Used

* Node.js
* Express.js
* SQLite
* JSON Web Token
* bcryptjs
* Multer
* Node-Cache
* express-rate-limit
* Helmet
* PowerShell for API testing

## Main Features

* User registration and login
* Password hashing using bcryptjs
* JWT authentication
* User and admin roles
* Role-based access control
* Secure document upload
* Local file storage
* File type and file size validation
* Background document processing
* Document verification code generation
* Public document verification API
* Analytics aggregation
* API caching using Node-Cache
* Rate limiting
* Security headers using Helmet
* Database indexing
* Request logging
* Centralized error handling

## Database Design

### Users Table

| Field      | Type     | Description       |
| ---------- | -------- | ----------------- |
| id         | INTEGER  | Primary key       |
| name       | TEXT     | User name         |
| email      | TEXT     | Unique email      |
| password   | TEXT     | Hashed password   |
| role       | TEXT     | User or admin     |
| created_at | DATETIME | Registration time |

### Documents Table

| Field             | Type     | Description                 |
| ----------------- | -------- | --------------------------- |
| id                | INTEGER  | Primary key                 |
| title             | TEXT     | Document title              |
| filename          | TEXT     | Stored file name            |
| original_name     | TEXT     | Original uploaded file name |
| filetype          | TEXT     | File MIME type              |
| filesize          | INTEGER  | File size in bytes          |
| status            | TEXT     | Processing status           |
| verification_code | TEXT     | Unique verification code    |
| user_id           | INTEGER  | Document owner ID           |
| created_at        | DATETIME | Upload time                 |

## API Endpoints

| Method | Endpoint             | Access     | Description             |
| ------ | -------------------- | ---------- | ----------------------- |
| GET    | /                    | Public     | Check API status        |
| POST   | /api/auth/register   | Public     | Register user           |
| POST   | /api/auth/login      | Public     | Login and receive token |
| POST   | /api/documents       | User/Admin | Upload document         |
| GET    | /api/documents       | User/Admin | Get user documents      |
| GET    | /api/documents/:id   | User/Admin | Get one document        |
| DELETE | /api/documents/:id   | User/Admin | Delete document         |
| GET    | /api/verify/:code    | Public     | Verify document         |
| GET    | /api/analytics       | Admin only | View analytics          |
| GET    | /api/admin/documents | Admin only | View all documents      |

## Sample Register Request

```json
{
  "name": "Dilan Mathias",
  "email": "dilan.day06@example.com",
  "password": "123456",
  "role": "user"
}
```

## Sample Login Request

```json
{
  "email": "dilan.day06@example.com",
  "password": "123456"
}
```

## Document Upload Request

```text
Endpoint: POST /api/documents

Headers:
Authorization: Bearer JWT_TOKEN

Form Data:
title: Day 06 Sample Document
document: sample-document.txt
```

## Sample Upload Response

```json
{
  "message": "Document uploaded and sent for background processing",
  "document": {
    "id": 1,
    "title": "Day 06 Sample Document",
    "status": "processing",
    "verificationCode": "DOC-EXAMPLE-1234",
    "fileUrl": "/uploads/sample-document.txt"
  }
}
```

## Sample Verification Response

```json
{
  "message": "Document verification successful",
  "valid": true
}
```

## Background Processing

After a document is uploaded, its initial status is set to `processing`. A background task updates the status to `processed` after a short delay.

## Caching

The analytics endpoint uses Node-Cache. The first request fetches data from the SQLite database, while repeated requests return cached results for improved performance.

## Security Features

* Password hashing
* JWT token verification
* Admin-only middleware
* Helmet security headers
* API rate limiting
* File size restriction
* File type validation
* Protected document routes
* Centralized error handling

## Database Optimization

Indexes were created for `user_id` and `status` in the documents table. These indexes improve document retrieval and analytics query performance.

## Learning Outcomes

Through this task, I learned about scalable backend architecture, background job processing, API caching, document verification, file validation, role-based access control, database indexing, rate limiting, and backend security practices.

## Challenges Faced

The main challenges were implementing background processing, testing cache behavior, handling different user roles, and validating uploaded files securely.

## Conclusion

I successfully created a secure document processing API with authentication, authorization, file storage, document verification, caching, analytics, rate limiting, background processing, optimized database queries, and proper error handling.
