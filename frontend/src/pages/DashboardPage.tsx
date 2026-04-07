import { useState, useEffect } from 'react'
import {
    TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, AlertTriangle, Activity
} from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
    BarChart, Bar
} from 'recharts'
import { api } from '../lib/api'

const tokenColors: Record<string, string> = {
    BTC: '#f7931a', ETH: '#627eea', SOL: '#00e676', ADA: '#00b0ff',
    DOGE: '#c2a633', AVAX: '#e84142', DOT: '#e6007e', LINK: '#2a5ada',
    BNB: '#f3ba2f', MATIC: '#8247e5',
}

export default function DashboardPage() {
    const [loaded, setLoaded] = useState(false)
    const [summary, setSummary] = useState<any>(null)
    const [recentTrades, setRecentTrades] = useState<any[]>([])
    const [riskAlerts, setRiskAlerts] = useState<any[]>([])
    const [marketPrices, setMarketPrices] = useState<any>({})

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch summary first to get holdings
                const summaryRes = await api.get('/reports/summary')
                const summaryData = summaryRes.data
                setSummary(summaryData)

                // 2. Based on holdings, determine symbols for prices
                const holdingSymbols = (summaryData?.holdings || []).map((h: any) => h.symbol.toLowerCase())
                const defaultSymbols = ['btc', 'eth', 'sol', 'ada', 'doge', 'link', 'avax', 'dot', 'bnb', 'matic']
                const allSymbols = Array.from(new Set([...defaultSymbols, ...holdingSymbols])).join(',')

                // 3. Fetch the rest in parallel
                const [tradesRes, riskRes, pricesRes] = await Promise.all([
                    api.get('/trades/recent?todayOnly=true').catch(() => ({ data: [] })),
                    api.get('/risk/alerts').catch(() => ({ data: [] })),
                    api.get(`/prices?symbols=${allSymbols}`).catch(() => ({ data: {} }))
                ])

                setRecentTrades(tradesRes.data || [])
                // Filter out dismissed alerts
                setRiskAlerts((riskRes.data || []).filter((a: any) => !a.isDismissed))
                setMarketPrices(pricesRes.data || {})
            } catch (err) {
                console.error('Failed to load dashboard data', err)
            } finally {
                setLoaded(true)
            }
        }
        fetchData()
    }, [])

    const stats = [
        {
            label: 'Total Portfolio',
            value: `$${(summary?.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: '',
            positive: true,
            icon: DollarSign,
            gradient: 'from-accent-500/20 to-neon-blue/10',
        },
        {
            label: 'Unrealized P/L',
            value: `$${(summary?.unrealizedPnL || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: '',
            positive: (summary?.unrealizedPnL || 0) >= 0,
            icon: TrendingUp,
            gradient: (summary?.unrealizedPnL || 0) >= 0 ? 'from-neon-green/20 to-neon-green/5' : 'from-neon-red/20 to-neon-red/5',
        },
        {
            label: 'Total Assets',
            value: (summary?.totalAssets || 0).toString(),
            change: '',
            positive: true,
            icon: Activity,
            gradient: 'from-neon-blue/20 to-neon-purple/10',
        },
        {
            label: 'Risk Alerts',
            value: riskAlerts.length.toString(),
            change: riskAlerts.filter((a: any) => a.riskLevel === 'high').length + ' high risk',
            positive: riskAlerts.length === 0,
            icon: AlertTriangle,
            gradient: riskAlerts.length > 0 ? 'from-neon-red/20 to-neon-yellow/10' : 'from-neon-green/20 to-neon-blue/10',
        },
    ]

    const totalValue = summary?.totalValue || 1 // Avoid divide by zero
    const getHashCode = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    };

    const allocationData = (summary?.holdings || []).map((h: any) => {
        const val = h.quantity * (h.currentPrice || 0)
        const percentage = (val / totalValue) * 100
        const displayValue = percentage < 0.1 && h.quantity > 0 ? 0.1 : Number(percentage.toFixed(1))
        
        return {
            name: h.symbol,
            value: displayValue,
            realValue: val,
            color: tokenColors[h.symbol] || `hsl(${getHashCode(h.symbol) % 360}, 70%, 60%)`
        }
    }).filter((a: any) => a.realValue > 0 || a.value > 0) || []

    const portfolioHistory = summary?.history || []

    return (
        <div className={`space-y-6 ${loaded ? 'animate-fade-in' : 'opacity-0'}`}>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-white/40 text-sm mt-1">
                    {summary?.totalValue > 0 ? "Welcome back! Here's your portfolio overview." : "Welcome! Top up your portfolio to see performance."}
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div
                        key={stat.label}
                        className={`stat-card bg-gradient-to-br ${stat.gradient}`}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-bold mt-2">{stat.value}</p>
                                {stat.change && (
                                    <div className="flex items-center gap-1 mt-1">
                                        {stat.positive ? (
                                            <ArrowUpRight size={14} className="text-neon-green" />
                                        ) : (
                                            <ArrowDownRight size={14} className="text-neon-red" />
                                        )}
                                        <span className={`text-xs font-medium ${stat.positive ? 'text-neon-green' : 'text-neon-red'}`}>
                                            {stat.change}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5">
                                <stat.icon size={20} className={stat.positive ? 'text-accent-400' : 'text-neon-red'} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Live Market Updates */}
            {Object.keys(marketPrices).length > 0 && (
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-accent-400 animate-pulse" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Live Market Updates</h2>
                        </div>
                    </div>
                    <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
                        {Object.entries(marketPrices).map(([symbol, price]: [string, any]) => {
                            const change = (Math.random() * 4 - 2).toFixed(2); // Simulated 24h change for effect
                            const isPositive = Number(change) >= 0;
                            return (
                                <div key={symbol} className="flex-shrink-0 flex items-center gap-3 p-3 rounded-xl bg-white/5 min-w-[140px]">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ background: `${tokenColors[symbol.toUpperCase()] || '#6c5ce7'}20`, color: tokenColors[symbol.toUpperCase()] || '#6c5ce7' }}
                                    >
                                        {symbol.toUpperCase().slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{symbol.toUpperCase()}</p>
                                        <p className="text-sm">${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                                        <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
                                            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            <span>{isPositive ? '+' : ''}{change}%</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Portfolio Chart */}
                <div className="xl:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Portfolio Performance</h2>
                        <div className="flex gap-1">
                            {['7D', '1M', '3M', '1Y'].map((t) => (
                                <button
                                    key={t}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${t === '1M' ? 'bg-accent-500/20 text-accent-400' : 'text-white/40 hover:text-white/60'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={portfolioHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00c2ff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8247e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} 
                                axisLine={false} 
                                tickLine={false}
                                minTickGap={30}
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
                                            <div className="glass-card p-3 border border-white/10 shadow-2xl animate-scale-in">
                                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-tighter mb-1">
                                                    {payload[0].payload.date}
                                                </p>
                                                <p className="text-sm font-bold text-white">
                                                    ${Number(payload[0].value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-accent-400 shadow-[0_0_8px_rgba(0,194,255,0.6)]" />
                                                    <span className="text-[10px] text-accent-400 font-medium tracking-tight">Portfolio Value</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="url(#colorValue)" 
                                strokeWidth={3} 
                                fill="url(#colorValue)" 
                                animationDuration={1500}
                                activeDot={{ r: 5, stroke: 'rgba(255,255,255,0.2)', strokeWidth: 6 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Allocation Pie */}
                <div className="glass-card p-6 flex flex-col">
                    <h2 className="font-semibold mb-1">Asset Allocation</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-4">Portfolio composition</p>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-full h-[220px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {allocationData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="glass-card p-3 border border-white/10 shadow-2xl animate-scale-in">
                                                        <p className="text-[10px] text-white/40 uppercase font-bold tracking-tighter mb-1">
                                                            {data.name}
                                                        </p>
                                                        <p className="text-sm font-bold text-white">
                                                            {data.value}%
                                                        </p>
                                                        <p className="text-[10px] text-white/40 mt-1">
                                                            ${data.realValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold">{allocationData.length}</span>
                                <span className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Assets</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                            {allocationData.map((item: any) => (
                                <div key={item.name} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                                        <span className="text-[11px] font-medium text-white/60 group-hover:text-white transition-colors">{item.name}</span>
                                    </div>
                                    <span className="text-[11px] font-bold">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Performance Bar Chart */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp size={18} className="text-neon-green" />
                            Asset Performance
                        </h3>
                        <p className="text-xs text-white/40 mt-1 tracking-tight">Market value vs. Entry cost across holdings</p>
                    </div>
                </div>
                
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={allocationData.slice(0, 10)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)', fontWeight: 600 }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <YAxis 
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} 
                                axisLine={false} 
                                tickLine={false} 
                                tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="glass-card p-3 border border-white/10 shadow-2xl animate-scale-in">
                                                <p className="text-[10px] text-white/40 uppercase font-bold tracking-tighter mb-1">
                                                    {payload[0].payload.name}
                                                </p>
                                                <p className="text-sm font-bold text-white">
                                                    Current Value: ${payload?.[0]?.value?.toLocaleString()}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                                    <span className="text-[10px] text-white/60">Portfolio weight: {payload[0].payload.value}%</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar 
                                dataKey="realValue" 
                                radius={[6, 6, 0, 0]}
                                animationDuration={1500}
                            >
                                {allocationData.slice(0, 10).map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent Trades */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Recent Trades</h2>
                        <button className="text-xs text-accent-400 hover:text-accent-300 transition-colors">View All</button>
                    </div>
                    <div className="space-y-3">
                        {recentTrades.length === 0 ? (
                            <p className="text-xs text-white/40 py-4 text-center">No recent trades found.</p>
                        ) : recentTrades.map((trade: any) => (
                            <div key={trade.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.side === 'buy' ? 'bg-neon-green/10' : 'bg-neon-red/10'
                                        }`}>
                                        {trade.side === 'buy' ? (
                                            <ArrowUpRight size={14} className="text-neon-green" />
                                        ) : (
                                            <ArrowDownRight size={14} className="text-neon-red" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{trade.symbol}</p>
                                        <p className="text-xs text-white/40 capitalize">{trade.side}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">{trade.quantity} {trade.symbol}</p>
                                    <p className="text-xs text-white/40">${(trade.quantity * trade.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <span className="text-xs text-white/30">
                                    {trade.tradedAt ? new Date(trade.tradedAt).toLocaleDateString() : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Risk Alerts */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Risk Alerts</h2>
                        <span className="badge-red">{riskAlerts.length} Active</span>
                    </div>
                    <div className="space-y-3">
                        {riskAlerts.length === 0 ? (
                            <p className="text-xs text-white/40 py-4 text-center">No active risk alerts.</p>
                        ) : riskAlerts.map((alert: any) => (
                            <div key={alert.id} className={`p-4 rounded-xl border ${alert.alertType === 'rugpull_warning' || alert.alertType === 'contract_risk'
                                ? 'bg-neon-red/5 border-neon-red/20'
                                : 'bg-neon-yellow/5 border-neon-yellow/20'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <AlertTriangle
                                        size={18}
                                        className={(alert.alertType === 'rugpull_warning' || alert.alertType === 'contract_risk') ? 'text-neon-red mt-0.5' : 'text-neon-yellow mt-0.5'}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{alert.symbol}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${(alert.alertType === 'rugpull_warning' || alert.alertType === 'contract_risk') ? 'bg-neon-red/20 text-neon-red' : 'bg-neon-yellow/20 text-neon-yellow'
                                                }`}>
                                                {alert.alertType.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/50 mt-1">{alert.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
