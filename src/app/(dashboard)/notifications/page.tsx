'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Bell, CheckCircle, Clock, Loader2, User, AtSign, Calendar } from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { Notification } from '@/types'

const typeIcons: Record<string, React.ReactNode> = {
  problem_reported: <AlertTriangle className="w-4 h-4 text-red-500" />,
  validation_pending: <Clock className="w-4 h-4 text-amber-500" />,
  assignment: <User className="w-4 h-4 text-blue-500" />,
  maintenance_reminder: <Calendar className="w-4 h-4 text-blue-500" />,
  mention: <AtSign className="w-4 h-4 text-matcha" />,
  problem_resolved: <CheckCircle className="w-4 h-4 text-green-500" />,
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { currentMember, setUnreadCount } = useAppStore()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!currentMember) return

    supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', currentMember.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[])
        setLoading(false)
      })
  }, [currentMember])

  const markAllRead = async () => {
    if (!currentMember) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', currentMember.id)
      .eq('is_read', false)

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    toast.success('Toutes les notifications marquées comme lues')
  }

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n))
      useAppStore.getState().decrementUnread()
    }
    if (notif.related_site_id) {
      router.push(`/sites/${notif.related_site_id}`)
    }
  }

  // Group by date
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const d = new Date(n.created_at)
    let key = format(d, 'dd MMMM yyyy', { locale: fr })
    if (isToday(d)) key = "Aujourd'hui"
    else if (isYesterday(d)) key = 'Hier'
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {})

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={markAllRead}>
          Tout marquer comme lu
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-matcha" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, notifs]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{date}</h3>
              <div className="space-y-2">
                {notifs.map((n) => (
                  <Card
                    key={n.id}
                    className={`rounded-xl shadow-sm border cursor-pointer transition-colors hover:border-matcha/30 ${!n.is_read ? 'bg-matcha/5 border-matcha/20' : 'border-gray-200'}`}
                    onClick={() => handleClick(n)}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="mt-0.5">{typeIcons[n.type] || <Bell className="w-4 h-4" />}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </span>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-matcha flex-shrink-0 mt-1.5" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
