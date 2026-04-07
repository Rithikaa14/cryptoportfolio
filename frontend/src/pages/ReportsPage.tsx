import { useState, useEffect, useCallback } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine,
} from 'recharts'
import {
    Download, Calendar, DollarSign, TrendingUp,
    ArrowUpRight, ArrowDownRight, Loader2, AlertTriangle, Info,
    CheckCircle, ChevronDown, RefreshCw, BarChart2, Shield,
} from 'lucide-react'
import { api } from '../lib/api'
import { tradesApi, reportsApi } from '../services/api'

// ─── Types ──────────────────────────────────────────────────────────────────
interface AssetPnL {
    symbol: string
    quantity: string
    avgBuyPrice: string
    currentPrice: string
    realizedPnL: string
    unrealizedPnL: string
    shortTermGain: string
    longTermGain: string
    totalTrades: number
    sellCount: number
}

interface TaxEvent {
    date: string
    symbol: string
    quantity: string
    salePrice: string
    gain: string
    holdingType: 'SHORT_TERM' | 'LONG_TERM'
}

interface TaxSummary {
    year: number
    shortTermGains: number
    longTermGains: number
    netCapitalGains: number
    totalFeesPaid: number
    taxableSellEvents: number
    taxEvents: TaxEvent[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtPnL = (n: number | string) => {
    const v = Number(n || 0)
    return (v >= 0 ? '+' : '') + '$' + fmt(v)
}

const pnlColor = (n: number | string) =>
    Number(n || 0) >= 0 ? 'text-neon-green' : 'text-neon-red'

const CURRENT_YEAR = new Date().getFullYear()
const TAX_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

const tokenColors: Record<string, string> = {
    BTC: '#f7931a', ETH: '#627eea', SOL: '#00e676', ADA: '#00b0ff',
    DOGE: '#c2a633', AVAX: '#e84142', DOT: '#e6007e', LINK: '#2a5ada',
    BNB: '#f3ba2f', MATIC: '#8247e5', DEFAULT: '#6c5ce7',
}

const TAX_HINTS = [
    {
        icon: Shield,
        color: 'text-neon-blue',
        bg: 'from-neon-blue/10',
        title: 'Short-Term vs Long-Term Rates',
        tip: 'Assets held >1 year qualify for long-term capital gains tax (0–20%) vs short-term rates (up to 37%). Consider holding near-1-year positions before selling.',
    },
    {
        icon: TrendingUp,
        color: 'text-neon-green',
        bg: 'from-neon-green/10',
        title: 'Tax-Loss Harvesting',
        tip: 'Sell losing assets to offset gains. Crypto has no wash-sale rule in most jurisdictions — you can immediately repurchase the same token after selling.',
    },
    {
        icon: AlertTriangle,
        color: 'text-neon-yellow',
        bg: 'from-neon-yellow/10',
        title: 'Staking & DeFi Income',
        tip: 'Staking rewards, DeFi yields, and airdrops are typically taxed as ordinary income at receipt. Track your cost basis from the date of receipt.',
    },
    {
        icon: Calendar,
        color: 'text-neon-purple',
        bg: 'from-neon-purple/10',
        title: 'Year-End Planning',
        tip: 'Review unrealized losses before Dec 31. Harvesting losses before year-end can reduce your tax liability. Consult a crypto-savvy tax professional.',
    },
]

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReportsPage() {
    const [tab, setTab] = useState<'overview' | 'assets' | 'tax' | 'hints'>('overview')
    const [exporting, setExporting] = useState(false)
    const [recalculating, setRecalculating] = useState(false)
    const [loading, setLoading] = useState(true)
    const [taxYear, setTaxYear] = useState(CURRENT_YEAR)
    const [yearOpen, setYearOpen] = useState(false)

    const [summary, setSummary] = useState<any>(null)
    const [assetPnL, setAssetPnL] = useState<AssetPnL[]>([])
    const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null)
    const [taxLoading, setTaxLoading] = useState(false)

    const fetchCore = useCallback(async () => {
        setLoading(true)
        try {
            const [summaryRes, pnlRes] = await Promise.all([
                api.get('/reports/summary'),
                api.get('/reports/pnl').catch(() => ({ data: [] })),
            ])
            setSummary(summaryRes.data)
            setAssetPnL(pnlRes.data || [])
        } catch (e) {
            console.error('Failed to load reports', e)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchTaxSummary = useCallback(async (year: number) => {
        setTaxLoading(true)
        try {
            const res = await api.get(`/reports/tax-summary?year=${year}`)
            setTaxSummary(res.data)
        } catch (e) {
            console.error('Failed to load tax summary', e)
        } finally {
            setTaxLoading(false)
        }
    }, [])

    useEffect(() => { fetchCore() }, [fetchCore])
    useEffect(() => { if (tab === 'tax') fetchTaxSummary(taxYear) }, [tab, taxYear, fetchTaxSummary])

    const handleExport = async () => {
        setExporting(true)
        try {
            const response = await api.get('/reports/export/csv', { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const a = document.createElement('a')
            a.href = url
            a.download = `blockfoliox-tax-report-${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (e) {
            alert('Export failed. Please try again.')
        } finally {
            setExporting(false)
        }
    }

    const handleRecalculate = async () => {
        if (!confirm('Repair Portfolio will recalculate all holdings from your trade history. This is safe and fixes negative balances. Proceed?')) return
        
        setRecalculating(true)
        try {
            await tradesApi.recalculate()
            await fetchCore()
            alert('Portfolio successfully repaired! Your holdings are now in sync with your trade history.')
        } catch (e) {
            alert('Failed to recalculate holdings. Please try again.')
        } finally {
            setRecalculating(false)
        }
    }

    // Build bar-chart data for asset P&L
    const assetChartData = assetPnL.slice(0, 10).map(a => ({
        name: a.symbol,
        realized: Number(a.realizedPnL),
        unrealized: Number(a.unrealizedPnL),
        color: tokenColors[a.symbol] || tokenColors.DEFAULT,
    }))

    // Build cumulative P&L over history
    const historyData = (summary?.history || []).map((h: any) => ({
        date: h.date,
        value: Number(h.value),
    }))

    const totalRealized   = Number(summary?.realizedPnL   || 0)
    const totalUnrealized = Number(summary?.unrealizedPnL  || 0)
    const totalValue      = Number(summary?.totalValue     || 0)
    const totalCost       = Number(summary?.totalCost      || 0)
    const totalPnL        = totalRealized + totalUnrealized

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-accent-400 mb-4" size={32} />
                <p className="text-white/40">Loading P&amp;L reports...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">P&amp;L &amp; Reports</h1>
                    <p className="text-white/40 text-sm mt-1">Realized/unrealized gains, tax summaries &amp; export</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRecalculate} 
                        disabled={recalculating}
                        className={`p-2 rounded-lg bg-accent-500/10 border border-accent-500/20 hover:bg-accent-500/20 transition-all flex items-center gap-2 text-accent-400 text-xs font-semibold ${recalculating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Repair Portfolio: Syncs holdings with trade history"
                    >
                        <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
                        {recalculating ? 'Repairing...' : 'Repair Portfolio'}
                    </button>
                    <button onClick={fetchCore} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" title="Refresh">
                        <RefreshCw size={16} className="text-white/50" />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Download size={16} />
                        {exporting ? 'Exporting...' : 'Export Tax CSV'}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Portfolio Value', value: `$${fmt(totalValue)}`, icon: DollarSign, color: 'text-accent-400', bg: 'from-accent-500/10' },
                    { label: 'Total Cost Basis', value: `$${fmt(totalCost)}`, icon: BarChart2, color: 'text-white/60', bg: 'from-white/5' },
                    { label: 'Unrealized P&L', value: fmtPnL(totalUnrealized), icon: ArrowUpRight, color: totalUnrealized >= 0 ? 'text-neon-green' : 'text-neon-red', bg: totalUnrealized >= 0 ? 'from-neon-green/10' : 'from-neon-red/10' },
                    { label: 'Realized P&L', value: fmtPnL(totalRealized), icon: CheckCircle, color: totalRealized >= 0 ? 'text-neon-green' : 'text-neon-red', bg: totalRealized >= 0 ? 'from-neon-green/10' : 'from-neon-red/10' },
                ].map((card) => (
                    <div key={card.label} className={`stat-card bg-gradient-to-br ${card.bg} to-transparent`}>
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon size={14} className={card.color} />
                            <p className="text-xs text-white/40 uppercase tracking-wider">{card.label}</p>
                        </div>
                        <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Net P&L Banner */}
            <div className={`glass-card p-4 bg-gradient-to-r ${totalPnL >= 0 ? 'from-neon-green/10' : 'from-neon-red/10'} to-transparent flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    {totalPnL >= 0
                        ? <TrendingUp size={20} className="text-neon-green" />
                        : <ArrowDownRight size={20} className="text-neon-red" />
                    }
                    <div>
                        <p className="text-sm font-medium text-white/70">Total Net P&amp;L (Realized + Unrealized)</p>
                        <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                            {fmtPnL(totalPnL)}
                        </p>
                    </div>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-white/30">Total Trades</p>
                    <p className="text-lg font-bold">{summary?.totalTrades || 0}</p>
                    <p className="text-xs text-white/30">{summary?.totalAssets || 0} assets</p>
                </div>
            </div>

            {/* Tab Nav */}
            <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 w-fit">
                {([
                    { key: 'overview', label: 'Overview' },
                    { key: 'assets',   label: 'Per Asset' },
                    { key: 'tax',      label: 'Tax Report' },
                    { key: 'hints',    label: 'Tax Hints' },
                ] as { key: typeof tab; label: string }[]).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            tab === t.key
                                ? 'bg-accent-500/20 text-accent-400 shadow-lg'
                                : 'text-white/40 hover:text-white/60'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Portfolio Value History */}
                    <div className="glass-card p-6">
                        <h2 className="font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp size={16} className="text-accent-400" />
                            Portfolio Value (Last 7 Days)
                        </h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={historyData}>
                                <defs>
                                    <linearGradient id="gradPV" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8247e5" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#8247e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload?.length) {
                                            return (
                                                <div className="glass-card p-3 border border-white/10 shadow-2xl">
                                                    <p className="text-[10px] text-white/40 uppercase font-bold mb-1">{payload[0].payload.date}</p>
                                                    <p className="text-sm font-bold text-accent-400">${fmt(payload[0].value as number)}</p>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#8247e5" strokeWidth={3} fill="url(#gradPV)" animationDuration={1500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Holdings with P&L */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold">Holdings Report</h2>
                                <p className="text-xs text-white/40 mt-1">Current positions with unrealized P&amp;L</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        {['Token', 'Quantity', 'Avg Cost', 'Total Cost', 'Current Price', 'Value', 'Unrealized P&L', 'Return %'].map((h) => (
                                            <th key={h} className="px-6 py-3 text-left text-xs text-white/40 font-medium uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!summary?.holdings || summary.holdings.length === 0) && (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-white/40">No holdings data available.</td></tr>
                                    )}
                                    {summary?.holdings?.map((h: any) => {
                                        const value     = h.quantity * (h.currentPrice || 0)
                                        const cost      = h.quantity * (h.avgBuyPrice || 0)
                                        const unrealized = value - cost
                                        const retPct    = cost > 0 ? ((unrealized / cost) * 100) : 0
                                        return (
                                            <tr key={h.symbol} className="table-row">
                                                <td className="px-6 py-4 font-medium text-sm">{h.symbol}</td>
                                                <td className="px-6 py-4 text-sm">{Number(h.quantity).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm">${fmt(h.avgBuyPrice)}</td>
                                                <td className="px-6 py-4 text-sm font-medium opacity-60">${fmt(cost)}</td>
                                                <td className="px-6 py-4 text-sm">${fmt(h.currentPrice || 0)}</td>
                                                <td className="px-6 py-4 text-sm font-medium">${fmt(value)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-sm font-medium ${unrealized >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                                        {fmtPnL(unrealized)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-sm font-medium ${retPct >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                                        {retPct >= 0 ? '+' : ''}{retPct.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-white/10">
                                        <td className="px-6 py-4 font-semibold text-sm" colSpan={3}>Total</td>
                                        <td className="px-6 py-4 font-semibold text-sm opacity-60">${fmt(totalCost)}</td>
                                        <td className="px-6 py-4 font-semibold text-sm"></td>
                                        <td className="px-6 py-4 font-semibold text-sm">${fmt(totalValue)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`font-semibold text-sm ${totalUnrealized >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                                {fmtPnL(totalUnrealized)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-semibold text-sm ${totalCost > 0 && (totalUnrealized / totalCost) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                                {totalCost > 0 ? `${((totalUnrealized / totalCost) * 100 >= 0 ? '+' : '')}${((totalUnrealized / totalCost) * 100).toFixed(1)}%` : '—'}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PER ASSET TAB ── */}
            {tab === 'assets' && (
                <div className="space-y-6">
                    {/* P&L Bar Chart */}
                    {assetChartData.length > 0 && (
                        <div className="glass-card p-6">
                            <h2 className="font-semibold mb-4 flex items-center gap-2">
                                <BarChart2 size={16} className="text-accent-400" />
                                Realized P&amp;L by Asset
                            </h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={assetChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload?.length) {
                                                const d = payload[0].payload
                                                return (
                                                    <div className="glass-card p-3 border border-white/10 shadow-2xl space-y-1.5">
                                                        <p className="text-xs font-bold text-white/60 uppercase">{d.name}</p>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-xs text-white/50">Realized</span>
                                                            <span className={`text-xs font-bold ${d.realized >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{fmtPnL(d.realized)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-xs text-white/50">Unrealized</span>
                                                            <span className={`text-xs font-bold ${d.unrealized >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{fmtPnL(d.unrealized)}</span>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Bar dataKey="realized" radius={[4, 4, 0, 0]} animationDuration={1500} name="Realized P&L">
                                        {assetChartData.map((d, i) => (
                                            <Cell key={i} fill={d.realized >= 0 ? '#00e676' : '#ff4d4d'} fillOpacity={0.75} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Per Asset Table */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-white/5">
                            <h2 className="font-semibold">FIFO Cost Basis P&amp;L Breakdown</h2>
                            <p className="text-xs text-white/40 mt-1">Realized gains computed using first-in, first-out (FIFO) method</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        {['Asset', 'Qty Held', 'Avg Cost', 'Current', 'Realized P&L', 'Unrealized P&L', 'Short-Term', 'Long-Term', 'Trades'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs text-white/40 font-medium uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {assetPnL.length === 0 && (
                                        <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-white/40">No trade data available for P&amp;L calculation.</td></tr>
                                    )}
                                    {assetPnL.map(a => (
                                        <tr key={a.symbol} className="table-row">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${tokenColors[a.symbol] || tokenColors.DEFAULT}22`, color: tokenColors[a.symbol] || tokenColors.DEFAULT }}>
                                                        {a.symbol.slice(0, 2)}
                                                    </div>
                                                    <span className="font-medium text-sm">{a.symbol}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm">{Number(a.quantity).toLocaleString()}</td>
                                            <td className="px-5 py-4 text-sm">${fmt(a.avgBuyPrice)}</td>
                                            <td className="px-5 py-4 text-sm">${fmt(a.currentPrice)}</td>
                                            <td className="px-5 py-4">
                                                <span className={`text-sm font-semibold ${pnlColor(a.realizedPnL)}`}>{fmtPnL(Number(a.realizedPnL))}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-sm font-semibold ${pnlColor(a.unrealizedPnL)}`}>{fmtPnL(Number(a.unrealizedPnL))}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs px-2 py-1 rounded-full ${Number(a.shortTermGain) >= 0 ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red'}`}>
                                                    {fmtPnL(Number(a.shortTermGain))}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs px-2 py-1 rounded-full ${Number(a.longTermGain) >= 0 ? 'bg-neon-blue/10 text-neon-blue' : 'bg-neon-red/10 text-neon-red'}`}>
                                                    {fmtPnL(Number(a.longTermGain))}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-white/50">{a.totalTrades}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAX REPORT TAB ── */}
            {tab === 'tax' && (
                <div className="space-y-6">
                    {/* Year Selector */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-white/50">Tax Year:</span>
                        <div className="relative">
                            <button
                                onClick={() => setYearOpen(v => !v)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
                            >
                                {taxYear} <ChevronDown size={14} className={`transition-transform ${yearOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {yearOpen && (
                                <div className="absolute top-full mt-1 left-0 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10">
                                    {TAX_YEARS.map(y => (
                                        <button
                                            key={y}
                                            onClick={() => { setTaxYear(y); setYearOpen(false) }}
                                            className={`w-full px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors ${y === taxYear ? 'text-accent-400' : 'text-white/70'}`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {taxLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent-400" size={28} /></div>
                    ) : taxSummary ? (
                        <>
                            {/* Tax Summary Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Short-Term Gains', value: fmtPnL(taxSummary.shortTermGains), color: Number(taxSummary.shortTermGains) >= 0 ? 'text-neon-green' : 'text-neon-red', tip: 'Taxed as ordinary income' },
                                    { label: 'Long-Term Gains', value: fmtPnL(taxSummary.longTermGains), color: Number(taxSummary.longTermGains) >= 0 ? 'text-neon-blue' : 'text-neon-red', tip: 'Lower preferential rate' },
                                    { label: 'Net Capital Gains', value: fmtPnL(taxSummary.netCapitalGains), color: Number(taxSummary.netCapitalGains) >= 0 ? 'text-neon-green' : 'text-neon-red', tip: 'Short + Long combined' },
                                    { label: 'Total Fees Paid', value: `$${fmt(taxSummary.totalFeesPaid)}`, color: 'text-white/70', tip: 'Deductible in some jurisdictions' },
                                ].map(c => (
                                    <div key={c.label} className="stat-card">
                                        <p className="text-xs text-white/40 uppercase tracking-wider">{c.label}</p>
                                        <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                                        <p className="text-[10px] text-white/25 mt-1">{c.tip}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Taxable Events Table */}
                            <div className="glass-card overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <div>
                                        <h2 className="font-semibold">Taxable Events – {taxYear}</h2>
                                        <p className="text-xs text-white/40 mt-1">{taxSummary.taxableSellEvents} sell event{taxSummary.taxableSellEvents !== 1 ? 's' : ''} (Form 8949 style)</p>
                                    </div>
                                    <button onClick={handleExport} disabled={exporting} className="btn-primary flex items-center gap-2 text-xs px-3 py-1.5">
                                        <Download size={13} />
                                        Download CSV
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                {['Date', 'Asset', 'Quantity Sold', 'Sale Price', 'Gain / Loss', 'Holding Type'].map(h => (
                                                    <th key={h} className="px-6 py-3 text-left text-xs text-white/40 font-medium uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {taxSummary.taxEvents.length === 0 && (
                                                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-white/40">No taxable sell events in {taxYear}.</td></tr>
                                            )}
                                            {taxSummary.taxEvents.map((e, i) => (
                                                <tr key={i} className="table-row">
                                                    <td className="px-6 py-3.5 text-sm text-white/60">{e.date}</td>
                                                    <td className="px-6 py-3.5 text-sm font-medium">{e.symbol}</td>
                                                    <td className="px-6 py-3.5 text-sm">{e.quantity}</td>
                                                    <td className="px-6 py-3.5 text-sm">${fmt(e.salePrice)}</td>
                                                    <td className="px-6 py-3.5">
                                                        <span className={`text-sm font-semibold ${Number(e.gain) >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                                            {fmtPnL(Number(e.gain))}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${e.holdingType === 'LONG_TERM' ? 'bg-neon-blue/10 text-neon-blue' : 'bg-neon-yellow/10 text-neon-yellow'}`}>
                                                            {e.holdingType === 'LONG_TERM' ? 'Long-Term' : 'Short-Term'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Disclaimer */}
                            <div className="glass-card p-4 bg-gradient-to-br from-neon-yellow/5 to-transparent border border-neon-yellow/10">
                                <div className="flex items-start gap-3">
                                    <Info size={16} className="text-neon-yellow mt-0.5 shrink-0" />
                                    <p className="text-xs text-white/50">
                                        <span className="font-medium text-neon-yellow">Disclaimer: </span>
                                        This report is for informational purposes only and does not constitute tax advice. Gains are estimated
                                        using the FIFO method. Please consult a qualified tax professional for your jurisdiction.
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-white/40 py-8 text-center">Unable to load tax summary. Please try again.</p>
                    )}
                </div>
            )}

            {/* ── TAX HINTS TAB ── */}
            {tab === 'hints' && (
                <div className="space-y-4">
                    <p className="text-sm text-white/50">
                        Crypto tax strategies to help maximise your after-tax returns. These are general tips — always consult a professional.
                    </p>
                    {TAX_HINTS.map((hint) => (
                        <div key={hint.title} className={`glass-card p-5 bg-gradient-to-br ${hint.bg} to-transparent`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-lg bg-white/5 shrink-0`}>
                                    <hint.icon size={18} className={hint.color} />
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${hint.color}`}>{hint.title}</p>
                                    <p className="text-sm text-white/60 mt-1.5 leading-relaxed">{hint.tip}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Losing assets – harvest ideas */}
                    {assetPnL.filter(a => Number(a.unrealizedPnL) < 0).length > 0 && (
                        <div className="glass-card p-5 bg-gradient-to-br from-neon-orange/10 to-transparent">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={16} className="text-orange-400" />
                                <h3 className="font-semibold text-sm text-orange-400">Tax-Loss Harvesting Candidates</h3>
                            </div>
                            <p className="text-xs text-white/50 mb-3">These assets currently have unrealized losses that could offset gains:</p>
                            <div className="space-y-2">
                                {assetPnL.filter(a => Number(a.unrealizedPnL) < 0).map(a => (
                                    <div key={a.symbol} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <span className="text-sm font-medium">{a.symbol}</span>
                                        <span className="text-sm font-semibold text-neon-red">{fmtPnL(Number(a.unrealizedPnL))}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tax Season Reminder */}
                    <div className="glass-card p-4 bg-gradient-to-br from-neon-yellow/5 to-transparent border border-neon-yellow/10">
                        <div className="flex items-start gap-3">
                            <Calendar size={18} className="text-neon-yellow mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-neon-yellow">Tax Season Reminder</p>
                                <p className="text-xs text-white/40 mt-1">
                                    Export your portfolio data as CSV for tax reporting. Our CSV includes full trade history,
                                    FIFO cost basis, and a Form 8949-compatible gain/loss report. Consult a crypto-savvy
                                    tax professional for your jurisdiction.
                                </p>
                                <button onClick={handleExport} disabled={exporting} className="mt-3 btn-primary text-xs flex items-center gap-2 w-fit">
                                    <Download size={13} />
                                    {exporting ? 'Exporting...' : 'Download Tax CSV'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
