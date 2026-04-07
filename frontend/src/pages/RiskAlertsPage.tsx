import { useState, useEffect } from 'react'
import {
    ShieldAlert, ShieldCheck, ShieldX, AlertTriangle,
    Search, ExternalLink, CheckCircle, Loader2, PieChart as PieIcon, Activity
} from 'lucide-react'
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    Radar, RadarChart, PolarGrid, PolarAngleAxis 
} from 'recharts'
import { api } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

interface RiskAlert {
    id: string
    symbol: string
    tokenAddress: string
    riskLevel: 'high' | 'medium' | 'low'
    alertType: string
    description: string
    detectedAt: string
    isDismissed: boolean
}

const riskConfig = {
    high: { color: 'text-neon-red', bg: 'bg-neon-red/10', border: 'border-neon-red/20', icon: ShieldX, label: 'High Risk' },
    medium: { color: 'text-neon-yellow', bg: 'bg-neon-yellow/10', border: 'border-neon-yellow/20', icon: AlertTriangle, label: 'Medium Risk' },
    low: { color: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/20', icon: ShieldCheck, label: 'Low Risk' },
}

export default function RiskAlertsPage() {
    const { showToast } = useToast()
    const [alerts, setAlerts] = useState<RiskAlert[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
    const [search, setSearch] = useState('')
    const [checkAddress, setCheckAddress] = useState('')
    const [checking, setChecking] = useState(false)

    useEffect(() => {
        loadAlerts()
    }, [])

    const loadAlerts = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/risk/alerts')
            setAlerts(data)
        } catch (error) {
            console.error('Failed to load risk alerts:', error)
        } finally {
            setLoading(false)
        }
    }

    const filtered = alerts
        .filter((a) => filter === 'all' || a.riskLevel === filter)
        .filter((a) => a.symbol.toLowerCase().includes(search.toLowerCase()))

    const activeAlerts = alerts.filter((a) => !a.isDismissed)
    const highCount = activeAlerts.filter((a) => a.riskLevel === 'high').length
    const medCount = activeAlerts.filter((a) => a.riskLevel === 'medium').length

    const dismissAlert = async (id: string) => {
        try {
            await api.post(`/risk/${id}/dismiss`)
            setAlerts(alerts.map((a) => a.id === id ? { ...a, isDismissed: true } : a))
            showToast('Alert dismissed successfully', 'info')
        } catch (error) {
            console.error('Failed to dismiss alert:', error)
            showToast('Failed to dismiss alert.', 'error')
        }
    }

    const handleCheck = async () => {
        if (!checkAddress) return
        setChecking(true)
        try {
            const { data } = await api.post('/risk/check', { tokenAddress: checkAddress })
            if (data.isScam || data.riskLevel === 'high') {
                showToast(`🚨 High-risk token detected! Risk Level: ${data.riskLevel.toUpperCase()}`, 'warning')
            } else {
                showToast('Token scan complete. No high-risk issues detected.', 'success')
            }
            // Reaload alerts in case checking the token created a new saved alert
            await loadAlerts()
            setCheckAddress('')
        } catch (error) {
            console.error('Failed to check token:', error)
            showToast('Failed to analyze token contract.', 'error')
        } finally {
            setChecking(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-accent-400 mb-4" size={32} />
                <p className="text-white/40">Loading risk analysis...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Risk Alerts</h1>
                    <p className="text-white/40 text-sm mt-1">Monitor token risks and scam detection results</p>
                </div>
                <button
                    onClick={async () => {
                        try {
                            setLoading(true);
                            await api.post('/risk/seed-me');
                            await loadAlerts();
                            showToast(`Portfolio scan complete! Found ${highCount} high risk assets.`, highCount > 0 ? 'warning' : 'success');
                        } catch (err) {
                            console.error(err);
                            showToast('Failed to scan portfolio.', 'error');
                        } finally {
                            setLoading(false);
                        }
                    }}
                    className="btn-primary bg-accent-500/20 text-accent-400 border border-accent-500/30 hover:bg-accent-500/30"
                >
                    Scan Portfolio
                </button>
            </div>

            {/* Warning Banner */}
            {highCount > 0 && (
                <div className="p-4 rounded-xl bg-neon-red/5 border border-neon-red/20 flex items-start gap-3">
                    <ShieldX size={22} className="text-neon-red mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-neon-red">
                            {highCount} High-Risk Token{highCount > 1 ? 's' : ''} Detected
                        </p>
                        <p className="text-sm text-white/50 mt-1">
                            Your portfolio contains tokens flagged as high risk. Review the alerts below and take appropriate action.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats & Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Stat Cards */}
                <div className="space-y-4">
                    <div className="stat-card bg-gradient-to-br from-neon-red/10 to-transparent flex items-center justify-between">
                        <div>
                            <p className="text-xs text-white/40 uppercase tracking-wider">High Risk</p>
                            <p className="text-3xl font-bold text-neon-red mt-1">{highCount}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-neon-red/10">
                            <ShieldX size={24} className="text-neon-red" />
                        </div>
                    </div>
                    <div className="stat-card bg-gradient-to-br from-neon-yellow/10 to-transparent flex items-center justify-between">
                        <div>
                            <p className="text-xs text-white/40 uppercase tracking-wider">Medium Risk</p>
                            <p className="text-3xl font-bold text-neon-yellow mt-1">{medCount}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-neon-yellow/10">
                            <AlertTriangle size={24} className="text-neon-yellow" />
                        </div>
                    </div>
                </div>

                {/* Middle Column: Distribution Charts */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Donut Chart */}
                    <div className="glass-card p-6 flex flex-col items-center justify-center relative">
                        <div className="w-full text-left mb-4">
                            <h3 className="font-semibold flex items-center gap-2 mb-1">
                                <PieIcon size={18} className="text-accent-400" />
                                Risk Distribution
                            </h3>
                            <p className="text-[10px] text-white/30 font-medium uppercase tracking-tight">Portfolio security audit</p>
                        </div>
                        
                        <div className="w-[180px] h-[180px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'High', value: highCount, color: '#ff4d4d' },
                                            { name: 'Med', value: medCount, color: '#ffd93d' },
                                            { name: 'Safe', value: Math.max(0, 10 - highCount - medCount), color: '#00e676' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {[
                                            { color: '#ff4d4d' },
                                            { color: '#ffd93d' },
                                            { color: '#00e676' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className={`text-3xl font-bold ${highCount > 0 ? 'text-neon-red' : medCount > 0 ? 'text-neon-yellow' : 'text-neon-green'}`}>
                                    {highCount > 2 ? 'F' : highCount > 0 ? 'D' : medCount > 0 ? 'B' : 'A+'}
                                </span>
                                <span className="text-[8px] text-white/30 uppercase tracking-widest font-bold mt-1">Safety Rating</span>
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart for Risk Vectors */}
                    <div className="glass-card p-6 flex flex-col items-center justify-center">
                        <div className="w-full text-left mb-4">
                            <h3 className="font-semibold flex items-center gap-2 mb-1 text-white">
                                <Activity size={18} className="text-neon-red" />
                                Risk DNA Analysis
                            </h3>
                            <p className="text-[10px] text-white/30 font-medium uppercase tracking-tight">Threat vector visualization</p>
                        </div>
                        
                        <div className="w-full h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                    { subject: 'Name Check', A: highCount * 30, fullMark: 100 },
                                    { subject: 'Code Check', A: medCount * 25, fullMark: 100 },
                                    { subject: 'Blacklist',   A: highCount > 0 ? 90 : 0, fullMark: 100 },
                                    { subject: 'Liquidity',    A: 40, fullMark: 100 },
                                    { subject: 'Volatility',   A: (highCount + medCount) * 10, fullMark: 100 },
                                ]}>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                                    <Radar
                                        name="Project Risk"
                                        dataKey="A"
                                        stroke={highCount > 0 ? "#ff4d4d" : "#ffd93d"}
                                        fill={highCount > 0 ? "#ff4d4d" : "#ffd93d"}
                                        fillOpacity={0.5}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Risk Legend */}
                        <div className="w-full mt-4 grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5 opacity-60">
                                <div className="w-1.5 h-1.5 rounded-full bg-neon-red" />
                                <span className="text-[9px] uppercase tracking-tighter">Higher Area = More Danger</span>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-60 justify-end">
                                <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                                <span className="text-[9px] uppercase tracking-tighter">Inner Shape = Safe</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Check Token */}
            <div className="glass-card p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ShieldAlert size={18} className="text-accent-400" />
                    Check Token Address
                </h3>
                <div className="flex gap-3">
                    <input
                        className="input-field flex-1"
                        placeholder="Enter contract address (0x...)"
                        value={checkAddress}
                        onChange={(e) => setCheckAddress(e.target.value)}
                    />
                    <button onClick={handleCheck} className="btn-primary flex items-center gap-2" disabled={checking}>
                        {checking ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Search size={16} /> Check
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
                            }`}
                    >
                        {f === 'all' ? 'All Alerts' : `${f} Risk`}
                    </button>
                ))}
                <div className="flex-1" />
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        className="input-field pl-9 w-48 text-xs py-2"
                        placeholder="Search tokens..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Alert Cards */}
            <div className="space-y-4">
                {filtered.map((alert) => {
                    const cfg = riskConfig[alert.riskLevel]
                    const Icon = cfg.icon
                    return (
                        <div
                            key={alert.id}
                            className={`glass-card p-5 border ${cfg.border} ${alert.isDismissed ? 'opacity-50' : ''} transition-all`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-2.5 rounded-xl ${cfg.bg}`}>
                                        <Icon size={20} className={cfg.color} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-semibold">{alert.symbol}</span>
                                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold ${cfg.bg} ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase">
                                                {alert.alertType.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/50 mt-1 max-w-2xl">{alert.description}</p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                                            <span>Address: {alert.tokenAddress || 'Unknown'}</span>
                                            <span>Detected: {new Date(alert.detectedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {!alert.isDismissed && (
                                        <button
                                            onClick={() => dismissAlert(alert.id)}
                                            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-neon-green transition-colors"
                                            title="Dismiss"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors" title="View on Etherscan">
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
