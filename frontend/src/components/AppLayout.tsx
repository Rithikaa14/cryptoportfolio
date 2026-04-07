import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="min-h-screen bg-dark-900">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="lg:ml-[260px] flex flex-col min-h-screen">
                <TopNav onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
