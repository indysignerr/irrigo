'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { Site } from '@/types'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

const statusColors: Record<string, string> = {
  fait: '#22c55e',
  a_faire: '#f59e0b',
  probleme: '#ef4444',
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const { currentMember } = useAppStore()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!currentMember) return
    supabase
      .from('sites')
      .select('*, zones(id, status), assigned_technician:members!sites_assigned_technician_id_fkey(first_name, last_name)')
      .eq('company_id', currentMember.company_id)
      .then(({ data }) => {
        if (data) setSites(data as Site[])
        setLoading(false)
      })
  }, [currentMember])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [7.25, 43.7],
      zoom: 10,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const filtered = statusFilter === 'all' ? sites : sites.filter((s) => s.status === statusFilter)

    filtered.forEach((site) => {
      if (!site.latitude || !site.longitude) return

      const color = statusColors[site.status] || '#6b7280'

      const el = document.createElement('div')
      el.style.cssText = `width:28px;height:28px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;`

      const popup = new mapboxgl.Popup({ offset: 25, maxWidth: '280px' }).setHTML(`
        <div style="padding:12px;font-family:'DM Sans',sans-serif;">
          <h3 style="font-weight:600;font-size:14px;margin:0 0 4px;">${site.client_name}</h3>
          <p style="color:#6b7280;font-size:12px;margin:0 0 8px;">${site.address}${site.city ? `, ${site.city}` : ''}</p>
          <div style="display:flex;gap:8px;font-size:11px;color:#6b7280;margin-bottom:8px;">
            <span>${site.zones?.length || 0} zones</span>
            <span style="color:${color};font-weight:600;">${site.status === 'fait' ? 'Fait' : site.status === 'a_faire' ? 'À faire' : 'Problème'}</span>
          </div>
          <a href="/sites/${site.id}" style="display:inline-block;background:#9ca763;color:white;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:500;text-decoration:none;">
            Voir le site
          </a>
        </div>
      `)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([site.longitude, site.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
    })
  }, [sites, statusFilter])

  return (
    <div className="h-full -m-4 lg:-m-6 flex flex-col">
      <div className="px-4 lg:px-6 pt-4 lg:pt-6 pb-3">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Carte' }]} />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Carte des sites</h1>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
            <SelectTrigger className="w-[150px] rounded-full text-sm">
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="fait">Fait</SelectItem>
              <SelectItem value="a_faire">À faire</SelectItem>
              <SelectItem value="probleme">Problème</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-matcha" />
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
      </div>
    </div>
  )
}
