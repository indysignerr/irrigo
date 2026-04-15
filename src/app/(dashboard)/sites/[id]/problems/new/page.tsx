'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Zone, Member, Site } from '@/types'

export default function NewProblemPage() {
  const params = useParams()
  const siteId = params.id as string
  const router = useRouter()
  const { currentMember } = useAppStore()
  const supabase = createClient()

  const [site, setSite] = useState<Site | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [zoneId, setZoneId] = useState('')
  const [category, setCategory] = useState('')
  const [urgency, setUrgency] = useState('medium')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentMember) return
    Promise.all([
      supabase.from('sites').select('*').eq('id', siteId).single(),
      supabase.from('zones').select('*').eq('site_id', siteId),
      supabase.from('members').select('*').eq('company_id', currentMember.company_id),
    ]).then(([siteRes, zonesRes, membersRes]) => {
      if (siteRes.data) setSite(siteRes.data as Site)
      if (zonesRes.data) setZones(zonesRes.data as Zone[])
      if (membersRes.data) setMembers(membersRes.data as Member[])
    })
  }, [currentMember, siteId])

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos((prev) => [...prev, ...files].slice(0, 5))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMember || !category || !description.trim()) return
    setLoading(true)

    // Upload photos
    const photoUrls: string[] = []
    for (const photo of photos) {
      const ext = photo.name.split('.').pop()
      const path = `problems/${siteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('irrigo').upload(path, photo)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('irrigo').getPublicUrl(path)
        photoUrls.push(publicUrl)
      }
    }

    const { data: problem, error } = await supabase
      .from('problems')
      .insert({
        site_id: siteId,
        zone_id: zoneId || null,
        reported_by: currentMember.id,
        assigned_to: assignedTo || null,
        category,
        urgency,
        description: description.trim(),
        photos: photoUrls.length > 0 ? photoUrls : null,
      })
      .select()
      .single()

    if (error) {
      toast.error('Erreur lors du signalement')
      setLoading(false)
      return
    }

    // Update zone/site status to "probleme"
    if (zoneId) {
      await supabase.from('zones').update({ status: 'probleme' }).eq('id', zoneId)
    }
    await supabase.from('sites').update({ status: 'probleme', updated_at: new Date().toISOString() }).eq('id', siteId)

    // Log activity
    await supabase.from('activity_log').insert({
      company_id: currentMember.company_id,
      member_id: currentMember.id,
      site_id: siteId,
      action: `${currentMember.first_name} a signalé un problème sur ${site?.client_name || 'un site'}`,
    })

    // Notify all company members
    const otherMembers = members.filter((m) => m.id !== currentMember.id)
    if (otherMembers.length > 0) {
      await supabase.from('notifications').insert(
        otherMembers.map((m) => ({
          company_id: currentMember.company_id,
          recipient_id: m.id,
          type: 'problem_reported' as const,
          title: 'Nouveau problème signalé',
          message: `${currentMember.first_name} a signalé un problème sur ${site?.client_name || 'un site'}`,
          related_site_id: siteId,
          related_problem_id: problem.id,
        }))
      )
    }

    toast.success('Problème signalé avec succès')
    router.push(`/sites/${siteId}`)
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sites', href: '/sites' },
        { label: site?.client_name || '...', href: `/sites/${siteId}` },
        { label: 'Signaler un problème' },
      ]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Signaler un problème</h1>

      <Card className="max-w-2xl rounded-2xl shadow-sm border border-gray-200">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Zone concernée <span className="text-muted-foreground">(optionnel)</span></Label>
              <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Site entier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Site entier</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select value={category} onValueChange={(v) => setCategory(v ?? "")} required>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fuite">Fuite</SelectItem>
                    <SelectItem value="casse">Casse</SelectItem>
                    <SelectItem value="panne_programmateur">Panne programmateur</SelectItem>
                    <SelectItem value="buse_bloquee">Buse bloquée</SelectItem>
                    <SelectItem value="pression">Pression</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgence *</Label>
                <Select value={urgency} onValueChange={(v) => setUrgency(v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="high">Élevé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Décrivez le problème en détail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Photos <span className="text-muted-foreground">(max 5)</span></Label>
              <div className="flex flex-wrap gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-matcha/50 transition-colors">
                    <ImagePlus className="w-5 h-5 text-gray-400" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotos} multiple />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assigner à un technicien <span className="text-muted-foreground">(optionnel)</span></Label>
              <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Non assigné</SelectItem>
                  {members.filter((m) => m.role === 'technicien').map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => router.back()}>
                Annuler
              </Button>
              <Button type="submit" className="rounded-full bg-red-500 hover:bg-red-600 text-white" disabled={loading || !category || !description.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Signaler le problème'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
