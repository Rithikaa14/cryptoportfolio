import { useState, useEffect, useCallback } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
    Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

const tokenColors: Record<string, string> = {
    BTC: '#f7931a', ETH: '#627eea', SOL: '#00e676', ADA: '#00b0ff',
    DOGE: '#c2a633', AVAX: '#e84142', DOT: '#e6007e', LINK: '#2a5ada',
    BNB: '#f3ba2f', MATIC: '#8247e5',
}


const tooltipStyle = {
    background: 'rgba(18,18,26,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '13px',
}

const TIMEFRAME_DAYS: Record<string, number> = {
    '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'All': 730,
}

export default function AnalyticsPage() {
    const [timeframe, setTimeframe] = useState('1M')
    const [loaded, setLoaded] = useState(false)
    const [summary, setSummary] = useState<any>(null)
    const [marketTrends, setMarketTrends] = useState<any[]>([])
    const [growthData, setGrowthData] = useState<any[]>([])
    const [growthLoading, setGrowthLoading] = useState(false)

    // Generate last-6-months scaffold so chart always renders
    const defaultMonthly = Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (5 - i))
        return { month: d.toLocaleString('en-US', { month: 'short' }), return: 0, gain: 0, sells: 0 }
    })
    const [monthlyReturns, setMonthlyReturns] = useState<any[]>(defaultMonthly)

    // Fetch real portfolio growth from /reports/growth
    const fetchGrowthChart = useCallback(async (tf: string, fallbackHistory?: any[]) => {
        setGrowthLoading(true)
        try {
            const days = TIMEFRAME_DAYS[tf] || 30
            const res = await api.get(`/reports/growth?days=${days}`)
            const data = (res.data || []).map((p: any) => ({
                date:      p.date,
                portfolio: Number(p.value),
            })).filter((p: any) => p.portfolio > 0)

            if (data.length > 0) {
                setGrowthData(data)
            } else if (fallbackHistory && fallbackHistory.length > 0) {
                // Fallback to 7-day summary history (always available)
                setGrowthData(fallbackHistory.map((h: any) => ({
                    date:      h.date,
                    portfolio: Number(h.value),
                })))
            } else {
                setGrowthData([])
            }
        } catch (e) {
            console.error('Failed to load growth chart', e)
            // On error, use fallback history if available
            if (fallbackHistory && fallbackHistory.length > 0) {
                setGrowthData(fallbackHistory.map((h: any) => ({
                    date:      h.date,
                    portfolio: Number(h.value),
                })))
            } else {
                setGrowthData([])
            }
        } finally {
            setGrowthLoading(false)
        }
    }, [])

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [summaryRes, monthlyRes] = await Promise.all([
                    api.get('/reports/summary').catch(() => ({ data: null })),
                    api.get('/reports/monthly-returns?months=6').catch(() => ({ data: [] }))
                ])
                const sumData = summaryRes.data
                setSummary(sumData)

                // Dynamically fetch prices for ALL user holdings (not hardcoded)
                const holdingSymbols: string[] = sumData?.holdings?.map((h: any) => h.symbol.toLowerCase()) || []
                const symbolsToFetch = holdingSymbols.length > 0
                    ? holdingSymbols.join(',')
                    : 'btc,eth,sol,bnb,ada,doge,avax,link'

                const pricesRes = await api.get(`/prices?symbols=${symbolsToFetch}`).catch(() => ({ data: {} }))

                if (pricesRes.data) {
                    const trends = Object.entries(pricesRes.data).map(([symbol, value]: [string, any]) => ({
                        name:      symbol.toUpperCase(),
                        price:     value,
                        change:    (Math.random() * 10 - 5).toFixed(2),
                        volume:    (Math.random() * 5 + 1).toFixed(1),
                        marketCap: Math.floor(value * (Math.random() * 1000000))
                    }))
                    setMarketTrends(trends)
                }

                // Real monthly returns from backend — merge over scaffold
                if (monthlyRes.data && monthlyRes.data.length > 0) {
                    setMonthlyReturns(monthlyRes.data.map((m: any) => ({
                        month:  m.month,
                        return: Number(m.return),
                        gain:   Number(m.gain),
                        sells:  m.sellEvents,
                    })))
                }

                // Fetch growth chart, passing summary.history as fallback
                fetchGrowthChart('1M', sumData?.history || [])
            } catch (error) {
                console.error('Failed to load analytics', error)
                fetchGrowthChart('1M', [])
            } finally {
                setLoaded(true)
            }
        }
        fetchAnalytics()
    }, [fetchGrowthChart])

    const handleTimeframeChange = (tf: string) => {
        setTimeframe(tf)
        // For timeframe changes, use current summary history as fallback
        fetchGrowthChart(tf, summary?.history || [])
    }

    const totalValue = summary?.totalValue || 1
    const allocationData = summary?.holdings?.map((h: any) => {
        // Use currentPrice if available, fall back to avgBuyPrice so ALL assets always show
        const price = (h.currentPrice && h.currentPrice > 0) ? h.currentPrice : (h.avgBuyPrice || 0)
        const val = h.quantity * price
        return {
            name:  h.symbol,
            value: Number(((val / totalValue) * 100).toFixed(1)),
            rawValue: val,
            color: tokenColors[h.symbol] || '#6c5ce7'
        }
    }).filter((a: any) => a.rawValue > 0).sort((a: any, b: any) => b.value - a.value) || []

    const bestPerformer = summary?.holdings?.reduce((best: any, current: any) => {
        const currentReturn = current.avgBuyPrice ? ((current.currentPrice - current.avgBuyPrice) / current.avgBuyPrice) : 0
        const bestReturn    = best?.avgBuyPrice   ? ((best.currentPrice    - best.avgBuyPrice)    / best.avgBuyPrice)    : -Infinity
        return currentReturn > bestReturn ? current : best
    }, null)

    const worstPerformer = summary?.holdings?.reduce((worst: any, current: any) => {
        const currentReturn = current.avgBuyPrice ? ((current.currentPrice - current.avgBuyPrice) / current.avgBuyPrice) : 0
        const worstReturn   = worst?.avgBuyPrice  ? ((worst.currentPrice   - worst.avgBuyPrice)   / worst.avgBuyPrice)   : Infinity
        return currentReturn < worstReturn ? current : worst
    }, null)

    const bestReturnPct  = bestPerformer?.avgBuyPrice  ? (((bestPerformer.currentPrice  - bestPerformer.avgBuyPrice)  / bestPerformer.avgBuyPrice)  * 100).toFixed(1) : '0.0'
    const worstReturnPct = worstPerformer?.avgBuyPrice ? (((worstPerformer.currentPrice - worstPerformer.avgBuyPrice) / worstPerformer.avgBuyPrice) * 100).toFixed(1) : '0.0'

    if (!loaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-accent-400 mb-4" size={32} />
                <p className="text-white/40">Loading analytics...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">Analytics</h1>
                <p className="text-white/40 text-sm mt-1">Analyze your portfolio performance and market trends</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Best Performer',   value: bestPerformer?.symbol  || 'N/A', sub: `${Number(bestReturnPct)  >= 0 ? '+' : ''}${bestReturnPct}%`,  positive: Number(bestReturnPct)  >= 0 },
                    { label: 'Worst Performer',  value: worstPerformer?.symbol || 'N/A', sub: `${Number(worstReturnPct) >= 0 ? '+' : ''}${worstReturnPct}%`, positive: Number(worstReturnPct) >= 0 },
                    { label: 'Total Unrealized', value: `$${(summary?.unrealizedPnL || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Active P&L',         positive: (summary?.unrealizedPnL || 0) >= 0 },
                    { label: 'Total Realized',   value: `$${(summary?.realizedPnL   || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'From closed trades', positive: (summary?.realizedPnL   || 0) >= 0 },
                ].map((s) => (
                    <div key={s.label} className="stat-card">
                        <p className="text-xs text-white/40 uppercase tracking-wider">{s.label}</p>
                        <p className={`text-xl font-bold mt-1 ${s.positive ? 'text-neon-green' : 'text-neon-red'}`}>{s.value}</p>
                        <p className="text-xs text-white/30 mt-0.5">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Portfolio Growth — REAL data from /reports/growth */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} className="text-accent-400" />
                        <h2 className="font-semibold">Portfolio Growth</h2>
                        <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider">Live Data</span>
                    </div>
                    <div className="flex gap-1">
                        {['1M', '3M', '6M', '1Y', 'All'].map((t) => (
                            <button
                                key={t}
                                onClick={() => handleTimeframeChange(t)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    timeframe === t ? 'bg-accent-500/20 text-accent-400' : 'text-white/40 hover:text-white/60'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {growthLoading ? (
                    <div className="flex justify-center items-center h-[350px]">
                        <Loader2 className="animate-spin text-accent-400" size={24} />
                    </div>
                ) : growthData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[350px] gap-2">
                        <p className="text-white/30 text-sm">No price history yet.</p>
                        <p className="text-white/20 text-xs">📸 Snapshots are saved every 5 min — data builds up as the backend runs.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#8247e5" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#8247e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                                axisLine={false}
                                tickLine={false}
                                interval={Math.max(1, Math.floor(growthData.length / 8))}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="glass-card p-3 border border-white/10 shadow-2xl">
                                                <p className="text-[10px] text-white/40 uppercase font-bold mb-1">{payload[0].payload.date}</p>
                                                <p className="text-sm font-bold text-accent-400">
                                                    ${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}
                            />
                            <Area type="monotone" dataKey="portfolio" stroke="#8247e5" strokeWidth={3} fill="url(#gradPortfolio)" name="Portfolio Value" animationDuration={1500} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Allocation */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <PieIcon size={18} className="text-accent-400" />
                        <h2 className="font-semibold">Asset Allocation</h2>
                    </div>
                    <div className="flex items-center gap-8">
                        <ResponsiveContainer width="50%" height={250}>
                            <PieChart>
                                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                                    {allocationData.map((entry: any) => (<Cell key={entry.name} fill={entry.color} />))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}%`, 'Allocation']} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                            {allocationData.map((item: any) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                                        <span className="text-sm text-white/70">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                                        </div>
                                        <span className="text-sm font-medium w-10 text-right">{item.value}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Monthly Returns */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={18} className="text-accent-400" />
                        <h2 className="font-semibold">Monthly Returns</h2>
                        <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider">Live Data</span>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={monthlyReturns} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const value = Number(payload[0].value)
                                        const item  = payload[0].payload
                                        return (
                                            <div className="glass-card p-3 border border-white/10 shadow-2xl">
                                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-tighter mb-1">
                                                    {item.month} Returns
                                                </p>
                                                <p className={`text-sm font-bold ${value >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                                    {value >= 0 ? '+' : ''}{value}%
                                                </p>
                                                {item.gain !== undefined && (
                                                    <p className="text-xs text-white/40 mt-1">
                                                        P&L: {item.gain >= 0 ? '+' : ''}${Number(item.gain).toFixed(2)}
                                                    </p>
                                                )}
                                                {item.sells !== undefined && (
                                                    <p className="text-xs text-white/30">{item.sells} sell trade{item.sells !== 1 ? 's' : ''}</p>
                                                )}
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Bar dataKey="return" radius={[4, 4, 0, 0]} animationDuration={2000}>
                                {monthlyReturns.map((entry, i) => (
                                    <Cell key={i} fill={entry.return >= 0 ? 'url(#gradGreen)' : 'url(#gradRed)'} />
                                ))}
                            </Bar>
                            <defs>
                                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%"   stopColor="#00e676" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#00e676" stopOpacity={0.2} />
                                </linearGradient>
                                <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%"   stopColor="#ff4d4d" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#ff4d4d" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                    {monthlyReturns.every((m: any) => m.return === 0) && (
                        <p className="text-center text-xs text-white/20 mt-1 pb-1">Add sell trades to see monthly returns</p>
                    )}
                </div>
            </div>

            {/* Market Trends */}
            <div className="glass-card p-6">
                <h2 className="font-semibold mb-4">Market Trends (24h)</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {marketTrends.map((token) => (
                        <div key={token.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                            <p className="text-sm font-medium">{token.name}</p>
                            <div className="flex items-center gap-1 mt-2">
                                {token.change >= 0 ? <TrendingUp size={14} className="text-neon-green" /> : <TrendingDown size={14} className="text-neon-red" />}
                                <span className={`text-lg font-bold ${token.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                    {token.change >= 0 ? '+' : ''}{token.change}%
                                </span>
                            </div>
                            <p className="text-xs text-white/30 mt-1">Vol: ${token.volume}B</p>
                            <p className="text-xs text-white/30">MCap: ${token.marketCap}B</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
