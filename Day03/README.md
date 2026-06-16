# Day 03 Backend Authentication API

## Project Title
User Authentication API

## Domain
Backend Development

## Objective
The objective of this task is to implement user registration and login APIs with JWT authentication, database integration, protected routes, middleware, and API security fundamentals.

## Technologies Used
- Node.js
- Express.js
- SQLite
- bcryptjs
- JSON Web Token (JWT)
- PowerShell for API testing

## Features
- User Registration API
- User Login API
- Password hashing using bcryptjs
- JWT token generation
- Protected private route
- Middleware for token verification
- SQLite database integration
- Error handling and validation

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | / | Check server status |
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login user and generate JWT token |
| GET | /api/auth/profile | Access protected user profile |

## Sample Register Request

```json
{
  "name": "Dilan Mathias",
  "email": "dilan@example.com",
  "password": "123456"
}