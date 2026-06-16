# Day 02 Backend CRUD API

## Project Title
Student Management REST API

## Domain
Backend Development

## Objective
The objective of this task is to create CRUD APIs using Node.js and Express.js, test them, and document the API endpoints.

## Technologies Used
- Node.js
- Express.js
- PowerShell for API testing

## Features
- Create student
- Read all students
- Read single student by ID
- Update student
- Delete student
- Error handling for student not found
- Request validation for required fields

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | / | Check server running |
| POST | /api/students | Create new student |
| GET | /api/students | Get all students |
| GET | /api/students/:id | Get student by ID |
| PUT | /api/students/:id | Update student |
| DELETE | /api/students/:id | Delete student |

## Sample Request Body

```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "course": "Backend Development",
  "age": 22
}