package com.examprep.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.examprep.entity.Quiz;

public interface QuizRepository extends JpaRepository<Quiz, Integer> {
    List<Quiz> findBySubject_SubjectNameAndTopic_TopicIdOrderByLevel(String subjectName, Integer topicId);
}
