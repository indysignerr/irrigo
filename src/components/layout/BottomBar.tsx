'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, MapPin, Map, Bell, User } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/sites', icon: MapPin, label: 'Sites' },
  { href: '/map', icon: Map, label: 'Carte' },
  { href: '/notifications', icon: Bell, label: 'Alertes' },
  { href: '/settings', icon: User, label: 'Profil' },
]

export function BottomBar() {
  const pathname = usePathname()
  const { unreadCount } = useAppStore()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 py-1 relative',
                isActive ? 'text-matcha' : 'text-gray-400'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.href === '/notifications' && unreadCount > 0 && (
                <span className="absolute top-0 right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
