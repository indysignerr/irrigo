'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, FileCheck, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Site, InterventionTemplate } from '@/types'

export default function NewInterventionPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [templates, setTemplates] = useState<InterventionTemplate[]>([])
  const [siteId, setSiteId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { currentMember } = useAppStore()
  const supabase = createClient()

  useEffect(() => {
    if (!currentMember) return
    let sitesQuery = supabase
      .from('sites')
      .select('id, client_name, city')
      .eq('company_id', currentMember.company_id)

    if (currentMember.role === 'technicien') {
      sitesQuery = sitesQuery.eq('assigned_technician_id', currentMember.id)
    }

    Promise.all([
      sitesQuery,
      supabase
        .from('intervention_templates')
        .select('*, items:template_checklist_items(*)')
        .eq('company_id', currentMember.company_id),
    ]).then(([sRes, tRes]) => {
      if (sRes.data) setSites(sRes.data as Site[])
      if (tRes.data) setTemplates(tRes.data as InterventionTemplate[])
    })
  }, [currentMember])

  useEffect(() => {
    if (templateId) {
      const t = templates.find(tpl => tpl.id === templateId)
      if (t) setTitle(t.name)
    }
  }, [templateId, templates])

  const handleStart = async () => {
    if (!currentMember || !siteId || !title.trim()) {
      toast.error('Site et titre sont obligatoires')
      return
    }
    setLoading(true)

    const { data: intervention, error } = await supabase
      .from('interventions')
      .insert({
        company_id: currentMember.company_id,
        site_id: siteId,
        technician_id: currentMember.id,
        template_id: templateId || null,
        title: title.trim(),
        description: description.trim() || null,
        status: 'in_progress',
      })
      .select()
      .single()

    if (error || !intervention) {
      toast.error('Erreur lors du démarrage')
      setLoading(false)
      return
    }

    // Copy template checklist items
    if (templateId) {
      const template = templates.find(t => t.id === templateId)
      if (template?.items && template.items.length > 0) {
        await supabase.from('intervention_checklist_items').insert(
          template.items
            .sort((a, b) => a.order_index - b.order_index)
            .map(item => ({
              intervention_id: intervention.id,
              label: item.label,
              order_index: item.order_index,
              is_checked: false,
            }))
        )
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      company_id: currentMember.company_id,
      member_id: currentMember.id,
      site_id: siteId,
      action: `${currentMember.first_name} a démarré l'intervention "${title}"`,
    })

    toast.success('Intervention démarrée')
    router.push(`/interventions/${intervention.id}`)
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Interventions', href: '/interventions' },
        { label: 'Nouvelle' },
      ]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Démarrer une intervention</h1>

      <Card className="max-w-2xl rounded-2xl shadow-sm border border-gray-200">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label>Site *</Label>
            <Select value={siteId} onValueChange={(v) => setSiteId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un site" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.client_name} {s.city && `· ${s.city}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template <span className="text-muted-foreground">(optionnel)</span></Label>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun template disponible. <Link href="/templates" className="text-matcha font-medium">Créer un template</Link>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`text-left p-3 rounded-xl border transition-colors ${!templateId ? 'border-matcha bg-matcha/5' : 'border-gray-200 hover:border-matcha/50'}`}
                  onClick={() => setTemplateId('')}
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Sans template</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Intervention libre</p>
                </button>
                {templates.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`text-left p-3 rounded-xl border transition-colors ${templateId === t.id ? 'border-matcha bg-matcha/5' : 'border-gray-200 hover:border-matcha/50'}`}
                    onClick={() => setTemplateId(t.id)}
                  >
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-matcha" />
                      <span className="font-medium text-sm">{t.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.items?.length || 0} item{(t.items?.length || 0) > 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input placeholder="Ex: Visite de contrôle printemps" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Notes de départ..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => router.back()}>
              Annuler
            </Button>
            <Button
              className="rounded-full bg-matcha hover:bg-matcha-dark text-white"
              onClick={handleStart}
              disabled={loading || !siteId || !title.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Démarrer l\'intervention'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
