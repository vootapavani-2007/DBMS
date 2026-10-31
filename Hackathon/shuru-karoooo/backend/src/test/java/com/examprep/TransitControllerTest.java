package com.examprep;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser
class TransitControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void overviewReturnsTransitOperationsMetrics() throws Exception {
        mockMvc.perform(get("/api/transit/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeFleet").value(4))
                .andExpect(jsonPath("$.tripsToday").value(12))
                .andExpect(jsonPath("$.delayedTrips").value(1));
    }

    @Test
    void journeySearchIncludesUpcomingLateEveningTrips() throws Exception {
        String request = """
                {
                  "originStopId": "STP-101",
                  "destinationStopId": "STP-105",
                  "departureDate": "%s",
                  "departureTime": "22:00"
                }
                """.formatted(LocalDate.now());

        mockMvc.perform(post("/api/transit/journey-search")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].routeId").value("R-12"))
                .andExpect(jsonPath("$[0].departureTime").value("22:30"));
    }

    @Test
    void journeySearchReturnsDirectServicesAfterRequestedTime() throws Exception {
        String request = """
                {
                  "originStopId": "STP-101",
                  "destinationStopId": "STP-105",
                  "departureDate": "%s",
                  "departureTime": "19:00"
                }
                """.formatted(LocalDate.now());

        mockMvc.perform(post("/api/transit/journey-search")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].routeId").value("R-12"))
                .andExpect(jsonPath("$[0].departureTime").value("20:45"))
                .andExpect(jsonPath("$[1].departureTime").value("22:30"));
    }

    @Test
    void journeySearchRejectsInvalidTime() throws Exception {
        mockMvc.perform(post("/api/transit/journey-search")
                        .with(csrf())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "originStopId": "STP-101",
                                  "destinationStopId": "STP-105",
                                  "departureDate": "2026-10-30",
                                  "departureTime": "25:90"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}
