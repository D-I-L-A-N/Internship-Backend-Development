const express = require("express");

const app = express();

app.use(express.json());

// Temporary database
let students = [
  {
    id: 1,
    name: "Dilan Mathias",
    email: "dilan@example.com",
    course: "Backend Development",
    age: 21
  }
];

// Home route
app.get("/", (req, res) => {
  res.send("Day 02 Backend CRUD API is running");
});

// CREATE student
app.post("/api/students", (req, res) => {
  const { name, email, course, age } = req.body;

  if (!name || !email || !course || !age) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  const newStudent = {
    id: students.length + 1,
    name,
    email,
    course,
    age
  };

  students.push(newStudent);

  res.status(201).json({
    message: "Student created successfully",
    student: newStudent
  });
});

// READ all students
app.get("/api/students", (req, res) => {
  res.status(200).json(students);
});

// READ single student
app.get("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found"
    });
  }

  res.status(200).json(student);
});

// UPDATE student
app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found"
    });
  }

  const { name, email, course, age } = req.body;

  student.name = name || student.name;
  student.email = email || student.email;
  student.course = course || student.course;
  student.age = age || student.age;

  res.status(200).json({
    message: "Student updated successfully",
    student
  });
});

// DELETE student
app.delete("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found"
    });
  }

  students = students.filter((s) => s.id !== id);

  res.status(200).json({
    message: "Student deleted successfully"
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});