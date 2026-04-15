'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from './StatusBadge'
import { MapPin, Layers, CalendarDays, User } from 'lucide-react'
import type { Site } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function SiteCard({ site }: { site: Site }) {
  return (
    <Link href={`/sites/${site.id}`}>
      <Card className="rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-matcha/30 transition-all cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-base leading-tight">{site.client_name}</h3>
            <StatusBadge status={site.status} />
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{site.city || site.address}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>{site.zones?.length ?? 0} zones</span>
            </div>
            {site.last_maintenance_date && (
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>
                  {formatDistanceToNow(new Date(site.last_maintenance_date), { addSuffix: true, locale: fr })}
                </span>
              </div>
            )}
          </div>

          {site.assigned_technician && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <div className="w-6 h-6 rounded-full bg-matcha/20 flex items-center justify-center text-[10px] font-semibold text-matcha">
                {site.assigned_technician.first_name[0]}{site.assigned_technician.last_name[0]}
              </div>
              <span className="text-xs text-muted-foreground">
                {site.assigned_technician.first_name} {site.assigned_technician.last_name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
