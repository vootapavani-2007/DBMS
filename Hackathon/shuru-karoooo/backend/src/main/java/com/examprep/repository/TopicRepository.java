package com.examprep.repository;

import com.examprep.entity.Topic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TopicRepository extends JpaRepository<Topic, Integer> {
    List<Topic> findBySubject_SubjectNameOrderByTopicName(String subjectName);
}
