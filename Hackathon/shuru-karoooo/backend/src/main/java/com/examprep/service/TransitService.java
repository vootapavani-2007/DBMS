package com.examprep.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TransitService {

    private final List<Map<String, Object>> stops = List.of(
            stop("STP-101", "North Gate", "North Campus"),
            stop("STP-102", "Library Plaza", "Academic Core"),
            stop("STP-103", "Engineering Block", "Academic Core"),
            stop("STP-104", "Sports Centre", "Recreation Zone"),
            stop("STP-105", "Admin Block", "Central Campus"),
            stop("STP-106", "Hostel Circle", "Residential Zone"),
            stop("STP-107", "Research Park", "Innovation District"),
            stop("STP-108", "Terminal West", "Transport Hub")
    );

    private final List<Map<String, Object>> routes = List.of(
            route("R-12", "North Loop", List.of("STP-101", "STP-102", "STP-103", "STP-104", "STP-105")),
            route("R-17", "East Connector", List.of("STP-101", "STP-102", "STP-106", "STP-107", "STP-108")),
            route("R-24", "Science Shuttle", List.of("STP-103", "STP-104", "STP-105", "STP-107")),
            route("R-09", "Residential Express", List.of("STP-106", "STP-105", "STP-102", "STP-108"))
    );

    private final List<Map<String, Object>> buses = List.of(
            bus("BUS-12", "KA 07 AB 2041", 42, "IN_SERVICE", "DRV-201", 18, 43),
            bus("BUS-17", "KA 07 AB 2185", 52, "IN_SERVICE", "DRV-202", 31, 60),
            bus("BUS-24", "KA 07 AB 2213", 36, "AVAILABLE", "DRV-203", 17, 47),
            bus("BUS-09", "KA 07 AB 2298", 48, "MAINTENANCE", "DRV-204", 0, 0),
            bus("BUS-14", "KA 07 AB 2319", 44, "AVAILABLE", "DRV-205", 22, 50),
            bus("BUS-31", "KA 07 AB 2468", 54, "DECOMMISSIONED", null, 0, 0)
    );

    private final List<Map<String, Object>> drivers = List.of(
            driver("DRV-201", "Abi Nair", "A5", "TRIP-1201", "ON_ROUTE", "5h 20m"),
            driver("DRV-202", "Rohan Iyer", "A2", "TRIP-1701", "ON_ROUTE", "3h 55m"),
            driver("DRV-203", "Meera Das", "A1", "TRIP-2402", "BREAK", "1h 10m"),
            driver("DRV-204", "Sanjay Rao", "B3", null, "OFF_DUTY", "-"),
            driver("DRV-205", "Nina Khan", "A7", "TRIP-1401", "ON_ROUTE", "2h 40m")
    );

    private final List<Map<String, Object>> alerts = List.of(
            alert("Route delay", "Route R-12 is running 8 minutes behind schedule near Engineering Block.", "DELAYED", "Now"),
            alert("Vehicle maintenance", "Bus 09 requires brake inspection before its next service window.", "MAINTENANCE", "12 min ago"),
            alert("Stop update", "Hostel Circle is active for Route R-17 during roadworks near Admin Block.", "INFO", "28 min ago"),
            alert("Crowd advisory", "Demand is elevated on the evening R-17 connector. Consider the next departure.", "HIGH_DEMAND", "35 min ago")
    );

    public Map<String, Object> getOverview() {
        List<Map<String, Object>> todaysTrips = getTripSchedules(LocalDate.now());
        long activeFleet = buses.stream().filter(bus -> "AVAILABLE".equals(bus.get("status")) || "IN_SERVICE".equals(bus.get("status"))).count();
        long unavailable = buses.size() - activeFleet;
        long delayed = todaysTrips.stream().filter(trip -> "DELAYED".equals(trip.get("status"))).count();
        long onTime = todaysTrips.stream().filter(trip -> "ON_TIME".equals(trip.get("status"))).count();
        long assigned = drivers.stream().filter(driver -> driver.get("tripId") != null).count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("activeFleet", activeFleet);
        summary.put("busesUnavailable", unavailable);
        summary.put("tripsToday", todaysTrips.stream().filter(trip -> !"CANCELLED".equals(trip.get("status"))).count());
        summary.put("delayedTrips", delayed);
        summary.put("onTimeTrips", onTime);
        summary.put("driversAssigned", assigned);
        return summary;
    }

    public List<Map<String, Object>> getStops() {
        return stops;
    }

    public List<Map<String, Object>> getRoutes() {
        return routes;
    }

    public List<Map<String, Object>> getFleet() {
        List<Map<String, Object>> fleet = new ArrayList<>();
        for (Map<String, Object> bus : buses) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("busId", bus.get("busId"));
            row.put("registrationNumber", bus.get("registrationNumber"));
            row.put("capacity", bus.get("capacity"));
            row.put("status", bus.get("status"));
            row.put("driverName", driverName((String) bus.get("driverId")));
            row.put("occupancyPercent", bus.get("occupancyPercent"));
            row.put("nextTrip", nextTripForBus((String) bus.get("busId")));
            fleet.add(row);
        }
        return fleet;
    }

    public List<Map<String, Object>> getDrivers() {
        return drivers;
    }

    public List<Map<String, Object>> getAlerts() {
        return alerts;
    }

    public List<Map<String, Object>> getCrowdPredictions() {
        List<Map<String, Object>> predictions = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        List<Map<String, Object>> upcoming = getTripSchedules(today).stream()
                .filter(trip -> !"CANCELLED".equals(trip.get("status")))
                .filter(trip -> !LocalTime.parse((String) trip.get("departureTime")).isBefore(now))
                .sorted(Comparator.comparing(trip -> LocalTime.parse((String) trip.get("departureTime"))))
                .toList();
        if (upcoming.isEmpty()) {
            upcoming = getTripSchedules(today.plusDays(1)).stream()
                    .filter(trip -> !"CANCELLED".equals(trip.get("status")))
                    .sorted(Comparator.comparing(trip -> LocalTime.parse((String) trip.get("departureTime"))))
                    .toList();
        }
        for (Map<String, Object> trip : upcoming) {
            Map<String, Object> route = findRoute((String) trip.get("routeId"));
            if (route == null) {
                continue;
            }
            Map<String, Object> prediction = new LinkedHashMap<>();
            prediction.put("routeId", trip.get("routeId"));
            prediction.put("routeName", route.get("routeName"));
            prediction.put("departureTime", trip.get("departureTime"));
            prediction.put("predictedPassengers", trip.get("predictedPassengers"));
            prediction.put("remainingSeats", Math.max(0, (int) trip.get("capacity") - (int) trip.get("predictedPassengers")));
            prediction.put("crowdCategory", crowdCategoryFor((int) trip.get("occupancyPercent")));
            predictions.add(prediction);
            if (predictions.size() == 4) {
                break;
            }
        }
        return predictions;
    }

    public List<Map<String, Object>> searchJourneys(String originStopId, String destinationStopId, LocalDate departureDate, LocalTime departureTime) {
        List<Map<String, Object>> matches = new ArrayList<>();
        for (Map<String, Object> route : routes) {
            @SuppressWarnings("unchecked")
            List<String> sequence = (List<String>) route.get("stopSequence");
            int originIndex = sequence.indexOf(originStopId);
            int destinationIndex = sequence.indexOf(destinationStopId);
            if (originIndex < 0 || destinationIndex <= originIndex) {
                continue;
            }
            for (Map<String, Object> trip : getTripSchedules(departureDate)) {
                if (!route.get("routeId").equals(trip.get("routeId")) || "CANCELLED".equals(trip.get("status"))) {
                    continue;
                }
                LocalTime scheduledDeparture = LocalTime.parse((String) trip.get("departureTime"));
                if (scheduledDeparture.isBefore(departureTime)) {
                    continue;
                }
                int passengerCount = (int) trip.get("predictedPassengers");
                int capacity = (int) trip.get("capacity");
                int duration = 8 + (destinationIndex - originIndex) * 7;
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("routeId", route.get("routeId"));
                result.put("routeName", route.get("routeName"));
                result.put("busNumber", trip.get("busId"));
                result.put("departureTime", scheduledDeparture.toString());
                result.put("expectedArrival", scheduledDeparture.plusMinutes(duration).toString());
                result.put("estimatedDuration", duration + " min");
                result.put("estimatedAvailableSeats", Math.max(0, capacity - passengerCount));
                result.put("crowdCategory", crowdCategoryFor((int) trip.get("occupancyPercent")));
                result.put("status", trip.get("status"));
                matches.add(result);
            }
        }
        matches.sort(Comparator.comparing(trip -> LocalTime.parse((String) trip.get("departureTime"))));
        return matches;
    }

    private List<Map<String, Object>> getTripSchedules(LocalDate date) {
        return List.of(
                trip(date, "TRIP-1201", "R-12", "BUS-12", "07:15", "ON_TIME", 18, 43),
                trip(date, "TRIP-1202", "R-12", "BUS-14", "08:20", "ON_TIME", 29, 66),
                trip(date, "TRIP-1203", "R-12", "BUS-17", "09:45", "DELAYED", 35, 83),
                trip(date, "TRIP-1210", "R-12", "BUS-12", "20:45", "ON_TIME", 20, 48),
                trip(date, "TRIP-1211", "R-12", "BUS-14", "22:30", "SCHEDULED", 12, 29),
                trip(date, "TRIP-1701", "R-17", "BUS-17", "07:45", "ON_TIME", 31, 60),
                trip(date, "TRIP-1702", "R-17", "BUS-24", "08:55", "ON_TIME", 24, 58),
                trip(date, "TRIP-1710", "R-17", "BUS-14", "20:35", "ON_TIME", 38, 79),
                trip(date, "TRIP-1711", "R-17", "BUS-24", "22:45", "SCHEDULED", 16, 38),
                trip(date, "TRIP-2401", "R-24", "BUS-24", "07:30", "CANCELLED", 0, 0),
                trip(date, "TRIP-2402", "R-24", "BUS-24", "19:45", "ON_TIME", 22, 61),
                trip(date, "TRIP-0901", "R-09", "BUS-09", "18:15", "SCHEDULED", 14, 33),
                trip(date, "TRIP-0902", "R-09", "BUS-12", "21:05", "SCHEDULED", 17, 41)
        );
    }

    private String nextTripForBus(String busId) {
        LocalTime now = LocalTime.now();
        return getTripSchedules(LocalDate.now()).stream()
                .filter(trip -> busId.equals(trip.get("busId")) && !"CANCELLED".equals(trip.get("status")))
                .filter(trip -> !LocalTime.parse((String) trip.get("departureTime")).isBefore(now))
                .sorted(Comparator.comparing(trip -> LocalTime.parse((String) trip.get("departureTime"))))
                .map(trip -> trip.get("departureTime") + " · " + trip.get("tripId"))
                .findFirst()
                .orElse("No upcoming trip");
    }

    private String driverName(String driverId) {
        if (driverId == null) {
            return "Unassigned";
        }
        return drivers.stream()
                .filter(driver -> driverId.equals(driver.get("driverId")))
                .map(driver -> (String) driver.get("name"))
                .findFirst()
                .orElse("Unassigned");
    }

    private Map<String, Object> findRoute(String routeId) {
        return routes.stream().filter(route -> routeId.equals(route.get("routeId"))).findFirst().orElse(null);
    }

    private static String crowdCategoryFor(int occupancy) {
        if (occupancy >= 85) return "Very busy";
        if (occupancy >= 70) return "Busy";
        if (occupancy >= 50) return "Moderate";
        return "Light";
    }

    private static Map<String, Object> stop(String stopId, String name, String zone) {
        return Map.of("stopId", stopId, "name", name, "zone", zone);
    }

    private static Map<String, Object> route(String routeId, String routeName, List<String> stopSequence) {
        return Map.of("routeId", routeId, "routeName", routeName, "stopSequence", stopSequence);
    }

    private static Map<String, Object> bus(String busId, String registrationNumber, int capacity, String status, String driverId, int observed, int occupancyPercent) {
        Map<String, Object> bus = new LinkedHashMap<>();
        bus.put("busId", busId);
        bus.put("registrationNumber", registrationNumber);
        bus.put("capacity", capacity);
        bus.put("status", status);
        bus.put("driverId", driverId);
        bus.put("observedOccupancy", observed);
        bus.put("occupancyPercent", occupancyPercent);
        return bus;
    }

    private static Map<String, Object> driver(String driverId, String name, String shift, String tripId, String dutyStatus, String hoursOnShift) {
        Map<String, Object> driver = new LinkedHashMap<>();
        driver.put("driverId", driverId);
        driver.put("name", name);
        driver.put("shift", shift);
        driver.put("tripId", tripId);
        driver.put("dutyStatus", dutyStatus);
        driver.put("hoursOnShift", hoursOnShift);
        return driver;
    }

    private static Map<String, Object> trip(LocalDate date, String tripId, String routeId, String busId, String departureTime, String status, int passengers, int occupancyPercent) {
        Map<String, Object> trip = new LinkedHashMap<>();
        trip.put("tripId", tripId);
        trip.put("routeId", routeId);
        trip.put("busId", busId);
        trip.put("departureTime", departureTime);
        trip.put("travelDate", date.toString());
        trip.put("status", status);
        trip.put("predictedPassengers", passengers);
        trip.put("capacity", 42);
        trip.put("occupancyPercent", occupancyPercent);
        return trip;
    }

    private static Map<String, Object> alert(String title, String detail, String severity, String time) {
        return Map.of("title", title, "detail", detail, "severity", severity, "time", time);
    }
}
