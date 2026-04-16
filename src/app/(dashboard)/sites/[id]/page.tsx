'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { ZoneAccordion } from '@/components/sites/ZoneAccordion'
import { StatusBadge, UrgencyBadge, categoryLabel } from '@/components/sites/StatusBadge'
import { CommentFeed } from '@/components/comments/CommentFeed'
import { ZonePhotosHistory } from '@/components/sites/ZonePhotosHistory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertTriangle, Calendar, FileImage, Loader2, MapPin, Plus, Upload, User, Clock,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { Site, Zone, Problem, Member, ActivityLog } from '@/types'

export default function SiteDetailPage() {
  const params = useParams()
  const siteId = params.id as string
  const router = useRouter()
  const { currentMember } = useAppStore()
  const supabase = createClient()

  const [site, setSite] = useState<Site | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!currentMember) return

    const [siteRes, zonesRes, problemsRes, membersRes, activityRes] = await Promise.all([
      supabase
        .from('sites')
        .select('*, assigned_technician:members!sites_assigned_technician_id_fkey(*), responsible:members!sites_responsible_id_fkey(*)')
        .eq('id', siteId)
        .single(),
      supabase
        .from('zones')
        .select('*, schedules(*)')
        .eq('site_id', siteId)
        .order('created_at'),
      supabase
        .from('problems')
        .select('*, reporter:members!problems_reported_by_fkey(*), assignee:members!problems_assigned_to_fkey(*), zone:zones(*)')
        .eq('site_id', siteId)
        .in('status', ['open', 'in_progress', 'resolved_pending'])
        .order('created_at', { ascending: false }),
      supabase
        .from('members')
        .select('*')
        .eq('company_id', currentMember.company_id),
      supabase
        .from('activity_log')
        .select('*, member:members(*)')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (siteRes.data) setSite(siteRes.data as Site)
    if (zonesRes.data) setZones(zonesRes.data as Zone[])
    if (problemsRes.data) setProblems(problemsRes.data as Problem[])
    if (membersRes.data) setMembers(membersRes.data as Member[])
    if (activityRes.data) setActivity(activityRes.data as ActivityLog[])
    setLoading(false)
  }, [currentMember, siteId])

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`site-${siteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones', filter: `site_id=eq.${siteId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'problems', filter: `site_id=eq.${siteId}` }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [siteId, loadData])

  const updateSiteStatus = async (newStatus: string) => {
    if (!site) return
    const { error } = await supabase
      .from('sites')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', siteId)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
      return
    }

    // If site set to "fait", cascade to all zones
    if (newStatus === 'fait') {
      await supabase
        .from('zones')
        .update({ status: 'fait', updated_at: new Date().toISOString() })
        .eq('site_id', siteId)
    }

    toast.success('Statut mis à jour')
    loadData()
  }

  const handlePlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !site) return

    const ext = file.name.split('.').pop()
    const path = `plans/${siteId}.${ext}`

    const { error: uploadError } = await supabase.storage.from('irrigo').upload(path, file, { upsert: true })
    if (uploadError) {
      toast.error("Erreur lors de l'upload")
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('irrigo').getPublicUrl(path)

    await supabase.from('sites').update({ plan_url: publicUrl }).eq('id', siteId)
    toast.success('Plan uploadé')
    loadData()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-matcha" />
      </div>
    )
  }

  if (!site) {
    return <div className="text-center py-20 text-muted-foreground">Site introuvable</div>
  }

  const canEdit = currentMember?.role === 'admin' || currentMember?.role === 'chef_equipe'

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sites', href: '/sites' },
        { label: site.client_name },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* General Info */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">Informations générales</CardTitle>
                <StatusBadge status={site.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Adresse" value={`${site.address}${site.city ? `, ${site.city}` : ''}`} />
              {site.responsible && (
                <InfoRow icon={<User className="w-4 h-4" />} label="Responsable" value={`${site.responsible.first_name} ${site.responsible.last_name}`} />
              )}
              {site.assigned_technician && (
                <InfoRow icon={<User className="w-4 h-4" />} label="Technicien" value={`${site.assigned_technician.first_name} ${site.assigned_technician.last_name}`} />
              )}
              {site.last_maintenance_date && (
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Dernier passage" value={format(new Date(site.last_maintenance_date), 'dd/MM/yyyy', { locale: fr })} />
              )}
              {site.next_maintenance_date && (
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Prochain passage" value={format(new Date(site.next_maintenance_date), 'dd/MM/yyyy', { locale: fr })} />
              )}
              {site.notes && (
                <p className="text-sm text-muted-foreground bg-gray-50 rounded-lg p-3">{site.notes}</p>
              )}

              {canEdit && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-muted-foreground">Changer le statut :</span>
                  <Select value={site.status} onValueChange={(v) => v && updateSiteStatus(v)}>
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
              )}
            </CardContent>
          </Card>

          {/* Zones */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Zones d&apos;arrosage ({zones.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {zones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune zone configurée</p>
              ) : (
                <ZoneAccordion zones={zones} siteId={siteId} onUpdate={loadData} />
              )}
            </CardContent>
          </Card>

          {/* Plan */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Plan du réseau</CardTitle>
            </CardHeader>
            <CardContent>
              {site.plan_url ? (
                <div className="space-y-3">
                  <img src={site.plan_url} alt="Plan du réseau" className="w-full rounded-xl border" />
                  {canEdit && (
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Remplacer
                      <input type="file" accept="image/*" className="hidden" onChange={handlePlanUpload} />
                    </label>
                  )}
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 py-8 border-2 border-dashed border-gray-200 rounded-xl text-muted-foreground hover:border-matcha/50 transition-colors">
                  <FileImage className="w-8 h-8" />
                  <span className="text-sm">Cliquez pour uploader un plan</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePlanUpload} />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Historique photos par zone */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Historique photos par zone</CardTitle>
            </CardHeader>
            <CardContent>
              <ZonePhotosHistory zones={zones} />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Problems */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Problèmes en cours ({problems.length})</CardTitle>
                <Link href={`/sites/${siteId}/problems/new`}>
                  <Button size="sm" className="rounded-full bg-red-500 hover:bg-red-600 text-white gap-1.5 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Signaler
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {problems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun problème en cours</p>
              ) : (
                <div className="space-y-3">
                  {problems.map((p) => (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">{categoryLabel(p.category)}</Badge>
                        <UrgencyBadge urgency={p.urgency} />
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{p.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {p.reporter && <span>Par {p.reporter.first_name}</span>}
                        {p.zone && <span>Zone: {p.zone.name}</span>}
                        <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: fr })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Historique</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune activité</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-matcha mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{a.action}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Commentaires</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentFeed siteId={siteId} members={members} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}
