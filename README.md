# JMR — Jerry Manuel Residence

A responsive hostel-management application with a public residence website, an administrator workspace, and a private student portal. The frontend is React + Vite; the REST API is Node.js + Express; MongoDB records are managed with Mongoose.

## Run it on Windows

### 1. Prerequisites

- Node.js 20 or later (the project was built with Node.js 22).
- MongoDB running locally, or a MongoDB Atlas connection string.

### 2. Install dependencies

Open PowerShell in the project folder:

```powershell
cd C:\Users\brend\Downloads\hostel-mangement
npm install
npm --prefix server install
```

### 3. Configure the API

Copy the example environment file, then edit the copy:

```powershell
Copy-Item server\.env.example server\.env
notepad server\.env
```

At minimum, set `MONGODB_URI`, `JWT_SECRET`, and the four `ADMIN_*` values. For a local MongoDB installation, the example URI is ready to use. For MongoDB Atlas, replace it with your cluster connection string; URL-encode special characters in the database password.

Generate a random JWT signing secret from PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Paste the generated value into `JWT_SECRET`. Choose a unique administrator password of at least 12 characters. Keep `server\.env` private; it is ignored by Git and must never be copied into frontend code.

### 4. Create the first administrator

Run this once after MongoDB is available:

```powershell
npm --prefix server run seed:admin
```

The seed command creates only an administrator account and refuses to overwrite an existing account. Public admin registration is not available. Add student accounts from **Students → Add student**; the initial password is hashed before storage and should be shared with that resident securely.

### 5. Start the app

Use two PowerShell windows, both opened in the project folder.

**Window 1 — API**

```powershell
cd C:\Users\brend\Downloads\hostel-mangement
npm run dev:server
```

The API runs at `http://localhost:5000`; its health check is `http://localhost:5000/api/health`.

**Window 2 — website**

```powershell
cd C:\Users\brend\Downloads\hostel-mangement
npm run dev
```

Open `http://localhost:5173`. To use another API host, set `VITE_API_URL` before building the frontend, for example:

```powershell
$env:VITE_API_URL = "https://api.example.com/api"
npm run build
```

## Verification

Build the production frontend:

```powershell
npm run build
```

Run API health, validation, and unauthenticated-access tests:

```powershell
npm --prefix server test
```

The MongoDB-backed integration test covers room capacity, student sign-in and private records, duplicate monthly bills, payment history and overpayment prevention, duplicate daily attendance, complaint ownership, and staff-only visitor access. It is skipped unless `MONGODB_TEST_URI` points to a **dedicated disposable database whose name includes `test`**. The test suite clears that database before and after running, so never point it at production or a database with data you need.

For example, in PowerShell:

```powershell
$env:MONGODB_TEST_URI = "mongodb://127.0.0.1:27017/jmr_hostel_test"
npm --prefix server test
```

## What is included

- **Public website:** responsive JMR landing page, facilities, accommodation, dining, contact details, and sign-in links.
- **Authentication:** administrator and resident login, bcrypt password hashes, short-lived signed JWTs, role checks, login rate limiting, and server-side session-version revocation on logout.
- **Administrator workspace:** database-backed overview and charts, students, rooms, fees and payment records, attendance, complaints, mess menu, visitors, announcements, and CSV/print reports.
- **Student workspace:** personal dashboard, assigned room, fee balances/payment history, attendance, menu, announcements, and complaint submission/tracking.
- **Data safeguards:** unique student accounts and monthly bills, unique daily attendance per resident, room-capacity checks, no reducing recorded payments, retained payment history, input/schema validation, and centralized API errors.

Payments are recorded by residence staff (Cash, UPI, bank transfer, or card); there is no online payment-gateway integration. The app does not send email or perform password resets, so establish a secure account-provisioning and reset process before production use. Production deployment should also use HTTPS, a strong secret manager, a production MongoDB replica set with backups, an allowlisted `CLIENT_ORIGIN`, and monitoring.

## Important files

| File | Purpose |
| --- | --- |
| `src/components/LandingPage.jsx` | Public JMR homepage and residence information. |
| `src/style.css` | Shared navy-and-gold design system, responsive layouts, and portal styling. |
| `src/App.jsx` | Frontend routes, role gating, and lazy-loaded management pages. |
| `src/api.js` | Axios setup, JWT attachment, and API error handling. |
| `src/components/PortalLayout.jsx` | Responsive authenticated sidebar and top navigation. |
| `src/components/ResourcePage.jsx` | Reusable, API-backed search, filter, CRUD, CSV, and fee-receipt interface. |
| `src/data/modules.js` | Management module navigation and form/table definitions. |
| `server/src/models/index.js` | Mongoose schemas, indexes, and password hashing helper. |
| `server/src/routes/auth.js` | Sign-in and server-side logout/session revocation. |
| `server/src/routes/resources.js` | Validated resource APIs and role-scoped resident access. |
| `server/src/routes/dashboard.js` | Database aggregations for administrator and student dashboards. |
| `server/src/middleware/auth.js` | JWT authentication and role authorization. |
| `server/src/utils/errors.js` | Shared API validation/database error responses. |
| `server/scripts/seedAdmin.js` | Safe, environment-based first-administrator setup. |
| `server/.env.example` | API configuration template; copy to `server/.env`. |

## API overview

All API routes are under `/api`. `POST /auth/login` is public; management and dashboard endpoints require `Authorization: Bearer <token>`.

| Area | Routes |
| --- | --- |
| Dashboard | `GET /dashboard/summary` |
| Students | `GET/POST /students`, `PUT/DELETE /students/:id` |
| Rooms | `GET/POST /rooms`, `PUT/DELETE /rooms/:id` |
| Fees and payments | `GET/POST /fees`, `PUT/DELETE /fees/:id`, `POST /fees/:id/payments`, `GET /payments` |
| Attendance | `GET/POST /attendance`, `PUT/DELETE /attendance/:id` |
| Complaints | `GET/POST /complaints`, `PUT/DELETE /complaints/:id` |
| Mess menu | `GET/POST /mess`, `PUT/DELETE /mess/:id` |
| Visitors | `GET/POST /visitors`, `PUT/DELETE /visitors/:id` |
| Announcements | `GET/POST /announcements`, `PUT/DELETE /announcements/:id` |

Students can read only their own profile, fees, payment records, attendance, and complaints. They can submit complaints, read the published menu and announcements, and cannot use administrator write routes.
