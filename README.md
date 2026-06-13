# Day 01 Backend Development Task

Project Title:
Simple Student REST API

Description:
This project is created for Day 01 Backend Development internship training task.

The project contains two REST APIs:
1. GET API to retrieve student data
2. POST API to add new student data

Technology Used:
- Python
- Flask
- Browser
- PowerShell

How to Run:
1. Install Flask:
pip install flask

2. Run the application:
python app.py

3. Server URL:
http://127.0.0.1:5000

API 1: GET Students

Method:
GET

Endpoint:
/students

Full URL:
http://127.0.0.1:5000/students

Description:
This API retrieves all student data.

Sample Response:
{
  "data": [
    {
      "domain": "Backend Development",
      "id": 1,
      "name": "Dilan"
    },
    {
      "domain": "Backend Development",
      "id": 2,
      "name": "Aman"
    }
  ],
  "message": "Student data fetched successfully"
}

API 2: POST Student

Method:
POST

Endpoint:
/students

Full URL:
http://127.0.0.1:5000/students

Description:
This API adds a new student.

Sample Request:
{
  "name": "Rahul",
  "domain": "Backend Development"
}

Sample Response:
{
  "data": {
    "domain": "Backend Development",
    "id": 3,
    "name": "Rahul"
  },
  "message": "Student added successfully"
}

Conclusion:
In this task, I learned how to create and test basic REST APIs using Flask. I created a GET API to retrieve data and a POST API to submit new data. I tested the GET API using browser and POST API using PowerShell.