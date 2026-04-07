import { useState, useEffect } from 'react'
import {
    Link2, Plus, RefreshCw, Trash2, Shield, Eye, EyeOff,
    CheckCircle, XCircle, Clock, X, Loader2
} from 'lucide-react'
import { api } from '../lib/api'

interface Exchange {
    id: string
    name: string
    isActive: boolean
    lastSyncedAt: string | null
    balances: { symbol: string; amount: number; value: number }[]
}

const getExchangeIcon = (name: string) => {
    switch (name.toLowerCase()) {
        case 'binance': return '🟡'
        case 'coinbase': return '🔵'
        case 'kraken': return '🟣'
        case 'kucoin': return '🟢'
        default: return '🔗'
    }
}

const availableExchanges = [
    { name: 'Binance', icon: '🟡', supported: true },
    { name: 'Coinbase', icon: '🔵', supported: true },
    { name: 'Kraken', icon: '🟣', supported: true },
    { name: 'KuCoin', icon: '🟢', supported: false },
]

export default function ExchangesPage() {
    const [exchanges, setExchanges] = useState<Exchange[]>([])
    const [showModal, setShowModal] = useState(false)
    const [apiKey, setApiKey] = useState('')
    const [apiSecret, setApiSecret] = useState('')
    const [showSecret, setShowSecret] = useState(false)
    const [syncing, setSyncing] = useState<string | null>(null)
    const [connecting, setConnecting] = useState(false)
    const [selectedExchange, setSelectedExchange] = useState<any>(null)

    useEffect(() => {
        loadExchanges()
    }, [])

    const loadExchanges = async () => {
        try {
            const { data } = await api.get('/exchanges')
            // Mock empty balances for now since backend doesn't return them in this endpoint yet
            const formattedExchanges = data.map((e: any) => ({ ...e, balances: [] }))
            setExchanges(formattedExchanges)
        } catch (error) {
            console.error('Failed to load exchanges:', error)
        }
    }

    const handleConnect = async () => {
        if (!apiKey || !apiSecret || !selectedExchange) return
        setConnecting(true)
        try {
            await api.post('/exchanges/connect', {
                exchangeName: selectedExchange.name,
                apiKey,
                apiSecret
            })
            await loadExchanges()
            setApiKey('')
            setApiSecret('')
            setShowModal(false)
            setSelectedExchange(null)
        } catch (error: any) {
            console.error('Failed to connect exchange:', error)
            const message = error.response?.data?.error || 'Failed to connect to exchange. Please verify your API keys and check the backend logs.'
            alert(message)
        } finally {
            setConnecting(false)
        }
    }

    const handleSync = async (id: string) => {
        setSyncing(id)
        try {
            await api.post(`/exchanges/${id}/sync`)
            await loadExchanges()
            alert('Exchange synced successfully. Holdings have been updated in your portfolio.')
        } catch (error) {
            console.error('Failed to sync exchange:', error)
            alert('Failed to sync. Please try again.')
        } finally {
            setSyncing(null)
        }
    }

    const handleDisconnect = async (id: string) => {
        if (!confirm('Are you sure you want to disconnect this exchange? This will stop syncing your balances.')) return
        try {
            await api.delete(`/exchanges/${id}`)
            await loadExchanges()
        } catch (error) {
            console.error('Failed to disconnect exchange:', error)
        }
    }

    const toggleActive = async (id: string) => {
        try {
            await api.post(`/exchanges/${id}/toggle`)
            await loadExchanges()
        } catch (error: any) {
            console.error('Failed to toggle exchange status:', error)
            const message = error.response?.data?.error || 'Failed to update status. Please try again.'
            alert(message)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Exchanges</h1>
                    <p className="text-white/40 text-sm mt-1">Connect and manage your exchange accounts</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Connect Exchange
                </button>
            </div>

            {/* Connected Exchanges */}
            {exchanges.length > 0 ? (
                <div className="space-y-4">
                    {exchanges.map((exchange) => (
                        <div key={exchange.id} className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{getExchangeIcon(exchange.name)}</span>
                                    <div>
                                        <h3 className="font-semibold">{exchange.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {exchange.isActive ? (
                                                <span className="flex items-center gap-1 text-xs text-neon-green">
                                                    <CheckCircle size={12} /> Connected
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-white/40">
                                                    <XCircle size={12} /> Paused
                                                </span>
                                            )}
                                            {exchange.lastSyncedAt && (
                                                <span className="flex items-center gap-1 text-xs text-white/30">
                                                    <Clock size={12} /> {new Date(exchange.lastSyncedAt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleSync(exchange.id)}
                                        disabled={syncing === exchange.id}
                                        className="btn-secondary flex items-center gap-2 text-xs py-2"
                                    >
                                        <RefreshCw size={14} className={syncing === exchange.id ? 'animate-spin' : ''} />
                                        {syncing === exchange.id ? 'Syncing...' : 'Sync'}
                                    </button>
                                    <button
                                        onClick={() => toggleActive(exchange.id)}
                                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${exchange.isActive ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' : 'bg-white/5 text-white/40 border border-white/10'
                                            }`}
                                    >
                                        {exchange.isActive ? 'Active' : 'Paused'}
                                    </button>
                                    <button
                                        onClick={() => handleDisconnect(exchange.id)}
                                        className="p-2 rounded-lg hover:bg-neon-red/10 text-white/40 hover:text-neon-red transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Balances */}
                            {exchange.balances.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Synced Balances</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {exchange.balances.map((b) => (
                                            <div key={b.symbol} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">{b.symbol}</span>
                                                    <span className="text-xs text-white/40">{b.amount}</span>
                                                </div>
                                                <p className="text-sm font-semibold mt-1">${b.value.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-12 text-center">
                    <Link2 size={48} className="mx-auto text-white/20 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Exchanges Connected</h3>
                    <p className="text-white/40 text-sm mb-6">Connect your exchange account to automatically sync your balances and trades</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary">Connect Exchange</button>
                </div>
            )}

            {/* Available Exchanges */}
            <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Available Exchanges</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availableExchanges.map((ex) => (
                        <div
                            key={ex.name}
                            className={`p-4 rounded-xl border text-center transition-all ${ex.supported ? 'bg-white/[0.02] border-accent-500/20 hover:border-accent-500/40 cursor-pointer' : 'bg-white/[0.01] border-white/5 opacity-50'
                                }`}
                            onClick={() => {
                                if (ex.supported) {
                                    setSelectedExchange(ex)
                                    setShowModal(true)
                                }
                            }}
                        >
                            <span className="text-2xl">{ex.icon}</span>
                            <p className="text-sm font-medium mt-2">{ex.name}</p>
                            <p className="text-[10px] text-white/30 mt-1">{ex.supported ? 'Supported' : 'Coming Soon'}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Security Info */}
            <div className="glass-card p-6 bg-gradient-to-br from-accent-500/5 to-transparent">
                <div className="flex items-start gap-3">
                    <Shield size={20} className="text-accent-400 mt-0.5 shrink-0" />
                    <div>
                        <h3 className="font-semibold text-sm">Your API Keys are Secure</h3>
                        <p className="text-sm text-white/40 mt-1">
                            API keys are encrypted with AES-256-GCM before storage. We only request read-only permissions.
                            Keys never leave our secure backend.
                        </p>
                    </div>
                </div>
            </div>

            {/* Connect Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                        <div className="glass-card p-6 w-full max-w-lg mx-4 animate-fade-in" style={{ background: 'rgba(18,18,26,0.95)' }} onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <span>{selectedExchange?.icon}</span>
                                    Connect {selectedExchange?.name}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
                            </div>

                            <div className="p-4 rounded-xl bg-neon-yellow/5 border border-neon-yellow/20 mb-6">
                                <p className="text-xs text-neon-yellow">
                                    ⚠️ Only enable <strong>Read-Only</strong> permissions on your API key. Never use keys with write or withdrawal permissions.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">API Key</label>
                                    <input
                                        className="input-field font-mono text-xs"
                                        placeholder={`Enter your ${selectedExchange?.name} API key`}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">API Secret</label>
                                    <div className="relative">
                                        <input
                                            type={showSecret ? 'text' : 'password'}
                                            className="input-field font-mono text-xs pr-11"
                                            placeholder={`Enter your ${selectedExchange?.name} API secret`}
                                            value={apiSecret}
                                            onChange={(e) => setApiSecret(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecret(!showSecret)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                        >
                                            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <button onClick={handleConnect} disabled={connecting} className="btn-primary w-full py-3 flex justify-center items-center gap-2">
                                    {connecting && <Loader2 className="animate-spin" size={16} />}
                                    {connecting ? 'Connecting...' : 'Connect Exchange'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
