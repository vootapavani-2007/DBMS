package com.examprep.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.examprep.entity.Quiz;
import com.examprep.entity.QuizAttempt;
import com.examprep.entity.Student;
import com.examprep.entity.Question;
import com.examprep.repository.QuestionRepository;
import com.examprep.repository.QuizAttemptRepository;
import com.examprep.repository.QuizRepository;
import com.examprep.repository.StudentRepository;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class QuizController {

    private final StudentRepository studentRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuestionRepository questionRepository;

    public QuizController(StudentRepository studentRepository,
                         QuizRepository quizRepository,
                         QuizAttemptRepository quizAttemptRepository,
                         QuestionRepository questionRepository) {
        this.studentRepository = studentRepository;
        this.quizRepository = quizRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.questionRepository = questionRepository;
    }

    @GetMapping("/quizzes/subject/{subjectName}/topic/{topicId}")
    public ResponseEntity<List<Map<String, Object>>> getQuizzesByTopic(@PathVariable String subjectName,
                                                                        @PathVariable Integer topicId,
                                                                        @org.springframework.web.bind.annotation.RequestParam Integer studentId) {
        List<Quiz> quizzes = quizRepository.findBySubject_SubjectNameAndTopic_TopicIdOrderByLevel(subjectName, topicId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Quiz quiz : quizzes) {
            Map<String, Object> map = new HashMap<>();
            map.put("quizId", quiz.getQuizId());
            map.put("quizName", quiz.getQuizName());
            map.put("difficulty", quiz.getDifficulty());
            map.put("level", quiz.getLevel());
            map.put("unlocked", isUnlocked(studentId, quiz));
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/quizzes/{quizId}/questions")
    public ResponseEntity<?> getQuizQuestions(@PathVariable Integer quizId,
                                               @org.springframework.web.bind.annotation.RequestParam Integer studentId,
                                               @org.springframework.web.bind.annotation.RequestParam(required = false) String difficulty) {
        Quiz quiz = quizRepository.findById(Objects.requireNonNull(quizId)).orElse(null);
        if (quiz == null) {
            return ResponseEntity.notFound().build();
        }
        if (!isUnlocked(studentId, quiz)) {
            return ResponseEntity.status(403).body(Map.of("message", "Pass the previous quiz with at least 75% first."));
        }

        String normalizedDifficulty = (difficulty == null || difficulty.isBlank())
                ? quiz.getDifficulty()
                : difficulty.trim().toUpperCase();

        List<Question> questions = (normalizedDifficulty == null || normalizedDifficulty.isBlank())
                ? questionRepository.findByTopicId(quiz.getTopic().getTopicId())
                : questionRepository.findByTopicIdAndDifficulty(quiz.getTopic().getTopicId(), normalizedDifficulty);

        if (questions.isEmpty()) {
            questions = questionRepository.findByTopicId(quiz.getTopic().getTopicId());
        }

        return ResponseEntity.ok(questions);
    }

    @PostMapping("/quizzes/attempt")
    public ResponseEntity<Map<String, Object>> saveAttempt(@RequestBody Map<String, Object> request) {
        Integer studentId = Integer.valueOf(request.get("studentId").toString());
        Integer quizId = Integer.valueOf(request.get("quizId").toString());
        Integer score = Integer.valueOf(request.get("score").toString());
        Integer totalQuestions = Integer.valueOf(request.get("totalQuestions").toString());

        Student student = studentRepository.findById(Objects.requireNonNull(studentId))
                .orElseThrow(() -> new RuntimeException("Student not found"));

        Quiz quiz = quizRepository.findById(Objects.requireNonNull(quizId))
                .orElseThrow(() -> new RuntimeException("Quiz not found"));

        if (score < 0 || totalQuestions <= 0 || score > totalQuestions) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid score data"));
        }
        if (!isUnlocked(studentId, quiz)) {
            return ResponseEntity.status(403).body(Map.of("message", "This quiz is locked."));
        }

        Integer attemptNumber = quizAttemptRepository.findByStudent_StudentId(studentId).size() + 1;

        QuizAttempt attempt = new QuizAttempt(student, quiz, score, totalQuestions, attemptNumber);
        QuizAttempt saved = quizAttemptRepository.save(attempt);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("attemptId", saved.getAttemptId());
        response.put("percentage", Math.round((score * 100.0) / totalQuestions));
        response.put("recommendation", Math.round((score * 100.0) / totalQuestions) < 75 ? "Practice more and retry" : "You passed. Try a harder quiz");
        response.put("passed", Math.round((score * 100.0) / totalQuestions) >= 75);
        response.put("nextLevelUnlocked", Math.round((score * 100.0) / totalQuestions) >= 75 && quiz.getLevel() < 5);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/quizzes/attempts")
    public ResponseEntity<List<Map<String, Object>>> getStudentAttempts(
            @org.springframework.web.bind.annotation.RequestParam Integer studentId) {
        List<Map<String, Object>> attempts = quizAttemptRepository.findByStudent_StudentId(studentId)
                .stream()
                .map(attempt -> {
                    Map<String, Object> result = new HashMap<>();
                    Quiz quiz = attempt.getQuiz();
                    result.put("attemptId", attempt.getAttemptId());
                    result.put("subject", quiz.getSubject().getSubjectName());
                    result.put("topic", quiz.getTopic().getTopicName());
                    result.put("quizName", quiz.getQuizName());
                    result.put("level", quiz.getLevel());
                    result.put("score", attempt.getScore());
                    result.put("totalQuestions", attempt.getTotalQuestions());
                    result.put("percentage", Math.round(attempt.getScore() * 100.0 / attempt.getTotalQuestions()));
                    result.put("attemptedAt", attempt.getAttemptedAt());
                    return result;
                })
                .toList();

        return ResponseEntity.ok(attempts);
    }

    private boolean isUnlocked(Integer studentId, Quiz quiz) {
        if (quiz.getLevel() <= 1) {
            return true;
        }

        Quiz previousQuiz = quizRepository
                .findBySubject_SubjectNameAndTopic_TopicIdOrderByLevel(quiz.getSubject().getSubjectName(), quiz.getTopic().getTopicId())
                .stream()
                .filter(candidate -> candidate.getLevel() == quiz.getLevel() - 1)
                .findFirst()
                .orElse(null);

        if (previousQuiz == null) {
            return false;
        }

        return quizAttemptRepository.findByStudent_StudentIdAndQuiz_QuizId(studentId, previousQuiz.getQuizId())
                .stream()
                .anyMatch(attempt -> attempt.getTotalQuestions() > 0
                        && attempt.getScore() * 100.0 / attempt.getTotalQuestions() >= 75);
    }
}
