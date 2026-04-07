import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Wallet,
    BarChart3,
    ShieldAlert,
    Link2,
    FileText,
    LogOut,
    X,
    Hexagon,
    History,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/portfolio', icon: Wallet, label: 'Portfolio' },
    { to: '/trades', icon: History, label: 'Trades' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/risk', icon: ShieldAlert, label: 'Risk Alerts' },
    { to: '/exchanges', icon: Link2, label: 'Exchanges' },
    { to: '/reports', icon: FileText, label: 'P&L & Reports' },
]

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { signOut } = useAuth()
    const location = useLocation()

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
            )}

            <aside
                className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
                style={{
                    width: '260px',
                    background: 'linear-gradient(180deg, rgba(18,18,26,0.98) 0%, rgba(10,10,15,0.98) 100%)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                {/* Logo */}
                <div className="flex items-center justify-between px-6 py-6">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Hexagon size={32} className="text-accent-500" fill="rgba(108,92,231,0.2)" />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-accent-400">BX</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight">
                                <span className="text-white">Block</span>
                                <span className="text-accent-400">folioX</span>
                            </h1>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Portfolio Tracker</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden text-white/40 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Nav links */}
                <nav className="flex-1 px-3 mt-2 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={() => `sidebar-link ${location.pathname === item.to ? 'active' : ''}`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="px-3 pb-6">
                    <div className="glass-card p-4 mb-4">
                        <p className="text-xs text-white/40 mb-1">Portfolio Status</p>
                        <p className="text-sm font-semibold text-neon-green">● Connected</p>
                    </div>
                    <button
                        onClick={signOut}
                        className="sidebar-link w-full text-neon-red/70 hover:text-neon-red"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    )
}
