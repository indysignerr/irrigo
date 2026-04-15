'use client'

import { useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge, ZoneTypeBadge, dayLabel } from './StatusBadge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { toast } from 'sonner'
import type { Zone, Schedule } from '@/types'
import { Clock, Droplets } from 'lucide-react'

interface ZoneAccordionProps {
  zones: Zone[]
  siteId: string
  onUpdate: () => void
}

export function ZoneAccordion({ zones, siteId, onUpdate }: ZoneAccordionProps) {
  const supabase = createClient()
  const { currentMember } = useAppStore()

  const updateZoneStatus = async (zoneId: string, newStatus: string) => {
    const isDirectUpdate = currentMember?.role === 'admin' || currentMember?.role === 'chef_equipe'

    if (!isDirectUpdate) {
      toast.info('Votre modification sera envoyée en validation')
    }

    const { error } = await supabase
      .from('zones')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', zoneId)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
      return
    }

    // Check if all zones are "fait" => cascade to site
    const { data: allZones } = await supabase
      .from('zones')
      .select('id, status')
      .eq('site_id', siteId)

    if (allZones) {
      const allDone = allZones.every((z) => z.status === 'fait' || (z.id === zoneId && newStatus === 'fait'))
      const anyProblem = allZones.some((z) => z.status === 'probleme' || (z.id === zoneId && newStatus === 'probleme'))

      let siteStatus = 'a_faire'
      if (newStatus === 'probleme' || anyProblem) siteStatus = 'probleme'
      else if (allDone && newStatus === 'fait') siteStatus = 'fait'

      await supabase
        .from('sites')
        .update({ status: siteStatus, updated_at: new Date().toISOString() })
        .eq('id', siteId)
    }

    toast.success('Statut mis à jour')
    onUpdate()
  }

  return (
    <Accordion multiple className="space-y-2">
      {zones.map((zone) => (
        <AccordionItem key={zone.id} value={zone.id} className="border border-gray-200 rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-3 text-left">
              <Droplets className="w-4 h-4 text-matcha flex-shrink-0" />
              <span className="font-medium text-sm">{zone.name}</span>
              <ZoneTypeBadge type={zone.type} />
              <StatusBadge status={zone.status} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-3">
            {zone.schedules && zone.schedules.length > 0 ? (
              <div className="space-y-2">
                {zone.schedules.map((s) => (
                  <ScheduleItem key={s.id} schedule={s} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune programmation</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-muted-foreground">Changer le statut :</span>
              <Select value={zone.status} onValueChange={(v) => v && updateZoneStatus(zone.id, v)}>
                <SelectTrigger className="w-[130px] h-8 text-xs rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fait">Fait</SelectItem>
                  <SelectItem value="a_faire">À faire</SelectItem>
                  <SelectItem value="probleme">Problème</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function ScheduleItem({ schedule }: { schedule: Schedule }) {
  const days = schedule.days_of_week.map(dayLabel).join(', ')
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
      <Clock className="w-3.5 h-3.5 text-matcha flex-shrink-0" />
      <span>{days}</span>
      <span className="font-medium">{schedule.start_time.slice(0, 5)}</span>
      <span>— {schedule.duration_minutes} min</span>
      {!schedule.is_active && (
        <span className="text-xs text-red-500 font-medium ml-auto">Désactivé</span>
      )}
    </div>
  )
}
