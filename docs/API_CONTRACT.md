# LabSlot REST API Contract

**Base URL (Local Development):** `http://127.0.0.1:5000/api`  
**Content-Type:** `application/json`

> This document serves as the shared contract between Frontend (Member 1) and Backend (Member 2). Update this file whenever an endpoint or payload changes.

---

## Common Conventions

### Standard Response Envelope

Success responses return JSON with the requested resource or message:

```json
{
  "status": "ok",
  "data": {}
}
```

Error responses return an appropriate HTTP status code (`400`, `401`, `403`, `404`, `409`, `500`) and:

```json
{
  "error": "Short error summary",
  "details": "Optional validation or debugging context"
}
```

### User Roles (RBAC)

- `student` — View labs/equipment, create/cancel own bookings, report equipment issues.
- `faculty` — All student viewing capabilities plus approve/reject booking requests.
- `admin` — Full management of laboratories, equipment, users, bookings, and issues.

---

## 1. Health Check

### `GET /api/health`
Verify that the Flask server and database connection are operational.

- **Auth:** Public
- **Response (`200 OK`):**
```json
{
  "status": "ok",
  "service": "LabSlot API",
  "database": "connected"
}
```

---

## 2. Authentication (Planned)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new student account |
| `POST` | `/api/auth/login` | Public | Authenticate user and establish session/token |
| `POST` | `/api/auth/logout` | Authenticated | End current user session |
| `GET` | `/api/auth/me` | Authenticated | Get currently logged-in user profile |

---

## 3. Laboratories (Planned)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/labs` | Authenticated | List all laboratories and current availability status |
| `GET` | `/api/labs/<id>` | Authenticated | Get laboratory details and assigned equipment |
| `POST` | `/api/labs` | Admin | Create a new laboratory |
| `PUT` | `/api/labs/<id>` | Admin | Update laboratory details or status |
| `DELETE` | `/api/labs/<id>` | Admin | Remove a laboratory |

---

## 4. Equipment (Planned)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/equipment` | Authenticated | List equipment (filterable by `lab_id` and `status`) |
| `POST` | `/api/equipment` | Admin | Add equipment to a laboratory |
| `PUT` | `/api/equipment/<id>` | Admin | Update equipment quantity or availability status |
| `DELETE` | `/api/equipment/<id>` | Admin | Delete equipment record |

---

## 5. Bookings (Planned)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings` | Authenticated | List bookings (`student` sees own; `faculty`/`admin` see all or filtered) |
| `POST` | `/api/bookings` | Student, Faculty | Request a date and time slot booking |
| `PATCH` | `/api/bookings/<id>/approve` | Faculty, Admin | Approve a pending booking request |
| `PATCH` | `/api/bookings/<id>/reject` | Faculty, Admin | Reject a pending booking request with reason |
| `PATCH` | `/api/bookings/<id>/cancel` | Owner, Admin | Cancel an upcoming booking |

---

## 6. Equipment Issue Reports (Planned)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/issues` | Authenticated | List reported equipment issues |
| `POST` | `/api/issues` | Student, Faculty | Report a malfunctioning or damaged equipment item |
| `PATCH` | `/api/issues/<id>` | Admin | Update issue resolution status (`open`, `in_progress`, `resolved`) |
