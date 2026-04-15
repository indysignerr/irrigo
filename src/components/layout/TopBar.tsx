'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/useAppStore'

export function TopBar() {
  const [search, setSearch] = useState('')
  const router = useRouter()
  const { currentMember, unreadCount } = useAppStore()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/sites?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 lg:px-6 gap-4">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un site, membre..."
            className="pl-9 rounded-full bg-gray-50 border-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="relative lg:hidden"
          onClick={() => router.push('/notifications')}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {currentMember && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-matcha/20 flex items-center justify-center text-sm font-semibold text-matcha">
              {currentMember.first_name[0]}{currentMember.last_name[0]}
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {currentMember.first_name}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
