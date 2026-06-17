# Hostel Management System (MERN)

A full-stack Hostel Management System built with **Node.js + Express + MySQL (Sequelize)** and **React (Vite)**.

This repository contains:
- **backend/**: REST API, authentication/authorization, business logic, MySQL persistence
- **frontend/**: Role-based React web app UI
- **mobile-app/**: Student/Warden mobile client (React Native)

> Note: This README focuses on getting the system running and highlights the main feature modules.

---

## Features (Module-wise)

### Authentication
- Local login + role-based access control
- Google OAuth login (Passport)
- Change password
- Session-based auth on the backend

### Admin / Hostel management
- Manage hostels, rooms, room types, sessions
- Manage facilities and facility types
- Manage users and roles
- Manage income types and expense types
- Manage suppliers, UOMs
- Manage maintenance records
- Notifications
- Dashboard stats and charts

### Warden
- Student enrollment + bulk import
- Hostel settings + hostel layout
- Fee management (EMI / student fees)
- Room management & room allotment
- Attendance, leave requests, complaints
- Suspensions, holidays, additional collections
- Mess billing generation & tracking
- Rebates handling
- Sessions and dashboard stats

### Student
- Profile, hostel layout, available rooms
- Apply for day reduction / room requests
- View mess bills and fee status
- Apply leave and view your leaves
- View complaints and create complaints
- View transactions/history
- Attendance
- Facilities usage (request/record usage)
- Special food items + food ordering
- Meal tokens + charts (mess expenses, attendance)
- Rebates

### Mess (Core Mess ERP)
- **Menu management**: menus, menu scheduling, serving, apply date ranges
- **Item management**: items, item categories, UOMs
- **Stock management**:
  - Update item stock
  - Record bulk consumption
  - Inventory purchases & returns
  - Export stock / reports (Excel)
- **Stores & item-store mapping**
- **Special food items** + student ordering
- **Food orders**: create/order, status updates, payment status, cancel
- **Daily rate & daily charges**
- **Billing/reporting**:
  - Monthly food orders report
  - Consumption summary
  - Latest purchase report
  - Mess fee summary and student fee breakdown
  - Monthly mess bill generation
  - Daily consumption details
  - Daily rate calculation report
- **Daily expenses** and **expense types**
- **Student fees & bed fees** (including bulk operations)
- **Credit tokens** and **concerns**
- **Income entries** and rounding adjustments
- **Recipes**

---

## Prerequisites

- **Node.js 20+**
- **MySQL** server
- npm dependencies installed in:
  - backend
  - frontend
  - (optional) mobile-app

---

## Setup & Run (Web: backend + frontend)

### 1) Backend
1. Go to `backend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (create a `.env` in `backend/`).
   The backend uses these variables (based on the code):

   **Database (MySQL via Sequelize)**
   - `DB_HOST`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`

   **Session**
   - `SESSION_SECRET` (optional; default exists but you should set it)

   **Server**
   - `PORT` (optional; default is `5001`)

   **OAuth/Email**
   - Google OAuth and email-related variables are expected by the auth/email utilities (set what your project uses in `backend/config/*`).

4. Start the backend:
   ```bash
   npm run dev
   ```
   (or `npm start`)

The backend exposes APIs under:
- `http://localhost:5001/api`

**Default admin account**
- On startup, the backend creates a default admin role/user if not present:
  - username: `admin`
  - password: `admin123`

### 2) Frontend
1. Go to `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the UI:
   ```bash
   npm run start
   ```

Frontend API base URL:
- `VITE_BACKEND_URL` (optional)
- Default: `http://localhost:5001/api`

---

## Docker (if you use provided Dockerfiles)

Both `backend/` and `frontend/` include Dockerfiles.

- Backend Dockerfile exposes port `4000` (see `backend/Dockerfile`).
- Frontend runs on Vite dev server port `3000` (see `frontend/vite.config.js`).

You can build/run using each folder’s Dockerfile.

---

## Project Structure (high level)

- `backend/`
  - `server.js`: Express app setup + route mounts
  - `routes/`: API route modules (auth/admin/warden/student/mess)
  - `controllers/`: request handlers
  - `middleware/`: auth/authorization middleware
  - `models/`: Sequelize models & associations
  - `migrations/`: database migrations

- `frontend/`
  - `src/components/`: role/module UIs (admin/warden/student/mess)
  - `src/services/api.js`: API client + endpoint wrappers
  - `src/context/`: auth and stock contexts

---

## Quick Start Commands

From repo root (run in two terminals):

**Terminal 1 (backend):**
```bash
cd backend && npm install && npm run dev
```

**Terminal 2 (frontend):**
```bash
cd frontend && npm install && npm run start
```

---

## Notes
- The backend enforces authentication via `auth` middleware for protected mess endpoints.
- `localStorage` token is used by the frontend API client for Authorization headers.

