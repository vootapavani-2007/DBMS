package com.examprep.controller;

import com.examprep.entity.Question;
import com.examprep.repository.QuestionRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/questions")
@CrossOrigin(origins = "*")
public class QuestionController {

    private final QuestionRepository questionRepository;

    public QuestionController(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    @GetMapping("/subject/{subjectName}")
    public List<Question> getQuestionsBySubjectName(@PathVariable String subjectName,
                                                  @RequestParam(required = false) String difficulty) {
        String normalizedDifficulty = difficulty == null || difficulty.isBlank()
                ? null
                : difficulty.trim().toUpperCase(Locale.ROOT);

        if (normalizedDifficulty == null) {
            return questionRepository.findBySubjectName(subjectName);
        }

        return questionRepository.findBySubjectNameAndDifficulty(subjectName, normalizedDifficulty);
    }
}
