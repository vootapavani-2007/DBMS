# TransitIQ Campus Mobility

TransitIQ is a campus transport operations demo built with a Spring Boot API and a responsive HTML/CSS/JavaScript dashboard. It includes account registration and sign-in, a direct journey planner, fleet and driver views, service alerts, and crowd forecasts backed by deterministic synthetic data.

## Requirements

- Java 17 or newer
- Maven 3.8+

The backend uses a local H2 file database, so no external database setup is required. Operator accounts persist across application restarts. Passwords are stored as BCrypt hashes; transit API routes require an authenticated session. Maven bundles the files in `frontend/` into the backend's static resources, so the UI and API stay connected on the same origin when running locally or from the packaged application.

## Run locally

From the repository root:

```powershell
cd backend
mvn spring-boot:run
```

Open [http://localhost:8080](http://localhost:8080). The dashboard assets are served from `frontend/`.

Create an account from the sign-in screen the first time you use the application. Use a valid email address and a password between 10 and 15 characters.

## API

- `GET /api/transit/overview`
- `GET /api/transit/stops`
- `GET /api/transit/routes`
- `GET /api/transit/fleet`
- `GET /api/transit/drivers`
- `GET /api/transit/alerts`
- `GET /api/transit/predictions`
- `POST /api/transit/journey-search`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/csrf`
- `POST /api/auth/logout`

Authentication uses an HTTP-only session cookie and CSRF tokens for state-changing requests.

Example journey-search request:

```json
{
  "originStopId": "STP-101",
  "destinationStopId": "STP-105",
  "departureDate": "2026-10-30",
  "departureTime": "19:00"
}
```

## Tests

Run the backend tests from `backend/`:

```powershell
mvn test
```
