const state = { overview: {}, stops: [], fleet: [], drivers: [], alerts: [], predictions: [] };
const byId = (id) => document.getElementById(id);
let csrfToken = "";
let authMode = "login";

document.addEventListener("DOMContentLoaded", () => {
    const now = new Date();
    byId("currentDate").textContent = new Intl.DateTimeFormat(undefined, {
        weekday: "short", month: "short", day: "numeric", year: "numeric"
    }).format(now);
    byId("departureDate").value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    byId("departureTime").value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    byId("greeting").textContent = `${now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening"}, operations`;
    byId("loginForm").addEventListener("submit", submitAuthentication);
    byId("authSwitch").addEventListener("click", toggleAuthenticationMode);
    byId("journeyForm").addEventListener("submit", searchJourneys);
    byId("swapStops").addEventListener("click", swapStops);
    byId("refreshButton").addEventListener("click", loadDashboard);
    byId("signOutButton").addEventListener("click", signOut);
    window.addEventListener("hashchange", showPageFromHash);
    showPageFromHash();
    checkAuthentication();
});

function showPageFromHash() {
    const requestedPage = window.location.hash.slice(1);
    const pageName = document.querySelector(`.app-page[data-page="${requestedPage}"]`)
        ? requestedPage
        : "overview";

    document.querySelectorAll(".app-page").forEach((page) => {
        const isCurrentPage = page.dataset.page === pageName;
        page.hidden = !isCurrentPage;
        page.classList.toggle("active", isCurrentPage);
    });

    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
        const isCurrentPage = link.hash.slice(1) === pageName;
        link.classList.toggle("active", isCurrentPage);
        if (isCurrentPage) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

async function fetchJson(path, options) {
    const response = await fetch(path, { credentials: "same-origin", ...options });
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed (${response.status})`);
    }
    return response.json();
}

async function getCsrfToken() {
    const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
    if (!response.ok) {
        throw new Error("Unable to initialize the secure sign-in session.");
    }
    const body = await response.json();
    csrfToken = body.token;
    return csrfToken;
}

async function checkAuthentication() {
    try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!response.ok) {
            showLogin();
            return;
        }
        const user = await response.json();
        showDashboard(user);
    } catch (error) {
        showLogin();
        byId("authError").textContent = "Could not connect to TransitIQ. Check that the server is running and try again.";
        console.error("Authentication session check failed:", error);
    }
}

function showLogin() {
    byId("loginScreen").hidden = false;
    byId("appShell").hidden = true;
    byId("loginEmail").focus();
    getCsrfToken().catch((error) => {
        byId("authError").textContent = error.message;
    });
}

function showDashboard(user) {
    byId("loginScreen").hidden = true;
    byId("appShell").hidden = false;
    const now = new Date();
    const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
    byId("greeting").textContent = `${greeting}, ${user.displayName}`;
    byId("userAvatar").textContent = initials(user.displayName);
    byId("userAvatar").title = user.email;
    loadDashboard();
}

function toggleAuthenticationMode() {
    setAuthenticationMode(authMode === "login" ? "register" : "login");
}

function setAuthenticationMode(mode) {
    authMode = mode;
    const registering = authMode === "register";
    const nameField = byId("registerNameField");
    nameField.hidden = !registering;
    byId("registerName").required = registering;
    byId("registerName").disabled = !registering;
    byId("loginTitle").textContent = registering ? "Create your account" : "Welcome to TransitIQ";
    byId("loginSubmit").innerHTML = registering ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
    byId("loginPassword").autocomplete = registering ? "new-password" : "current-password";
    byId("loginPassword").minLength = registering ? 10 : 1;
    byId("loginPassword").maxLength = registering ? 15 : 72;
    byId("authSwitchPrompt").textContent = registering ? "Already have an account?" : "New to TransitIQ?";
    byId("authSwitch").textContent = registering ? "Sign in" : "Create an account";
    byId("authError").textContent = "";
}

async function submitAuthentication(event) {
    event.preventDefault();
    const button = byId("loginSubmit");
    const errorMessage = byId("authError");
    button.disabled = true;
    errorMessage.textContent = "";
    try {
        const password = byId("loginPassword").value;
        if (authMode === "register" && (password.length < 10 || password.length > 15)) {
            throw new Error("New passwords must be between 10 and 15 characters.");
        }
        const body = {
            email: byId("loginEmail").value.trim(),
            password
        };
        if (authMode === "register") {
            body.displayName = byId("registerName").value.trim();
        }
        const token = csrfToken || await getCsrfToken();
        const response = await fetch(`/api/auth/${authMode}`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
            body: JSON.stringify(body)
        });
        const result = response.status === 204 ? {} : await response.json();
        if (!response.ok) {
            throw new Error(result.message || "Sign-in failed. Check your details and try again.");
        }
        csrfToken = "";
        await getCsrfToken();
        byId("loginPassword").value = "";
        showDashboard(result);
    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        button.disabled = false;
    }
}

async function signOut() {
    try {
        const token = await getCsrfToken();
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: { "X-XSRF-TOKEN": token }
        });
        if (!response.ok) {
            throw new Error("Sign out failed. Please try again.");
        }
        csrfToken = "";
        byId("loginForm").reset();
        setAuthenticationMode("login");
        showLogin();
    } catch (error) {
        console.error("Sign out failed:", error);
        window.alert(error.message);
    }
}

async function loadDashboard() {
    const refresh = byId("refreshButton");
    refresh.disabled = true;
    byId("sidebarHealth").textContent = "Refreshing network data…";
    try {
        const [overview, stops, fleet, drivers, alerts, predictions] = await Promise.all([
            fetchJson("/api/transit/overview"),
            fetchJson("/api/transit/stops"),
            fetchJson("/api/transit/fleet"),
            fetchJson("/api/transit/drivers"),
            fetchJson("/api/transit/alerts"),
            fetchJson("/api/transit/predictions")
        ]);
        Object.assign(state, { overview, stops, fleet, drivers, alerts, predictions });
        renderDashboard();
        byId("sidebarHealth").textContent = overview.delayedTrips > 0 ? `${overview.delayedTrips} service delay(s)` : "All systems stable";
    } catch (error) {
        byId("sidebarHealth").textContent = "Transit data unavailable";
        byId("networkHealth").textContent = "● Connection issue";
        byId("networkHealth").classList.add("warn");
        byId("journeyStatus").textContent = "Could not load operations data. Check the backend connection, then refresh.";
        byId("journeyStatus").classList.add("error");
        console.error("Transit dashboard load failed:", error);
    } finally {
        refresh.disabled = false;
    }
}

function renderDashboard() {
    const { overview, stops, fleet, drivers, alerts, predictions } = state;
    byId("activeFleet").textContent = overview.activeFleet ?? 0;
    byId("tripsToday").textContent = overview.tripsToday ?? 0;
    byId("driversAssigned").textContent = overview.driversAssigned ?? 0;
    byId("delayedTrips").textContent = overview.delayedTrips ?? 0;
    byId("onTimeCount").textContent = overview.onTimeTrips ?? 0;
    byId("attentionCount").textContent = (overview.delayedTrips ?? 0) + (overview.busesUnavailable ?? 0);

    const health = byId("networkHealth");
    const delayed = Number(overview.delayedTrips ?? 0);
    health.textContent = delayed ? `● ${delayed} delayed` : "● Network stable";
    health.classList.toggle("warn", delayed > 0);

    renderStopOptions(stops);
    renderFleet(fleet);
    renderDrivers(drivers);
    renderAlerts(alerts);
    renderPredictions(predictions);
}

function renderStopOptions(stops) {
    const options = stops.map((stop) => `<option value="${escapeHtml(stop.stopId)}">${escapeHtml(stop.name)}</option>`).join("");
    byId("originStop").innerHTML = options;
    byId("destinationStop").innerHTML = options;
    if (stops.length > 1) {
        byId("originStop").value = stops[0].stopId;
        byId("destinationStop").value = stops[1].stopId;
    }
}

function renderFleet(fleet) {
    byId("fleetTableBody").innerHTML = fleet.length ? fleet.map((bus) => {
        const load = Math.max(0, Math.min(100, Number(bus.occupancyPercent ?? 0)));
        const loadClass = load >= 75 ? "high" : "";
        return `<tr>
            <td><strong>${escapeHtml(bus.busId)}</strong><small>${escapeHtml(bus.registrationNumber)}</small></td>
            <td>${escapeHtml(bus.driverName || "Unassigned")}</td>
            <td>${escapeHtml(bus.nextTrip || "—")}</td>
            <td class="load-cell">${load}%<div class="load-track"><span class="${loadClass}" style="width:${load}%"></span></div></td>
            <td><span class="status-badge ${statusClass(bus.status)}">${formatStatus(bus.status)}</span></td>
        </tr>`;
    }).join("") : '<tr><td colspan="5" class="table-empty">No fleet records are available.</td></tr>';
}

function renderDrivers(drivers) {
    byId("driversGrid").innerHTML = drivers.length ? drivers.map((driver) => `
        <div class="driver-row">
            <div class="driver-info"><span class="driver-avatar">${escapeHtml(initials(driver.name))}</span><span><strong>${escapeHtml(driver.name)}</strong><small>${escapeHtml(driver.shift)} shift · ${escapeHtml(driver.hoursOnShift)} on duty</small></span></div>
            <span class="status-badge ${statusClass(driver.dutyStatus)}">${formatStatus(driver.dutyStatus)}</span>
        </div>`).join("") : '<p class="table-empty">No driver records are available.</p>';
}

function renderAlerts(alerts) {
    byId("alertCount").textContent = alerts.length;
    byId("alertList").innerHTML = alerts.length ? alerts.map((alert) => `
        <div class="alert-item ${severityClass(alert.severity)}">
            <span class="alert-dot"></span>
            <div><strong>${escapeHtml(alert.title)}</strong><p>${escapeHtml(alert.detail)}</p></div>
            <time>${escapeHtml(alert.time || "")}</time>
        </div>`).join("") : '<p class="table-empty">No active service alerts.</p>';
}

function renderPredictions(predictions) {
    byId("predictionGrid").innerHTML = predictions.length ? predictions.map((item) => `
        <div class="prediction-row">
            <div><strong>${escapeHtml(item.routeId)} · ${escapeHtml(item.routeName)}</strong><small>${escapeHtml(item.departureTime)} departure · ${escapeHtml(item.predictedPassengers)} expected passengers</small></div>
            <div class="forecast-value"><span class="crowd-badge ${crowdClass(item.crowdCategory)}">${escapeHtml(item.crowdCategory)}</span><small>${escapeHtml(item.remainingSeats)} seats left</small></div>
        </div>`).join("") : '<p class="table-empty">No demand forecasts are available.</p>';
}

async function searchJourneys(event) {
    event.preventDefault();
    const form = byId("journeyForm");
    const button = form.querySelector('button[type="submit"]');
    const status = byId("journeyStatus");
    const resultsContainer = byId("journeyResults");
    const originStopId = byId("originStop").value;
    const destinationStopId = byId("destinationStop").value;
    if (!originStopId || !destinationStopId || originStopId === destinationStopId) {
        status.textContent = originStopId === destinationStopId ? "Choose two different stops to search." : "Choose both an origin and destination.";
        status.classList.add("error");
        return;
    }
    button.disabled = true;
    status.classList.remove("error");
    status.textContent = "Searching available services…";
    resultsContainer.innerHTML = "";
    try {
        const token = csrfToken || await getCsrfToken();
        const results = await fetchJson("/api/transit/journey-search", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
            body: JSON.stringify({
                originStopId,
                destinationStopId,
                departureDate: byId("departureDate").value,
                departureTime: byId("departureTime").value
            })
        });
        resultsContainer.innerHTML = results.length ? results.map((trip) => `
            <article class="journey-card">
                <div class="journey-card-head"><div><strong>${escapeHtml(trip.routeName)}</strong><small>${escapeHtml(trip.routeId)} · ${escapeHtml(trip.busNumber)}</small></div>
                <span class="crowd-badge ${crowdClass(trip.crowdCategory)}">${escapeHtml(trip.crowdCategory)}</span></div>
                <div class="journey-details">
                    <span>Departure<strong>${escapeHtml(trip.departureTime)}</strong></span>
                    <span>Arrival<strong>${escapeHtml(trip.expectedArrival)}</strong></span>
                    <span>Travel time<strong>${escapeHtml(trip.estimatedDuration)}</strong></span>
                    <span>Seats left<strong>${escapeHtml(trip.estimatedAvailableSeats)}</strong></span>
                </div>
            </article>`).join("") : '<p class="table-empty">No direct trips found. Try a later departure time or another stop pair.</p>';
        status.textContent = results.length ? `${results.length} direct journey option(s) found.` : "No matching direct journeys.";
    } catch (error) {
        status.textContent = "Journey search failed. Please retry after checking the backend connection.";
        status.classList.add("error");
        console.error("Journey search failed:", error);
    } finally {
        button.disabled = false;
    }
}

function swapStops() {
    const origin = byId("originStop");
    const destination = byId("destinationStop");
    [origin.value, destination.value] = [destination.value, origin.value];
}

function formatStatus(value) {
    return String(value || "Unknown").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(value) {
    const status = String(value || "").toLowerCase().replace(/_/g, "-");
    if (status.includes("maintenance")) return "maintenance";
    if (status.includes("off-duty") || status.includes("decommissioned")) return "off-duty";
    if (status.includes("break")) return "break";
    if (status.includes("delay")) return "delayed";
    return "";
}

function severityClass(value) {
    const severity = String(value || "").toLowerCase();
    if (severity.includes("high") || severity.includes("delay")) return "high";
    if (severity.includes("info")) return "info";
    return "";
}

function crowdClass(value) {
    const crowd = String(value || "").toLowerCase().replace(/\s+/g, "-");
    return crowd.includes("busy") ? crowd : crowd === "moderate" ? "moderate" : "";
}

function initials(name) {
    return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}
