# 🚆 The One Rail

### A Smart Train Reservation Demonstration System

The One Rail is a full-stack MERN application that demonstrates a modern train reservation experience. Users can search trains, explore class-specific coach layouts, select their preferred seats and berths, book tickets, and manage reservations through an intuitive interface.

> **Project Notice:** The One Rail is an educational demonstration application. Train availability, seat inventory, fares, payments, PNRs and tickets are simulated. Generated tickets are not valid for railway travel. The application is not connected to the official IRCTC reservation or payment systems.

---

## 📌 About the Project

The One Rail aims to make the train reservation process more interactive by giving passengers control over their coach and exact seat selection.

Unlike basic booking demonstrations that automatically allocate seats, The One Rail allows passengers to visually explore coach layouts and select available seats for each traveller.

The application also provides administrative tools to manage train information, stations, bookings, users and reservation statistics.

### 🎯 Project Objectives

- Develop a user-friendly train reservation interface.
- Allow passengers to select their preferred coach and exact seat.
- Provide visual coach layouts for different travel classes.
- Prevent duplicate bookings through temporary seat holds and atomic inventory updates.
- Support multiple passengers in a single booking.
- Provide booking history, cancellation and PDF reservation summaries.
- Provide administrative tools for managing railway-related application data.

---

## ✨ Key Features

### 👤 Passenger Features

- User registration and secure login using JWT authentication.
- Train search by source, destination and journey date.
- Station autocomplete and route information.
- Train schedules, running days and class availability.
- Train filtering and sorting.
- Visual, class-specific coach layouts.
- Exact coach, seat and berth selection.
- Multiple passenger booking.
- Berth preference guidance.
- Temporary seat holds to prevent double booking.
- Simulated payment and booking confirmation.
- Simulated PNR generation and enquiry.
- Downloadable PDF reservation summaries.
- Booking history and cancellation.
- User profile and saved passengers.
- Favourite trains and routes.
- Notifications and recent searches.

### 🚉 Coach and Seat Selection

The application supports configurable layouts for the following classes:

| Class | Description |
|---|---|
| 1A | AC First Class – Cabins and Coupes |
| 2A | AC Two Tier |
| 3A | AC Three Tier |
| 3E | AC Three Tier Economy |
| SL | Sleeper Class |
| CC | AC Chair Car |
| 2S | Second Sitting |

Sleeper coaches display berth types such as:

- LB – Lower Berth
- MB – Middle Berth
- UB – Upper Berth
- SLB – Side Lower Berth
- SUB – Side Upper Berth

Chair-car layouts display numbered seats instead of sleeping berths.

> Coach layouts are configurable examples. They should not be treated as verified compositions for every real train.

### 🛏️ Lower Berth Guidance

The application provides a configurable lower-berth recommendation order:

1. Eligible aged passengers
2. Women passengers
3. Other passengers

This is application-level guidance, not an official railway quota or guarantee. Passengers can select another available berth, and the system does not silently replace their choice.

### 🔐 Booking Safety

- Temporary seat holds with expiry.
- Atomic seat inventory updates.
- Prevention of simultaneous booking of the same seat.
- Multi-seat hold rollback on failure.
- Booking confirmation linked to selected passengers and seats.
- Seat release after eligible cancellation.

### 🛠️ Administrator Features

- Train and station management.
- Coach and route configuration.
- Booking and passenger management.
- User management.
- Occupancy and class statistics.
- Booking analytics.
- Audit history.
- CSV reports.

---

## 🏗️ Technology Stack

| Technology | Purpose |
|---|---|
| React 18 | Frontend development |
| Vite | Frontend build tool |
| Tailwind CSS | UI styling |
| React Router | Navigation |
| Axios | API communication |
| Node.js | Backend runtime |
| Express.js | REST API |
| MongoDB | Database |
| Mongoose | Database modelling |
| JWT | Authentication |
| PDFKit | PDF generation |
| Lucide React | Icons |

---

## 📂 Project Structure

```text
the-one-rail/
│
├── backend/
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── test/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── utils/
│   ├── test/
│   └── package.json
│
├── docs/
├── .gitignore
├── package-lock.json
└── README.md
```

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following:

