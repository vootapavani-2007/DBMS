package com.examprep.controller;

import com.examprep.service.TransitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transit")
public class TransitController {

    private final TransitService transitService;

    public TransitController(TransitService transitService) {
        this.transitService = transitService;
    }

    @GetMapping("/overview")
    public Map<String, Object> getOverview() {
        return transitService.getOverview();
    }

    @GetMapping("/stops")
    public List<Map<String, Object>> getStops() {
        return transitService.getStops();
    }

    @GetMapping("/routes")
    public List<Map<String, Object>> getRoutes() {
        return transitService.getRoutes();
    }

    @GetMapping("/fleet")
    public List<Map<String, Object>> getFleet() {
        return transitService.getFleet();
    }

    @GetMapping("/drivers")
    public List<Map<String, Object>> getDrivers() {
        return transitService.getDrivers();
    }

    @GetMapping("/alerts")
    public List<Map<String, Object>> getAlerts() {
        return transitService.getAlerts();
    }

    @GetMapping("/predictions")
    public List<Map<String, Object>> getPredictions() {
        return transitService.getCrowdPredictions();
    }

    @PostMapping("/journey-search")
    public ResponseEntity<?> searchJourneys(@RequestBody Map<String, String> request) {
        String originStopId = request.get("originStopId");
        String destinationStopId = request.get("destinationStopId");
        String departureDate = request.get("departureDate");
        String departureTime = request.get("departureTime");
        if (isBlank(originStopId) || isBlank(destinationStopId) || isBlank(departureDate) || isBlank(departureTime)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Origin, destination, date and time are required."));
        }
        try {
            LocalDate date = LocalDate.parse(departureDate);
            LocalTime time = LocalTime.parse(departureTime);
            return ResponseEntity.ok(transitService.searchJourneys(originStopId, destinationStopId, date, time));
        } catch (DateTimeParseException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Date and time must use ISO formats (YYYY-MM-DD and HH:mm)."));
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
