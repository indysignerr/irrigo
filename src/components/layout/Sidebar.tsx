'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MapPin,
  Map,
  Bell,
  Settings,
  Calendar,
  Users,
  CheckCircle,
  Droplets,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/sites', icon: MapPin, label: 'Sites' },
  { href: '/map', icon: Map, label: 'Carte' },
  { href: '/calendar', icon: Calendar, label: 'Calendrier' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
]

const adminItems = [
  { href: '/validations', icon: CheckCircle, label: 'Validations' },
  { href: '/team', icon: Users, label: 'Équipe' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { currentMember, unreadCount } = useAppStore()
  const isAdmin = currentMember?.role === 'admin'
  const isChef = currentMember?.role === 'chef_equipe'

  return (
    <aside className="hidden lg:flex flex-col w-16 hover:w-56 transition-all duration-200 bg-white border-r border-gray-200 group overflow-hidden">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200">
        <div className="w-8 h-8 bg-matcha rounded-lg flex items-center justify-center flex-shrink-0">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Irrigo
        </span>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium transition-colors relative',
                isActive
                  ? 'bg-matcha/10 text-matcha'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
              {item.href === '/notifications' && unreadCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}

        {(isAdmin || isChef) && (
          <>
            <div className="mx-4 my-3 border-t border-gray-100" />
            {adminItems
              .filter((item) => {
                if (item.href === '/team' || item.href === '/settings') return isAdmin
                return true
              })
              .map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-matcha/10 text-matcha'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
          </>
        )}
      </nav>
    </aside>
  )
}
