package com.examprep.repository;

import com.examprep.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Integer> {

    @Query("SELECT q FROM Question q JOIN q.topic t JOIN t.subject s WHERE s.subjectName = :subjectName ORDER BY q.questionId")
    List<Question> findBySubjectName(@Param("subjectName") String subjectName);

    @Query("SELECT q FROM Question q JOIN q.topic t JOIN t.subject s WHERE s.subjectName = :subjectName AND q.difficulty = :difficulty ORDER BY q.questionId")
    List<Question> findBySubjectNameAndDifficulty(@Param("subjectName") String subjectName,
                                                 @Param("difficulty") String difficulty);

    @Query("SELECT q FROM Question q WHERE q.topic.topicId = :topicId ORDER BY q.questionId")
    List<Question> findByTopicId(@Param("topicId") Integer topicId);

    @Query("SELECT q FROM Question q WHERE q.topic.topicId = :topicId AND q.difficulty = :difficulty ORDER BY q.questionId")
    List<Question> findByTopicIdAndDifficulty(@Param("topicId") Integer topicId,
                                             @Param("difficulty") String difficulty);
}
