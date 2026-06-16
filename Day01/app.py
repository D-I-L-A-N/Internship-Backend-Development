from flask import Flask, request, jsonify

app = Flask(__name__)

students = [
    {
        "id": 1,
        "name": "Dilan",
        "domain": "Backend Development"
    },
    {
        "id": 2,
        "name": "Aman",
        "domain": "Backend Development"
    }
]


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Backend API is running successfully"
    })


@app.route("/students", methods=["GET"])
def get_students():
    return jsonify({
        "message": "Student data fetched successfully",
        "data": students
    })


@app.route("/students", methods=["POST"])
def add_student():
    data = request.get_json()

    if not data:
        return jsonify({
            "message": "No data received"
        }), 400

    if "name" not in data or "domain" not in data:
        return jsonify({
            "message": "Name and domain are required"
        }), 400

    new_student = {
        "id": len(students) + 1,
        "name": data["name"],
        "domain": data["domain"]
    }

    students.append(new_student)

    return jsonify({
        "message": "Student added successfully",
        "data": new_student
    }), 201


if __name__ == "__main__":
    app.run(debug=True)