- Node.js 18 or later
- MongoDB Community Server or MongoDB Atlas
- Git
- Visual Studio Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/BhuvaneshP63/the-one-rail.git
```

Navigate into the project:

```bash
cd the-one-rail
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/train_booking
JWT_SECRET=your_strong_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

Add optional provider or email configuration only when required. Refer to `backend/.env.example` for the supported variables.

Start the backend:

```bash
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

### 4. Add Sample Train Data

From the backend directory, run:

```bash
npm run seed:sample
```

This script adds missing sample stations, trains and routes while preserving existing records.

> **Important:** Avoid running legacy seed scripts against a database containing data you want to preserve.

---

## 🔄 Application Workflow

1. Register or log in to the application.
2. Enter the source, destination and journey date.
3. Search and compare available sample trains.
4. Select a train and travel class.
5. Explore the visual coach layout.
6. Select an exact available seat or berth for each passenger.
7. Enter passenger details and review the fare.
8. Complete the simulated payment process.
9. Receive booking confirmation and a simulated PNR.
10. Download the PDF reservation summary or manage the booking.

---

## 🧩 System Architecture

The application follows a client-server architecture using React, Express and MongoDB.

```text
             REACT FRONTEND
                    |
                    |
              AXIOS REQUESTS
                    |
                    |
              EXPRESS REST API
                    |
                    |
           JWT AUTHENTICATION
                    |
                    |
          CONTROLLERS & SERVICES
                    |
                    |
                 MONGOOSE
                    |
                    |
                 MONGODB
```

### Architecture Components

| Component | Responsibility |
|---|---|
| React Frontend | User interface, train search and seat selection |
| Express Backend | REST API and application logic |
| JWT Middleware | Authentication and authorization |
| Controllers | Request handling and business logic |
| Services | Train data integration and reservation operations |
| Mongoose | MongoDB object modelling |
| MongoDB | Persistent application data |
| PDFKit | Simulated reservation PDF generation |

### Train Data Integration

The application uses sample train data by default and supports an optional RailRadar timetable provider.

External timetable information is kept separate from locally managed coach inventory, seat availability, fares and reservations.

To enable the optional provider, configure the relevant backend environment variables:

```env
TRAIN_DATA_PROVIDER=railradar
RAILRADAR_API_KEY=your_api_key
```

Provider access, API coverage and credentials must be verified separately.

The external mode uses the RailRadar station directory and trains-between-stations timetable API. The application exposes the following provider-related endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/trains/directory` | Reserved-train directory |
| `GET /api/trains/external/:trainNumber/schedule` | Individual train schedule |
| `GET /api/trains/external/:trainNumber/coaches` | Coach composition and berth-layout blueprint |

Keep the API key on the backend server. Never expose it through a frontend `VITE_` environment variable.

External coach layouts can be used for the application's local simulated reservation flow. Seats are held and booked only in this application's own inventory, not in IRCTC.

Local sample data remains available when `TRAIN_DATA_PROVIDER` is unset. Verify third-party timetable details with official railway sources before travel.

---

## 🔐 Seat Inventory and Booking Management

The One Rail maintains its own application-level seat inventory.

Each inventory record is associated with:

- Train
- Journey date
- Travel class
- Coach number
- Seat or berth number
- Seat status

### Seat Status

| Status | Description |
|---|---|
| AVAILABLE | Seat can be selected |
| HELD | Seat is temporarily reserved during booking |
| BOOKED | Seat belongs to a confirmed application booking |

The frontend may also display a temporary `SELECTED` state before a hold is requested.

### Booking Protection

The backend uses atomic inventory operations and temporary holds to reduce the possibility of two users reserving the same seat.

When a multi-seat hold cannot be completed, the application rolls back the applicable holds. Eligible cancellation releases the booked seats back into the local inventory.

These mechanisms protect the application's own database. They do not reserve seats in the official railway system.

---

## 🧪 Testing and Verification

The following verification results were recorded on **1 November 2026**:

| Test | Result |
|---|---|
| Frontend unit tests | 4 passed |
| Backend unit tests | 24 passed |
| Frontend production build | Passed |
| Booking lifecycle smoke test | Passed |

### Verified Areas

