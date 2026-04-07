import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PortfolioPage from './pages/PortfolioPage'
import AnalyticsPage from './pages/AnalyticsPage'
import RiskAlertsPage from './pages/RiskAlertsPage'
import ExchangesPage from './pages/ExchangesPage'
import ReportsPage from './pages/ReportsPage'
import TradesPage from './pages/TradesPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/risk" element={<RiskAlertsPage />} />
          <Route path="/exchanges" element={<ExchangesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
