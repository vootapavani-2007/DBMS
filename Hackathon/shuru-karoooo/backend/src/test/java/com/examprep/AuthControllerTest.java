package com.examprep;

import com.examprep.entity.OperatorAccount;
import com.examprep.repository.OperatorAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.not;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OperatorAccountRepository accountRepository;

    @Test
    void registrationStoresPasswordHashAndCreatesAuthenticatedSession() throws Exception {
        String email = UUID.randomUUID() + "@campus.edu";
        String password = "Campus!2026";
        String request = """
                {"email":"%s","displayName":"Transit Operator","password":"%s"}
                """.formatted(email, password);

        MvcResult registration = mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.displayName").value("Transit Operator"))
                .andReturn();

        OperatorAccount account = accountRepository.findByEmail(email).orElseThrow();
        org.junit.jupiter.api.Assertions.assertNotEquals(password, account.getPasswordHash());
        org.junit.jupiter.api.Assertions.assertTrue(account.getPasswordHash().startsWith("$2a$"));

        MockHttpSession session = (MockHttpSession) registration.getRequest().getSession(false);
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
        mockMvc.perform(get("/api/transit/overview").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeFleet").value(4));

        mockMvc.perform(post("/api/auth/logout").with(csrf()).session(session))
                .andExpect(status().isNoContent());

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Transit Operator"))
                .andReturn();
        MockHttpSession loginSession = (MockHttpSession) login.getRequest().getSession(false);
        mockMvc.perform(get("/api/transit/overview").session(loginSession))
                .andExpect(status().isOk());
    }

    @Test
    void transitApiRejectsRequestsWithoutAnAuthenticatedSession() throws Exception {
        mockMvc.perform(get("/api/transit/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginRejectsIncorrectPassword() throws Exception {
        String email = UUID.randomUUID() + "@campus.edu";
        mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"%s","displayName":"Test Operator","password":"Campus!2026"}
                                """.formatted(email)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"incorrect-password"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(not("Account not found")));
    }

    @Test
    void registrationRequiresPasswordBetweenTenAndFifteenCharacters() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"short@campus.edu","displayName":"Test Operator","password":"shortpass"}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/register")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"long@campus.edu","displayName":"Test Operator","password":"this-password-is-too-long"}
                                """))
                .andExpect(status().isBadRequest());
    }
}
