'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Member } from '@/types'

interface SiteFiltersProps {
  statusFilter: string
  techFilter: string
  members: Member[]
  onStatusChange: (v: string | null) => void
  onTechChange: (v: string | null) => void
}

export function SiteFilters({ statusFilter, techFilter, members, onStatusChange, onTechChange }: SiteFiltersProps) {
  const technicians = members.filter((m) => m.role === 'technicien')

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px] rounded-full text-sm">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="fait">Fait</SelectItem>
          <SelectItem value="a_faire">À faire</SelectItem>
          <SelectItem value="probleme">Problème</SelectItem>
        </SelectContent>
      </Select>

      <Select value={techFilter} onValueChange={onTechChange}>
        <SelectTrigger className="w-[180px] rounded-full text-sm">
          <SelectValue placeholder="Technicien" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les techniciens</SelectItem>
          {technicians.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.first_name} {t.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
