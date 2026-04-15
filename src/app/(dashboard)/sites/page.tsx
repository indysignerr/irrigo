'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { SiteCard } from '@/components/sites/SiteCard'
import { SiteFilters } from '@/components/sites/SiteFilters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Loader2 } from 'lucide-react'
import type { Site, Member } from '@/types'

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [techFilter, setTechFilter] = useState('all')
  const [search, setSearch] = useState('')
  const searchParams = useSearchParams()
  const { currentMember } = useAppStore()
  const supabase = createClient()

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)
  }, [searchParams])

  useEffect(() => {
    if (!currentMember) return

    async function load() {
      const [sitesRes, membersRes] = await Promise.all([
        supabase
          .from('sites')
          .select(`
            *,
            assigned_technician:members!sites_assigned_technician_id_fkey(*),
            responsible:members!sites_responsible_id_fkey(*),
            zones(id, status)
          `)
          .eq('company_id', currentMember!.company_id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('members')
          .select('*')
          .eq('company_id', currentMember!.company_id),
      ])

      if (sitesRes.data) setSites(sitesRes.data as Site[])
      if (membersRes.data) setMembers(membersRes.data as Member[])
      setLoading(false)
    }

    load()
  }, [currentMember])

  const filtered = useMemo(() => {
    let result = sites

    // Technician sees only their sites
    if (currentMember?.role === 'technicien') {
      result = result.filter((s) => s.assigned_technician_id === currentMember.id)
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter)
    }
    if (techFilter !== 'all') {
      result = result.filter((s) => s.assigned_technician_id === techFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.client_name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q)
      )
    }
    return result
  }, [sites, statusFilter, techFilter, search, currentMember])

  const canCreate = currentMember?.role === 'admin' || currentMember?.role === 'chef_equipe'

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Sites' }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sites d&apos;arrosage</h1>
        {canCreate && (
          <Link href="/sites/new">
            <Button className="rounded-full bg-matcha hover:bg-matcha-dark text-white gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un site
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-9 rounded-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SiteFilters
          statusFilter={statusFilter}
          techFilter={techFilter}
          members={members}
          onStatusChange={(v) => setStatusFilter(v ?? 'all')}
          onTechChange={(v) => setTechFilter(v ?? 'all')}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-matcha" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">Aucun site trouvé</p>
          {canCreate && (
            <Link href="/sites/new">
              <Button variant="outline" className="mt-4 rounded-full">
                Créer votre premier site
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  )
}
