'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { StatusBadge } from '@/components/sites/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, Loader2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { PendingChange } from '@/types'

export default function ValidationsPage() {
  const [changes, setChanges] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const { currentMember } = useAppStore()
  const supabase = createClient()

  const load = async () => {
    if (!currentMember) return
    const { data } = await supabase
      .from('pending_changes')
      .select('*, requester:members!pending_changes_requested_by_fkey(*), schedule:schedules(*), problem:problems(*, site:sites(client_name))')
      .eq('company_id', currentMember.company_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (data) setChanges(data as PendingChange[])
    setLoading(false)
  }

  useEffect(() => { load() }, [currentMember])

  const handleAction = async (change: PendingChange, action: 'approved' | 'rejected') => {
    if (!currentMember) return

    await supabase
      .from('pending_changes')
      .update({
        status: action,
        reviewed_by: currentMember.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', change.id)

    // If approved, apply the change
    if (action === 'approved') {
      if (change.change_type === 'update_schedule' && change.schedule_id && change.new_value) {
        await supabase.from('schedules').update(change.new_value).eq('id', change.schedule_id)
      }
      if (change.change_type === 'resolve_problem' && change.problem_id) {
        await supabase.from('problems').update({
          status: 'resolved',
          validated_by: currentMember.id,
          validated_at: new Date().toISOString(),
        }).eq('id', change.problem_id)
      }
    }

    // Notify the requester
    await supabase.from('notifications').insert({
      company_id: currentMember.company_id,
      recipient_id: change.requested_by,
      type: 'validation_pending',
      title: action === 'approved' ? 'Modification approuvée' : 'Modification rejetée',
      message: `Votre demande de ${change.change_type === 'update_schedule' ? 'modification de programmation' : 'résolution de problème'} a été ${action === 'approved' ? 'approuvée' : 'rejetée'}`,
    })

    toast.success(action === 'approved' ? 'Changement approuvé' : 'Changement rejeté')
    load()
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Validations' }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Validations en attente</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-matcha" />
        </div>
      ) : changes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune validation en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map((c) => (
            <Card key={c.id} className="rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status="pending" />
                      <span className="text-xs text-muted-foreground">
                        {c.change_type === 'update_schedule' ? 'Modification programmation' : 'Résolution problème'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">
                      Demandé par <span className="font-medium">{c.requester?.first_name} {c.requester?.last_name}</span>
                    </p>
                    {c.old_value && (
                      <div className="text-xs text-muted-foreground bg-gray-50 rounded-lg p-2">
                        <span className="font-medium">Ancien :</span> {JSON.stringify(c.old_value)}
                      </div>
                    )}
                    {c.new_value && (
                      <div className="text-xs text-matcha bg-matcha/5 rounded-lg p-2">
                        <span className="font-medium">Nouveau :</span> {JSON.stringify(c.new_value)}
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="rounded-full h-9 w-9 text-red-500 hover:bg-red-50" onClick={() => handleAction(c, 'rejected')}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="icon" className="rounded-full h-9 w-9 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleAction(c, 'approved')}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
