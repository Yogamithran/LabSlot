# LabSlot – Smart Laboratory Booking and Resource Management System

🚧 **Project Status: Under Development**

## 📌 Project Overview

LabSlot is a web-based laboratory booking and resource management system designed for colleges and educational institutions.

It helps students reserve laboratory time slots, check equipment availability, and manage laboratory bookings. Faculty members can review and approve booking requests, while administrators manage laboratories and resources.

## 🎯 Problem Statement

Managing laboratory schedules, equipment availability, and student bookings manually can lead to scheduling conflicts, inefficient resource utilization, and communication problems.

LabSlot aims to simplify this process through a centralized digital platform.

## ✨ Planned Features

- Student registration and login
- Laboratory listing and availability
- Equipment availability tracking
- Date and time slot booking
- Booking approval and rejection
- Booking cancellation
- Booking history
- Equipment issue reporting
- Faculty dashboard
- Admin dashboard

## 👥 User Roles

1. **Student:** View laboratories and request booking slots.
2. **Faculty:** Review and manage booking requests.
3. **Admin:** Manage laboratories, equipment, users, and bookings.

## 🛠️ Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap 5

### Backend
- Python
- Flask
- REST APIs

### Database
- SQLite

### Development Tools
- Git
- GitHub
- Antigravity
- Visual Studio Code

## 📂 Project Structure

```text
LabSlot/
│
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── index.html
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── database/
│   ├── app.py
│   ├── config.py
│   ├── schema.sql
│   └── requirements.txt
│
├── docs/
│   ├── API_CONTRACT.md
│   └── DAILY_HANDOVER.txt
│
├── .env.example
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Git
- Modern web browser

### Backend Setup

1. Navigate to the backend folder and create a virtual environment:

```bash
cd backend
python -m venv venv
```

2. Activate the virtual environment:

- **Windows (PowerShell):** `.\venv\Scripts\Activate.ps1`
- **Windows (CMD):** `venv\Scripts\activate.bat`
- **macOS / Linux:** `source venv/bin/activate`

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Copy `.env.example` to `.env` in the project root and update values as needed:

```bash
cp .env.example .env
```

5. Initialize the SQLite database and start the Flask server:

```bash
python app.py
```

The API server runs by default at `http://127.0.0.1:5000`. Verify it via `GET /api/health`.

### Frontend Setup

Open `frontend/index.html` in a browser (or serve the `frontend/` folder with VS Code Live Server or `python -m http.server 5500 --directory frontend`).

## 🤝 Development Collaboration

This project is developed collaboratively by two members.

- Member 1: Frontend Development
- Member 2: Backend Development
- Both members collaborate on API integration and testing.

Development takes place through separate Git branches and pull requests. See [docs/API_CONTRACT.md](docs/API_CONTRACT.md) and [docs/DAILY_HANDOVER.txt](docs/DAILY_HANDOVER.txt) for team coordination.

## 🔐 Security

- Secure password hashing
- Server-side input validation
- Role-based access control
- Environment-based configuration
- Sensitive credentials must never be committed to GitHub.

## 🚀 Future Enhancements

- QR-based laboratory check-in
- Equipment maintenance tracking
- Booking analytics
- Email notifications
- Advanced resource utilization reports

## 📌 Project Status

LabSlot is currently under active development. Features and documentation will be updated as development progresses.

---

**Built with the goal of making laboratory management simpler and more efficient.**
