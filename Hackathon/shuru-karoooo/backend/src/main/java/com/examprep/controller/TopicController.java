package com.examprep.controller;

import com.examprep.entity.Topic;
import com.examprep.repository.TopicRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/topics")
@CrossOrigin(origins = "*")
public class TopicController {

    private final TopicRepository topicRepository;

    public TopicController(TopicRepository topicRepository) {
        this.topicRepository = topicRepository;
    }

    @GetMapping("/subject/{subjectName}")
    public List<Topic> getTopicsBySubject(@PathVariable String subjectName) {
        return topicRepository.findBySubject_SubjectNameOrderByTopicName(subjectName);
    }
}
