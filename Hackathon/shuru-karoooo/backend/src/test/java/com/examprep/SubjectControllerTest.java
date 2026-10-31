package com.examprep;

import com.examprep.entity.Subject;
import com.examprep.repository.SubjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SubjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SubjectRepository subjectRepository;

    @BeforeEach
    void setUp() {
        subjectRepository.deleteAll();
        subjectRepository.save(new Subject("Database Systems"));
        subjectRepository.save(new Subject("Java Programming"));
    }

    @Test
    void getAllSubjects_returnsSavedSubjects() throws Exception {
        mockMvc.perform(get("/api/subjects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subjectName").value("Database Systems"))
                .andExpect(jsonPath("$[1].subjectName").value("Java Programming"));
    }
}
