# BlockfolioX – Crypto Portfolio Tracker

A modern full-stack crypto portfolio tracker with real-time pricing, risk analysis, scam detection, and exchange integration.

![Dark Theme Crypto Dashboard](https://img.shields.io/badge/theme-dark-1a1a2e?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6db33f?style=for-the-badge&logo=springboot)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e?style=for-the-badge&logo=supabase)

---

## 🚀 Features

- **Dashboard** – Total portfolio value, 24h P&L, risk alerts, recent trades
- **Portfolio Management** – Add/edit/delete assets, track quantity, price, and P&L
- **Exchange Integration** – Connect Binance API, auto-sync balances and trades
- **Real-time Pricing** – CoinGecko integration with periodic price snapshots
- **Charts & Analytics** – Portfolio growth, asset allocation pie chart, monthly returns
- **Risk & Scam Detection** – Etherscan contract verification, CryptoScamDB lookups
- **Reports** – Portfolio summary with CSV export for tax reporting
- **Authentication** – Supabase Auth with JWT-based session management

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   React Frontend │────▶│  Spring Boot API  │────▶│  Supabase   │
│  (Vite + TS)     │     │  (REST + JWT)     │     │  PostgreSQL │
└─────────────────┘     └──────────────────┘     └─────────────┘
                              │
                    ┌─────────┼───────────┐
                    ▼         ▼           ▼
               CoinGecko  Etherscan  CryptoScamDB
```

## 📂 Project Structure

```
cryptoportfolio/
├── frontend/                # React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/      # Sidebar, TopNav, AppLayout
│   │   ├── contexts/        # AuthContext (Supabase Auth)
│   │   ├── lib/             # Supabase client
│   │   ├── pages/           # All application pages
│   │   └── services/        # API client with JWT interceptor
│   ├── vercel.json          # Vercel deployment config
│   └── vite.config.ts       # Vite + Tailwind config
│
├── backend/                 # Java Spring Boot API
│   ├── src/main/java/com/blockfoliox/
│   │   ├── config/          # SecurityConfig (JWT + CORS)
│   │   ├── controller/      # REST controllers
│   │   ├── model/           # JPA entities
│   │   ├── repository/      # JPA repositories
│   │   └── service/         # Business logic + API clients
│   └── pom.xml              # Maven dependencies
│
├── database/
│   └── schema.sql           # Supabase PostgreSQL schema with RLS
│
└── README.md
```

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Java** 17+ and Maven
- **Supabase** project (free tier works)

### 1. Database Setup

1. Create a new [Supabase](https://supabase.com) project
2. Go to **SQL Editor** and run `database/schema.sql`
3. Enable **Authentication** in Supabase dashboard

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### 3. Backend Setup

```bash
cd backend

# Set environment variables (or create application-local.properties)
export SUPABASE_DB_URL=jdbc:postgresql://db.xxx.supabase.co:5432/postgres
export SUPABASE_DB_USER=postgres
export SUPABASE_DB_PASSWORD=your-db-password
export SUPABASE_JWT_SECRET=your-jwt-secret
export COINGECKO_API_KEY=your-coingecko-key
export ETHERSCAN_API_KEY=your-etherscan-key
export ENCRYPTION_KEY=your-32-char-encryption-key

./mvnw spring-boot:run
```

Backend runs on `http://localhost:8080`

## 🔑 Environment Variables

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_API_URL` | Backend API URL |

### Backend (environment or application.properties)

| Variable | Description |
|----------|-------------|
| `SUPABASE_DB_URL` | PostgreSQL connection string |
| `SUPABASE_DB_USER` | Database username |
| `SUPABASE_DB_PASSWORD` | Database password |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase settings |
| `COINGECKO_API_KEY` | CoinGecko API key (optional for free tier) |
| `ETHERSCAN_API_KEY` | Etherscan API key for contract verification |
| `ENCRYPTION_KEY` | 32-char key for API key encryption |

## 🚢 Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set environment variables in Vercel dashboard.

### Backend → Any Java hosting

Build the JAR and deploy:

```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/blockfoliox-api-1.0.0.jar
```

## 🔒 Security

- **Supabase Auth** for user authentication (email/password)
- **JWT validation** on all API endpoints
- **Row Level Security (RLS)** on all database tables
- **AES-256-GCM encryption** for stored API keys
- **Read-only** API key permissions for exchange connections

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/holdings` | List user holdings |
| POST | `/api/holdings` | Create holding |
| PUT | `/api/holdings/:id` | Update holding |
| DELETE | `/api/holdings/:id` | Delete holding |
| GET | `/api/trades` | List trades |
| GET | `/api/trades/recent` | Recent trades |
| POST | `/api/trades` | Create trade |
| GET | `/api/prices?symbols=` | Current prices |
| GET | `/api/prices/history/:symbol` | Price history |
| GET | `/api/exchanges` | List exchanges |
| POST | `/api/exchanges/connect` | Connect exchange |
| POST | `/api/exchanges/:id/sync` | Sync exchange |
| DELETE | `/api/exchanges/:id` | Disconnect exchange |
| GET | `/api/risk/alerts` | Risk alerts |
| POST | `/api/risk/check` | Check token |
| PUT | `/api/risk/alerts/:id/dismiss` | Dismiss alert |
| GET | `/api/reports/summary` | Portfolio summary |
| GET | `/api/reports/export/csv` | Download CSV |

## 📝 License

MIT License
