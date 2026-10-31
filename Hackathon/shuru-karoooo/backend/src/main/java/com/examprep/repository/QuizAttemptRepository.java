package com.examprep.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.examprep.entity.QuizAttempt;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Integer> {
    List<QuizAttempt> findByStudent_StudentId(Integer studentId);

    List<QuizAttempt> findByStudent_StudentIdAndQuiz_QuizId(Integer studentId, Integer quizId);
}
