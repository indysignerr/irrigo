'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Clock, CheckCircle, XCircle, Timer, Wrench } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Intervention } from '@/types'

export default function InterventionsPage() {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all')
  const { currentMember } = useAppStore()
  const supabase = createClient()

  useEffect(() => {
    if (!currentMember) return
    let query = supabase
      .from('interventions')
      .select('*, site:sites(client_name, city), technician:members!interventions_technician_id_fkey(first_name, last_name), template:intervention_templates(name)')
      .eq('company_id', currentMember.company_id)
      .order('started_at', { ascending: false })

    if (currentMember.role === 'technicien') {
      query = query.eq('technician_id', currentMember.id)
    }

    query.limit(50).then(({ data }) => {
      if (data) setInterventions(data as Intervention[])
      setLoading(false)
    })
  }, [currentMember])

  const filtered = filter === 'all' ? interventions : interventions.filter(i => i.status === filter)

  const statusConfig = {
    in_progress: { label: 'En cours', icon: Timer, className: 'bg-blue-100 text-blue-700 border-blue-200' },
    completed: { label: 'Terminé', icon: CheckCircle, className: 'bg-green-100 text-green-700 border-green-200' },
    cancelled: { label: 'Annulé', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' },
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Interventions' }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Interventions</h1>
        <Link href="/interventions/new">
          <Button className="rounded-full bg-matcha hover:bg-matcha-dark text-white gap-2">
            <Plus className="w-4 h-4" /> Démarrer une intervention
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <Select value={filter} onValueChange={(v) => setFilter((v ?? 'all') as typeof filter)}>
          <SelectTrigger className="w-[180px] rounded-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-matcha" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune intervention</p>
          <Link href="/interventions/new">
            <Button variant="outline" className="mt-4 rounded-full">Démarrer la première</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => {
            const config = statusConfig[i.status]
            const Icon = config.icon
            return (
              <Link key={i.id} href={`/interventions/${i.id}`}>
                <Card className="rounded-xl shadow-sm border border-gray-200 hover:border-matcha/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{i.title}</h3>
                          <Badge variant="outline" className={`text-xs ${config.className}`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(i.site as unknown as { client_name: string })?.client_name}
                          {(i.site as unknown as { city?: string })?.city && ` · ${(i.site as unknown as { city: string }).city}`}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {i.technician && (
                            <span>{(i.technician as unknown as { first_name: string }).first_name} {(i.technician as unknown as { last_name: string }).last_name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(i.started_at), { addSuffix: true, locale: fr })}
                          </span>
                          {i.duration_minutes && (
                            <span>{Math.floor(i.duration_minutes / 60)}h{(i.duration_minutes % 60).toString().padStart(2, '0')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
