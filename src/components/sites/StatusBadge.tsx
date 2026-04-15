'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SiteStatus, ZoneStatus, ProblemStatus, Urgency, MaintenanceStatus } from '@/types'

const statusConfig: Record<string, { label: string; className: string }> = {
  fait: { label: 'Fait', className: 'bg-green-100 text-green-700 border-green-200' },
  a_faire: { label: 'À faire', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  probleme: { label: 'Problème', className: 'bg-red-100 text-red-700 border-red-200' },
  open: { label: 'Ouvert', className: 'bg-red-100 text-red-700 border-red-200' },
  in_progress: { label: 'En cours', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  resolved_pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'Résolu', className: 'bg-green-100 text-green-700 border-green-200' },
  planned: { label: 'Planifié', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  done: { label: 'Fait', className: 'bg-green-100 text-green-700 border-green-200' },
  overdue: { label: 'En retard', className: 'bg-red-100 text-red-700 border-red-200' },
  pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approuvé', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejeté', className: 'bg-red-100 text-red-700 border-red-200' },
}

const urgencyConfig: Record<Urgency, { label: string; className: string }> = {
  low: { label: 'Faible', className: 'bg-green-100 text-green-700 border-green-200' },
  medium: { label: 'Moyen', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  high: { label: 'Élevé', className: 'bg-red-100 text-red-700 border-red-200' },
}

const zoneTypeConfig: Record<string, string> = {
  turbine: 'Turbine',
  tuyere: 'Tuyère',
  goutte_a_goutte: 'Goutte-à-goutte',
  micro_aspersion: 'Micro-aspersion',
  autre: 'Autre',
}

export function StatusBadge({ status }: { status: SiteStatus | ZoneStatus | ProblemStatus | MaintenanceStatus | string }) {
  const config = statusConfig[status]
  if (!config) return null
  return <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>{config.label}</Badge>
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const config = urgencyConfig[urgency]
  return <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>{config.label}</Badge>
}

export function ZoneTypeBadge({ type }: { type?: string }) {
  if (!type) return null
  return (
    <Badge variant="outline" className="text-xs font-medium bg-gray-100 text-gray-600 border-gray-200">
      {zoneTypeConfig[type] || type}
    </Badge>
  )
}

export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    fuite: 'Fuite',
    casse: 'Casse',
    panne_programmateur: 'Panne programmateur',
    buse_bloquee: 'Buse bloquée',
    pression: 'Pression',
    autre: 'Autre',
  }
  return map[category] || category
}

export function dayLabel(day: number): string {
  return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][day] || ''
}
