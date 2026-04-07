import { useState, useEffect } from 'react'
import { 
    Plus, ArrowUpRight, ArrowDownRight, 
    Search, Loader2, X, Calendar, DollarSign, Tag 
} from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

interface Trade {
    id: string
    symbol: string
    side: 'buy' | 'sell'
    quantity: number
    price: number
    fee: number
    total: number
    exchangeName: string
    tradedAt: string
}

export default function TradesPage() {
    const { showToast } = useToast()
    const [trades, setTrades] = useState<Trade[]>([])
    const [holdings, setHoldings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({
        symbol: '',
        side: 'buy',
        quantity: '',
        price: '',
        fee: '0',
        tradedAt: new Date().toISOString().split('T')[0]
    })

    // Compute available balance for current form symbol
    const currentHolding = holdings.find(h => h.symbol.toUpperCase() === form.symbol.toUpperCase())
    const availableBalance = currentHolding?.quantity || 0
    const isOverSelling = form.side === 'sell' && Number(form.quantity) > availableBalance

    useEffect(() => {
        loadTrades()
        loadHoldings()
    }, [])

    const loadHoldings = async () => {
        try {
            const { data } = await api.get('/holdings')
            setHoldings(data)
        } catch (err) {
            console.error('Failed to load holdings:', err)
        }
    }

    const loadTrades = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/trades')
            setTrades(data)
        } catch (err) {
            console.error('Failed to load trades:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!form.symbol || !form.quantity || !form.price) return
        setSubmitting(true)
        try {
            const payload = {
                ...form,
                quantity: Number(form.quantity),
                price: Number(form.price),
                fee: Number(form.fee),
                symbol: form.symbol.toUpperCase(),
                tradedAt: new Date(form.tradedAt).toISOString()
            }
            await api.post('/trades', payload)
            
            showToast(`Successfully recorded ${payload.side} for ${payload.quantity} ${payload.symbol}`, 'success')

            await Promise.all([loadTrades(), loadHoldings()])
            setShowModal(false)
            setForm({
                symbol: '',
                side: 'buy',
                quantity: '',
                price: '',
                fee: '0',
                tradedAt: new Date().toISOString().split('T')[0]
            })
        } catch (err: any) {
            console.error('Failed to save trade:', err)
            const msg = err.response?.data?.message || err.message || 'Failed to record transaction.'
            showToast(msg, 'error')
            
            // UX: Reset the form even on error if the user wants to start over
            setForm({
                symbol: '',
                side: 'buy',
                quantity: '',
                price: '',
                fee: '0',
                tradedAt: new Date().toISOString().split('T')[0]
            })
            setShowModal(false) // Close the modal to give "new record transaction" feel
        } finally {
            setSubmitting(false)
        }
    }

    const filtered = trades.filter(t => 
        t.symbol.toLowerCase().includes(search.toLowerCase())
    )

    const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Trade History</h1>
                    <p className="text-white/40 text-sm mt-1">View and record your crypto transactions</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Record Trade
                </button>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search by symbol..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field pl-11"
                    />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="px-6 py-4 text-left text-xs text-white/40 font-medium uppercase">Date</th>
                                <th className="px-6 py-4 text-left text-xs text-white/40 font-medium uppercase">Type</th>
                                <th className="px-6 py-4 text-left text-xs text-white/40 font-medium uppercase">Asset</th>
                                <th className="px-6 py-4 text-left text-xs text-white/40 font-medium uppercase">Price</th>
                                <th className="px-6 py-4 text-left text-xs text-white/40 font-medium uppercase">Quantity</th>
                                <th className="px-6 py-4 text-right text-xs text-white/40 font-medium uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin text-accent-400 mx-auto mb-2" size={24} />
                                        <p className="text-white/40">Loading trades...</p>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                                        No trades found.
                                    </td>
                                </tr>
                            ) : filtered.map((trade) => (
                                <tr key={trade.id} className="table-row border-b border-white/5 last:border-0">
                                    <td className="px-6 py-4 text-sm text-white/60">
                                        {new Date(trade.tradedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                            trade.side === 'buy' ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red'
                                        }`}>
                                            {trade.side === 'buy' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                            {trade.side}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-sm">{trade.symbol}</td>
                                    <td className="px-6 py-4 text-sm text-white/60">${fmt(trade.price)}</td>
                                    <td className="px-6 py-4 text-sm text-white/60">{trade.quantity}</td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold">${fmt(trade.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="glass-card p-6 w-full max-w-md animate-fade-in relative" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Record Transaction</h3>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl">
                                <button 
                                    onClick={() => setForm({...form, side: 'buy'})}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${form.side === 'buy' ? 'bg-neon-green text-black' : 'text-white/40 hover:text-white'}`}
                                >
                                    BUY
                                </button>
                                <button 
                                    onClick={() => setForm({...form, side: 'sell'})}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${form.side === 'sell' ? 'bg-neon-red text-black' : 'text-white/40 hover:text-white'}`}
                                >
                                    SELL
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Asset Symbol</label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                                        <input 
                                            className="input-field pl-10" 
                                            placeholder="BTC" 
                                            value={form.symbol} 
                                            onChange={e => setForm({...form, symbol: e.target.value.toUpperCase()})} 
                                        />
                                    </div>
                                    {form.side === 'sell' && form.symbol && (
                                        <div className={`mt-1.5 flex justify-between items-center px-1`}>
                                            <span className="text-[10px] text-white/40 uppercase">Available Balance</span>
                                            <span className={`text-[10px] font-bold ${availableBalance > 0 ? 'text-accent-400' : 'text-neon-red'}`}>
                                                {availableBalance.toLocaleString()} {form.symbol}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Quantity</label>
                                        <input 
                                            type="number" 
                                            className="input-field" 
                                            placeholder="0.00" 
                                            value={form.quantity} 
                                            onChange={e => setForm({...form, quantity: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Price (USD)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                                            <input 
                                                type="number" 
                                                className="input-field pl-8" 
                                                placeholder="0.00" 
                                                value={form.price} 
                                                onChange={e => setForm({...form, price: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Fee (USD)</label>
                                        <input 
                                            type="number" 
                                            className="input-field" 
                                            placeholder="0.00" 
                                            value={form.fee} 
                                            onChange={e => setForm({...form, fee: e.target.value})} 
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                                            <input 
                                                type="date" 
                                                className="input-field pl-10" 
                                                value={form.tradedAt} 
                                                onChange={e => setForm({...form, tradedAt: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>

                            <button 
                                onClick={handleSave} 
                                disabled={submitting || isOverSelling || !form.symbol || !form.quantity || !form.price}
                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 mt-2 ${
                                    isOverSelling ? 'bg-white/5 text-white/20 cursor-not-allowed' :
                                    form.side === 'buy' ? 'bg-neon-green text-black hover:shadow-[0_0_20px_rgba(0,230,118,0.3)]' : 
                                    'bg-neon-red text-white hover:shadow-[0_0_20px_rgba(255,23,68,0.3)]'
                                }`}
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : 
                                 isOverSelling ? 'Insufficient Balance' : 'Confirm Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
