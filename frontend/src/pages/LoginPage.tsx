import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Hexagon, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn, signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            if (isSignUp) {
                const { error } = await signUp(email, password, displayName)
                if (error) throw error
            } else {
                const { error } = await signIn(email, password)
                if (error) throw error
            }
            navigate('/')
        } catch (err: any) {
            setError(err.message || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-dark-900 pointer-events-none">
                <div
                    className="absolute inset-0 animate-gradient opacity-30"
                    style={{
                        background: 'linear-gradient(135deg, #6c5ce7 0%, #00b0ff 25%, #7c4dff 50%, #00e676 75%, #6c5ce7 100%)',
                        backgroundSize: '400% 400%',
                    }}
                />
                <div className="absolute inset-0 bg-dark-900/70" />
                {/* Floating orbs */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-500/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-blue/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-neon-purple/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Login card */}
            <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
                <div className="glass-card p-8" style={{ background: 'rgba(18,18,26,0.85)' }}>
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative mb-4">
                            <Hexagon size={48} className="text-accent-500" fill="rgba(108,92,231,0.2)" />
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-accent-400">BX</span>
                        </div>
                        <h1 className="text-2xl font-bold">
                            <span className="text-white">Block</span>
                            <span className="text-accent-400">folioX</span>
                        </h1>
                        <p className="text-white/40 text-sm mt-1">
                            {isSignUp ? 'Create your account' : 'Welcome back, trader'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-neon-red/10 border border-neon-red/20 text-neon-red text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Display Name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="input-field pl-11"
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="input-field pl-11"
                            />
                        </div>

                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="input-field pl-11 pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
                            className="text-sm text-white/40 hover:text-accent-400 transition-colors"
                        >
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>
                    </div>

                    {/* Demo mode */}
                    <div className="mt-4 pt-4 border-t border-white/5 text-center">
                        <button
                            onClick={() => navigate('/')}
                            className="text-xs text-white/30 hover:text-white/50 transition-colors"
                        >
                            Continue in demo mode →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
