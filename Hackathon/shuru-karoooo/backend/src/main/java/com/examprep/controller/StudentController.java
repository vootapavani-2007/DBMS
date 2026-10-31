package com.examprep.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.examprep.entity.Student;
import com.examprep.repository.StudentRepository;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {

    private final StudentRepository studentRepository;

    public StudentController(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Email and password are required.");
            return ResponseEntity.badRequest().body(error);
        }

        return studentRepository.findByEmail(email)
                .filter(student -> student.getPassword().equals(password))
                .map(student -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("studentId", student.getStudentId());
                    response.put("name", student.getName());
                    response.put("email", student.getEmail());
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    Map<String, Object> error = new HashMap<>();
                    error.put("success", false);
                    error.put("message", "Invalid email or password.");
                    return ResponseEntity.status(401).body(error);
                });
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String email = request.get("email");
        String password = request.get("password");

        if (name == null || email == null || password == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Name, email and password are required.");
            return ResponseEntity.badRequest().body(error);
        }

        if (studentRepository.findByEmail(email).isPresent()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Email already exists.");
            return ResponseEntity.badRequest().body(error);
        }

        Student student = studentRepository.save(new Student(name, email, password));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("studentId", student.getStudentId());
        response.put("name", student.getName());
        response.put("email", student.getEmail());
        return ResponseEntity.ok(response);
    }
}
