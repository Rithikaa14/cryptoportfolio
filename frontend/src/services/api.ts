import axios from 'axios'
import { supabase } from '../lib/supabaseClient'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
    }
    return config
})

// ── Holdings ──
export const holdingsApi = {
    getAll: () => api.get('/holdings'),
    create: (data: any) => api.post('/holdings', data),
    update: (id: string, data: any) => api.put(`/holdings/${id}`, data),
    delete: (id: string) => api.delete(`/holdings/${id}`),
}

// ── Trades ──
export const tradesApi = {
    getAll: () => api.get('/trades'),
    getRecent: (limit = 10) => api.get(`/trades/recent?limit=${limit}`),
    create: (data: any) => api.post('/trades', data),
    recalculate: () => api.post('/trades/recalculate'),
}

// ── Prices ──
export const pricesApi = {
    getCurrent: (symbols: string[]) => api.get(`/prices?symbols=${symbols.join(',')}`),
    getHistory: (symbol: string, days: number) => api.get(`/prices/history/${symbol}?days=${days}`),
}

// ── Exchanges ──
export const exchangesApi = {
    getAll: () => api.get('/exchanges'),
    connect: (data: any) => api.post('/exchanges/connect', data),
    sync: (id: string) => api.post(`/exchanges/${id}/sync`),
    disconnect: (id: string) => api.delete(`/exchanges/${id}`),
}

// ── Risk ──
export const riskApi = {
    getAlerts: () => api.get('/risk/alerts'),
    checkToken: (address: string) => api.post('/risk/check', { address }),
    dismiss: (id: string) => api.put(`/risk/alerts/${id}/dismiss`),
}

// ── Reports ──
export const reportsApi = {
    getSummary: () => api.get('/reports/summary'),
    downloadCsv: () => api.get('/reports/export/csv', { responseType: 'blob' }),
}

export default api
