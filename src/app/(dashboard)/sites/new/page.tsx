'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Member } from '@/types'

export default function NewSitePage() {
  const [clientName, setClientName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [responsibleId, setResponsibleId] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [notes, setNotes] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [suggestions, setSuggestions] = useState<Array<{ place_name: string; center: [number, number]; context: Array<{ id: string; text: string }> }>>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>(null)
  const router = useRouter()
  const { currentMember } = useAppStore()
  const supabase = createClient()

  useEffect(() => {
    if (!currentMember) return
    supabase
      .from('members')
      .select('*')
      .eq('company_id', currentMember.company_id)
      .then(({ data }) => {
        if (data) setMembers(data as Member[])
      })
  }, [currentMember])

  const searchAddress = (query: string) => {
    setAddress(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 3) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=fr&language=fr&limit=5`
      )
      const data = await res.json()
      setSuggestions(data.features || [])
    }, 300)
  }

  const selectAddress = (feature: typeof suggestions[0]) => {
    setAddress(feature.place_name)
    setLng(feature.center[0])
    setLat(feature.center[1])
    const cityCtx = feature.context?.find((c) => c.id.startsWith('place'))
    const pcCtx = feature.context?.find((c) => c.id.startsWith('postcode'))
    if (cityCtx) setCity(cityCtx.text)
    if (pcCtx) setPostalCode(pcCtx.text)
    setSuggestions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMember) return
    setLoading(true)

    const { data, error } = await supabase
      .from('sites')
      .insert({
        company_id: currentMember.company_id,
        client_name: clientName,
        address,
        city,
        postal_code: postalCode,
        latitude: lat,
        longitude: lng,
        responsible_id: responsibleId || null,
        assigned_technician_id: technicianId || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      toast.error('Erreur lors de la création du site')
      setLoading(false)
      return
    }

    // Log activity
    await supabase.from('activity_log').insert({
      company_id: currentMember.company_id,
      member_id: currentMember.id,
      site_id: data.id,
      action: `${currentMember.first_name} a créé le site "${clientName}"`,
    })

    toast.success('Site créé avec succès')
    router.push(`/sites/${data.id}`)
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sites', href: '/sites' },
        { label: 'Nouveau site' },
      ]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ajouter un site</h1>

      <Card className="max-w-2xl rounded-2xl shadow-sm border border-gray-200">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom du client *</Label>
              <Input
                id="clientName"
                placeholder="Villa Les Oliviers"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                placeholder="12 chemin des Collines, Nice"
                value={address}
                onChange={(e) => searchAddress(e.target.value)}
                required
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                      onClick={() => selectAddress(s)}
                    >
                      {s.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Responsable de secteur</Label>
                <Select value={responsibleId} onValueChange={(v) => setResponsibleId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Technicien assigné</Label>
                <Select value={technicianId} onValueChange={(v) => setTechnicianId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {members.filter((m) => m.role === 'technicien').map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Informations complémentaires..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button type="submit" className="rounded-full bg-matcha hover:bg-matcha-dark text-white" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le site'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
