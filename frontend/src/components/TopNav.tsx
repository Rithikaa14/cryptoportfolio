import { useState, useEffect } from 'react'
import { Menu, Bell, Search, ChevronDown, User, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

interface TopNavProps {
    onMenuClick: () => void
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'RISK';
    isRead: boolean;
    createdAt: string;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showNotifications, setShowNotifications] = useState(false)

    useEffect(() => {
        if (user) {
            fetchNotifications()
            // Poll for notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000)
            return () => clearInterval(interval)
        }
    }, [user])

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications/unread')
            setNotifications(data)
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            await api.post('/notifications/read-all')
            setNotifications([])
            setShowNotifications(false)
        } catch (error) {
            console.error('Failed to mark all as read:', error)
        }
    }

    return (
        <header
            className="sticky top-0 z-30 flex items-center justify-between px-6 py-3"
            style={{
                background: 'rgba(10,10,15,0.8)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="lg:hidden text-white/60 hover:text-white">
                    <Menu size={22} />
                </button>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                    <Search size={16} className="text-white/30" />
                    <input
                        type="text"
                        placeholder="Search tokens, markets..."
                        className="bg-transparent text-sm text-white outline-none w-48 placeholder-white/30"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Live indicator */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20">
                    <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                    <span className="text-xs text-neon-green font-medium">Live</span>
                </div>

                {/* Notifications */}
                <div className="relative">
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <Bell size={18} className="text-white/60" />
                        {notifications.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-neon-red rounded-full" />
                        )}
                    </button>

                    {showNotifications && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowNotifications(false)}
                            />
                            <div className="absolute right-0 mt-2 w-80 glass-card p-4 z-50 animate-fade-in shadow-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold">Notifications</h3>
                                    {notifications.length > 0 && (
                                        <button 
                                            onClick={markAllAsRead}
                                            className="text-[10px] text-accent-400 hover:text-accent-300 transition-colors uppercase font-bold tracking-wider"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                    {notifications.length === 0 ? (
                                        <p className="text-center py-4 text-xs text-white/30 italic">No new notifications</p>
                                    ) : (
                                        notifications.map((n) => (
                                            <div key={n.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5">
                                                        {n.type === 'SUCCESS' && <CheckCircle2 size={14} className="text-neon-green" />}
                                                        {n.type === 'RISK' && <ShieldAlert size={14} className="text-neon-red" />}
                                                        {n.type === 'WARNING' && <AlertTriangle size={14} className="text-neon-yellow" />}
                                                        {n.type === 'INFO' && <Bell size={14} className="text-accent-400" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-white/90 truncate">{n.title}</p>
                                                        <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                                                        <p className="text-[9px] text-white/20 mt-1">
                                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Profile */}
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-neon-blue flex items-center justify-center">
                        <User size={14} className="text-white" />
                    </div>
                    <span className="hidden sm:inline text-sm text-white/70">
                        {user?.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown size={14} className="text-white/40" />
                </button>
            </div>
        </header>
    )
}
