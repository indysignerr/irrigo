'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { TopBar } from '@/components/layout/TopBar'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/stores/useAppStore'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, currentMember } = useAuth()
  const { setUnreadCount } = useAppStore()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentMember) {
      router.push('/login')
    }
  }, [loading, currentMember, router])

  useEffect(() => {
    if (!currentMember) return

    const supabase = createClient()

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', currentMember.id)
      .eq('is_read', false)
      .then(({ count }) => {
        setUnreadCount(count ?? 0)
      })

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentMember.id}`,
        },
        () => {
          useAppStore.getState().incrementUnread()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentMember, setUnreadCount])

  if (loading || !currentMember) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-matcha" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomBar />
    </div>
  )
}
