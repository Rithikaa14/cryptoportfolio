import { useState, useEffect } from 'react'
import {
    Plus, Search, ArrowUpRight, ArrowDownRight, Trash2,
    Edit3, X, SortAsc, SortDesc, Loader2
} from 'lucide-react'
import { api } from '../lib/api'

interface Holding {
    id: string
    symbol: string
    name: string
    quantity: number
    avgBuyPrice: number
    currentPrice: number
    source: string
}

const tokenColors: Record<string, string> = {
    BTC: '#f7931a', ETH: '#627eea', SOL: '#00e676', ADA: '#00b0ff',
    DOGE: '#c2a633', AVAX: '#e84142', DOT: '#e6007e', LINK: '#2a5ada',
}

interface HoldingForm {
    symbol: string
    name: string
    quantity: string
    avgBuyPrice: string
}

export default function PortfolioPage() {
    const [holdings, setHoldings] = useState<Holding[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortField, setSortField] = useState<string>('value')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<HoldingForm>({ symbol: '', name: '', quantity: '', avgBuyPrice: '' })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        loadHoldings()
    }, [])

    const loadHoldings = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/holdings')
            setHoldings(data)
        } catch (err) {
            console.error('Failed to load holdings:', err)
        } finally {
            setLoading(false)
        }
    }

    const filtered = holdings
        .filter((h) => h.symbol.toLowerCase().includes(search.toLowerCase()) || h.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            let va: number, vb: number
            if (sortField === 'value') {
                va = a.quantity * a.currentPrice
                vb = b.quantity * b.currentPrice
            } else if (sortField === 'pnl') {
                va = (a.currentPrice - a.avgBuyPrice) * a.quantity
                vb = (b.currentPrice - b.avgBuyPrice) * b.quantity
            } else if (sortField === 'price') {
                va = a.currentPrice
                vb = b.currentPrice
            } else {
                va = a.symbol.charCodeAt(0)
                vb = b.symbol.charCodeAt(0)
            }
            return sortDir === 'asc' ? va - vb : vb - va
        })

    const totalValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0)
    const totalCost = holdings.reduce((s, h) => s + h.quantity * h.avgBuyPrice, 0)
    const totalPnL = totalValue - totalCost

    const openAdd = () => {
        setEditId(null)
        setForm({ symbol: '', name: '', quantity: '', avgBuyPrice: '' })
        setShowModal(true)
    }

    const openEdit = (h: Holding) => {
        setEditId(h.id)
        setForm({ symbol: h.symbol, name: h.name, quantity: String(h.quantity), avgBuyPrice: String(h.avgBuyPrice || 0) })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.symbol || !form.quantity) return
        setSubmitting(true)

        try {
            const payload = {
                symbol: form.symbol.toUpperCase(),
                name: form.name,
                quantity: Number(form.quantity),
                avgBuyPrice: Number(form.avgBuyPrice),
                currentPrice: Number(form.avgBuyPrice), // Fallback until sync
                source: 'manual'
            }

            if (editId) {
                await api.put(`/holdings/${editId}`, payload)
            } else {
                await api.post('/holdings', payload)
            }

            await loadHoldings()
            setShowModal(false)
        } catch (error) {
            console.error('Failed to save holding:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this holding?')) return
        try {
            await api.delete(`/holdings/${id}`)
            await loadHoldings()
        } catch (error) {
            console.error('Failed to delete holding:', error)
        }
    }

    const toggleSort = (field: string) => {
        if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('desc') }
    }

    const SortIcon = sortDir === 'asc' ? SortAsc : SortDesc

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Portfolio</h1>
                    <p className="text-white/40 text-sm mt-1">Manage your crypto holdings</p>
                </div>
                <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Add Asset
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="stat-card">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Total Value</p>
                    <p className="text-xl font-bold mt-1">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Total Cost</p>
                    <p className="text-xl font-bold mt-1">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Total P&L</p>
                    <p className={`text-xl font-bold mt-1 ${totalPnL >= 0 ? 'text-neon-green glow-green' : 'text-neon-red glow-red'}`}>
                        {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search tokens..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field pl-11"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                {[
                                    { key: 'symbol', label: 'Token' },
                                    { key: 'quantity', label: 'Quantity' },
                                    { key: 'price', label: 'Price' },
                                    { key: 'value', label: 'Value' },
                                    { key: 'pnl', label: 'P&L' },
                                ].map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => toggleSort(col.key)}
                                        className="px-6 py-4 text-left text-xs text-white/40 font-medium uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {sortField === col.key && <SortIcon size={12} />}
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-right text-xs text-white/40 font-medium uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading holdings...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                                        No holdings found. Add an asset to get started.
                                    </td>
                                </tr>
                            ) : filtered.map((h) => {
                                const value = h.quantity * (h.currentPrice || 0)
                                const pnl = ((h.currentPrice || 0) - (h.avgBuyPrice || 0)) * h.quantity
                                const pnlPct = h.avgBuyPrice ? (((h.currentPrice || 0) - h.avgBuyPrice) / h.avgBuyPrice) * 100 : 0
                                return (
                                    <tr key={h.id} className="table-row">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                                    style={{ background: `${tokenColors[h.symbol] || '#6c5ce7'}20`, color: tokenColors[h.symbol] || '#6c5ce7' }}
                                                >
                                                    {h.symbol.slice(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{h.symbol}</p>
                                                    <p className="text-xs text-white/40">{h.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{h.quantity.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm">${(h.currentPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-sm font-medium">${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                {pnl >= 0 ? <ArrowUpRight size={14} className="text-neon-green" /> : <ArrowDownRight size={14} className="text-neon-red" />}
                                                <span className={`text-sm font-medium ${pnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                                                    {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className={`text-xs ml-1 ${pnl >= 0 ? 'text-neon-green/60' : 'text-neon-red/60'}`}>
                                                    ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEdit(h)} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                                                    <Edit3 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(h.id)} disabled={submitting} className="p-2 rounded-lg hover:bg-neon-red/10 text-white/40 hover:text-neon-red transition-colors disabled:opacity-50">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
                        <div className="glass-card p-6 w-full max-w-md mx-4 animate-fade-in" style={{ background: 'rgba(18,18,26,0.95)' }} onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">{editId ? 'Edit Asset' : 'Add New Asset'}</h3>
                                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">Symbol</label>
                                    <input className="input-field" placeholder="BTC" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">Name</label>
                                    <input className="input-field" placeholder="Bitcoin" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-white/50 mb-1.5">Quantity</label>
                                        <input className="input-field" type="number" placeholder="0.00" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/50 mb-1.5">Avg Buy Price</label>
                                        <input className="input-field" type="number" placeholder="0.00" value={form.avgBuyPrice} onChange={(e) => setForm({ ...form, avgBuyPrice: e.target.value })} />
                                    </div>
                                </div>
                                <button onClick={handleSave} disabled={submitting} className="btn-primary w-full py-3 flex justify-center items-center gap-2">
                                    {submitting && <Loader2 className="animate-spin" size={16} />}
                                    {editId ? 'Update Asset' : 'Add Asset'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