- Coach layouts and capacities.
- Train composition and sample train data.
- Fare calculation and validation.
- Lower-berth recommendation guidance.
- Atomic seat holds and concurrent booking protection.
- Exact seat persistence.
- Simulated PNR generation.
- PDF reservation document generation.
- Booking cancellation and seat release.

The booking lifecycle smoke test was performed against a dedicated test database.

### Booking Lifecycle Smoke Test

The smoke test covers the following application flow:

1. User registration.
2. User login.
3. Sample train search.
4. Competing seat-hold requests.
5. Exact seat selection and persistence.
6. Simulated booking confirmation.
7. Simulated PNR generation.
8. PDF reservation download.
9. Booking cancellation.
10. Seat release and explicit hold release.

> These are recorded verification results, not a claim that every external integration or production environment has been tested.

---

## ☁️ Deployment Preparation

The application can be prepared for cloud deployment using the following services:

| Component | Suggested Platform |
|---|---|
| Frontend | Vercel |
| Backend API | Render |
| Database | MongoDB Atlas |
| Source code | GitHub |

### Deployment Overview

1. Create a MongoDB Atlas database.
2. Configure the backend environment variables using the Atlas connection string.
3. Deploy the Express backend from the `backend` directory.
4. Configure the production frontend URL in backend CORS settings.
5. Deploy the React/Vite frontend from the `frontend` directory.
6. Configure the frontend API base URL to point to the deployed backend.
7. Test authentication, train search, seat selection, booking and cancellation.

### Important Deployment Notes

- Never upload `.env` files or API secrets to GitHub.
- Use a strong, unique JWT secret.
- Configure the correct production frontend URL in backend CORS settings.
- Configure the frontend API URL using the environment variable supported by the project.
- Use a separate test database when verifying booking operations.
- Confirm the backend production start script and required environment variables before deployment.
- Add the actual deployed URLs to this README after deployment is complete.

**Deployment status:** Not yet documented as completed.

---

## ⚠️ Limitations

- Train schedules use sample data by default; optional external timetable integration requires authorized provider access.
- Seat availability and coach inventory are simulated.
- Fare calculations are project estimates, not official railway fares.
- Payment processing is simulated.
- PNR numbers are generated by the application and are not official railway PNRs.
- Generated PDF reservation documents cannot be used for travel.
- The application is not connected to IRCTC's official reservation or payment systems.
- External timetable availability does not provide access to official live seat inventory.
- Production use would require authorized integrations, security review, operational monitoring, backups and extensive end-to-end testing.

---

## 🚀 Future Enhancements

The following features are planned for future development:

1. **Enhanced Lower Berth Priority Guidance**
   - Senior citizens aged 70 and above receive first-priority recommendations.
   - Women passengers receive the next priority.
   - Other passengers follow the normal recommendation order.
   - Passenger-selected available seats remain unchanged.
   - Show a clear message when lower berths are unavailable.

2. **Live Railway Timetable Integration**
   - Integrate a verified and authorized railway timetable API.
   - Improve train schedule accuracy.

3. **Genuine Payment Gateway Integration**
   - Integrate an authorized payment gateway.
   - Add server-side payment verification.

4. **Real-Time Train Tracking**
   - Display live train running status.
   - Provide estimated arrival and departure information.

5. **Passenger Notifications**
   - Email and SMS booking notifications.
   - Booking status updates and reminders.

6. **RAC and Waiting List Management**
   - Add RAC and waiting-list workflows.
   - Display application booking status updates.

7. **Cloud Deployment**
   - Deploy frontend, backend and database services.
   - Configure production monitoring and backups.

8. **Enhanced User Experience**
   - Improve responsive design.
   - Improve accessibility and usability.
   - Expand automated testing.

---

## 👨‍💻 Project Information

| Field | Details |
|---|---|
| Project Name | The One Rail |
| Project Type | Full-Stack Web Application |
| Domain | Railway Reservation System |
| Technology | MERN Stack |
| Frontend | React and Vite |
| Backend | Node.js and Express.js |
| Database | MongoDB |
| Repository | [GitHub – The One Rail](https://github.com/BhuvaneshP63/the-one-rail) |

---

## 📜 License

This project is developed for educational and demonstration purposes. Add an appropriate license before permitting reuse or redistribution.

---

<div align="center">

### 🚆 The One Rail

**Making Train Reservations More Interactive!**

</div>
