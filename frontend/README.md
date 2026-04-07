# BlockfolioX – Crypto Portfolio Tracker

A modern full-stack crypto portfolio tracker with real-time pricing, risk analysis, scam detection, and exchange integration.

![Dark Theme Crypto Dashboard](https://img.shields.io/badge/theme-dark-1a1a2e?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6db33f?style=for-the-badge&logo=springboot)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e?style=for-the-badge&logo=supabase)

---

## 🏁 Getting Started

To get a local copy up and running, follow these simple steps:

### Prerequisites
* **Node.js** (v18 or higher)
* **Java** (v17 or higher)
* **Maven** (for backend dependencies)

### Installation
1. Clone the repo: `git clone https://github.com/your-username/cryptoportfolio.git`
2. Install Frontend dependencies: `cd frontend && npm install`
3. Install Backend dependencies: `cd backend && mvn install`

---

## 📜 Available Scripts

In the project directory, you can run:

### 🎨 Frontend (`/frontend`)

#### `npm run dev`
Runs the app in the development mode.  
Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

#### `npm run build`
Builds the app for production to the `dist` folder.  
It correctly bundles React in production mode and optimizes the build for the best performance.

#### `npm run preview`
Locally preview the production build after running `npm run build`.

### ⚙️ Backend (`/backend`)

#### `./mvnw spring-boot:run`
Runs the Spring Boot application locally.  
The API will be accessible at [http://localhost:8080](http://localhost:8080).

#### `./mvnw clean package`
Compiles the application and creates an executable JAR file in the `target/` directory.

---

## 🚀 Features

- **Dashboard** – Total portfolio value, 24h P&L, risk alerts, recent trades
- **Portfolio Management** – Add/edit/delete assets, track quantity, price, and P&L
- **Real-time Pricing** – CoinGecko integration with periodic price snapshots
- **Risk & Scam Detection** – Contract verification and scam database lookups
- **Reports** – Portfolio summary with CSV export for tax reporting

... (Rest of technical details)
