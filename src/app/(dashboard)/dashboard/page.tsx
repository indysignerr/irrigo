'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { StatusBadge } from '@/components/sites/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Calendar, Activity, Loader2, MapPin, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Site, Maintenance, ActivityLog, Problem } from '@/types'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

const statusColors: Record<string, string> = {
  fait: '#22c55e',
  a_faire: '#f59e0b',
  probleme: '#ef4444',
}

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [problemSites, setProblemSites] = useState<Site[]>([])
  const [upcomingMaint, setUpcomingMaint] = useState<Maintenance[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const { currentMember } = useAppStore()
  const supabase = createClient()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!currentMember) return

    async function load() {
      const isTech = currentMember!.role === 'technicien'

      let sitesQuery = supabase
        .from('sites')
        .select('*, zones(id, status)')
        .eq('company_id', currentMember!.company_id)

      if (isTech) {
        sitesQuery = sitesQuery.eq('assigned_technician_id', currentMember!.id)
      }

      const [sitesRes, maintRes, actRes] = await Promise.all([
        sitesQuery,
        supabase
          .from('maintenances')
          .select('*, site:sites(client_name), assignee:members!maintenances_assigned_to_fkey(first_name, last_name)')
          .eq('company_id', currentMember!.company_id)
          .gte('scheduled_date', new Date().toISOString().split('T')[0])
          .order('scheduled_date')
          .limit(3),
        supabase
          .from('activity_log')
          .select('*, member:members(first_name, last_name)')
          .eq('company_id', currentMember!.company_id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (sitesRes.data) {
        const allSites = sitesRes.data as Site[]
        setSites(allSites)
        setProblemSites(allSites.filter((s) => s.status === 'probleme'))
      }
      if (maintRes.data) setUpcomingMaint(maintRes.data as Maintenance[])
      if (actRes.data) setActivity(actRes.data as ActivityLog[])
      setLoading(false)
    }

    load()
  }, [currentMember])

  // Mini map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || sites.length === 0) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [7.25, 43.7],
      zoom: 9,
      interactive: true,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    sites.forEach((site) => {
      if (!site.latitude || !site.longitude) return
      const color = statusColors[site.status] || '#6b7280'
      const el = document.createElement('div')
      el.style.cssText = `width:20px;height:20px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);cursor:pointer;`

      const popup = new mapboxgl.Popup({ offset: 15, maxWidth: '240px' }).setHTML(`
        <div style="padding:8px;font-family:'DM Sans',sans-serif;">
          <p style="font-weight:600;font-size:13px;margin:0;">${site.client_name}</p>
          <p style="color:#6b7280;font-size:11px;margin:4px 0 0;">${site.city || site.address}</p>
          <a href="/sites/${site.id}" style="display:inline-block;margin-top:6px;background:#9ca763;color:white;padding:4px 10px;border-radius:999px;font-size:11px;text-decoration:none;">Voir</a>
        </div>
      `)

      new mapboxgl.Marker(el)
        .setLngLat([site.longitude, site.latitude])
        .setPopup(popup)
        .addTo(map)
    })

    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  }, [sites])

  const problemCount = problemSites.length

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-matcha" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour {currentMember?.first_name} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {problemCount > 0
            ? `${problemCount} problème${problemCount > 1 ? 's' : ''} en attente aujourd'hui`
            : 'Tout est en ordre aujourd\'hui'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem sites */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <CardTitle className="text-lg">Sites avec problème ({problemCount})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {problemSites.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun problème en cours</p>
              ) : (
                <div className="space-y-2">
                  {problemSites.map((s) => (
                    <Link key={s.id} href={`/sites/${s.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.client_name}</p>
                          <p className="text-xs text-muted-foreground">{s.city || s.address}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming maintenance */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-lg">Prochains entretiens</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingMaint.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun entretien planifié</p>
              ) : (
                <div className="space-y-2">
                  {upcomingMaint.map((m) => (
                    <Link key={m.id} href="/calendar" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-medium text-blue-600">{format(new Date(m.scheduled_date), 'MMM', { locale: fr }).toUpperCase()}</span>
                          <span className="text-sm font-bold text-blue-700">{format(new Date(m.scheduled_date), 'd')}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{(m.site as unknown as { client_name: string })?.client_name}</p>
                        </div>
                      </div>
                      {m.assignee && (
                        <span className="text-xs text-muted-foreground">{(m.assignee as unknown as { first_name: string }).first_name}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-matcha" />
                <CardTitle className="text-lg">Dernière activité</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-matcha mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{a.action}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 — Mini map */}
        <div>
          <Card className="rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-matcha" /> Carte
                </CardTitle>
                <Link href="/map" className="text-xs text-matcha hover:text-matcha-dark font-medium">
                  Voir tout →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={mapContainer} className="w-full h-[400px]" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
