# Kapatid Kita, Mahal Kita (KKMK) Data-Driven Management with Geo-Tagging and Cloud Analytics Platform
<p align="center">
<img src="./frontend/public/images/kmfi-logo.png" alt="KMFI Logo" width="200">
</p>

A full-stack web application for social impact, fundraising, and community engagement in Payatas, Quezon City.

## Features

- Geo-Tagging
- Cloud Analytics
- Forum
- Inventory Management
- Donation Management
- Event Management
- Content Management System
- Facial Recognition

## Tech Stack

- **Frontend:** React (TypeScript)
- **Backend:** Node.js (Express)
- **Database:** PostgreSQL

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm
- PostgreSQL

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/axiomproject/kkmkpayatas.git
   cd kkmk
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Database setup**
   - Make sure PostgreSQL is running.
   - Import the SQL schema:
     - Open your PostgreSQL client.
     - Import the file located at `/db/db.sql` into a database named `kkmk`.
   - Ensure your PostgreSQL user/password matches your backend config (default: `postgres`/`test`).

4. **Run the servers**

   - **Backend**
     ```bash
     cd backend
     node server.js
     ```

   - **Frontend**
     ```bash
     cd frontend
     npm run dev
     ```

5. **Access the app**
   - Frontend: [http://localhost:5173](http://localhost:5173) (or as shown in your terminal)
   - Backend API: [http://localhost:5175](http://localhost:5175) (default)

## Notes

- The backend and frontend run independently; both must be started for full functionality.
- All database tables and initial data are included in `/db/db.sql`.
- For production, update environment variables and database credentials as needed.

---

