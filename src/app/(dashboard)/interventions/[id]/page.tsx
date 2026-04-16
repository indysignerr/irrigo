'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Loader2, Timer, Play, StopCircle, Check, CheckCircle, MapPin, User,
  Plus, X, Trash2, ImagePlus, Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Intervention, InterventionChecklistItem, InterventionMaterial, InterventionPhoto } from '@/types'

export default function InterventionDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { currentMember } = useAppStore()
  const supabase = createClient()

  const [intervention, setIntervention] = useState<Intervention | null>(null)
  const [checklist, setChecklist] = useState<InterventionChecklistItem[]>([])
  const [materials, setMaterials] = useState<InterventionMaterial[]>([])
  const [photos, setPhotos] = useState<InterventionPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [matDialogOpen, setMatDialogOpen] = useState(false)
  const [matName, setMatName] = useState('')
  const [matQty, setMatQty] = useState('1')
  const [matUnit, setMatUnit] = useState('unité')
  const [matPrice, setMatPrice] = useState('')
  const [completeOpen, setCompleteOpen] = useState(false)
  const [finalNotes, setFinalNotes] = useState('')
  const [completing, setCompleting] = useState(false)

  const load = useCallback(async () => {
    if (!currentMember) return

    const [iRes, cRes, mRes, pRes] = await Promise.all([
      supabase
        .from('interventions')
        .select('*, site:sites(*), technician:members!interventions_technician_id_fkey(*), template:intervention_templates(name)')
        .eq('id', id)
        .single(),
      supabase.from('intervention_checklist_items').select('*').eq('intervention_id', id).order('order_index'),
      supabase.from('intervention_materials').select('*').eq('intervention_id', id).order('created_at'),
      supabase.from('intervention_photos').select('*').eq('intervention_id', id).order('taken_at', { ascending: false }),
    ])

    if (iRes.data) setIntervention(iRes.data as Intervention)
    if (cRes.data) setChecklist(cRes.data as InterventionChecklistItem[])
    if (mRes.data) setMaterials(mRes.data as InterventionMaterial[])
    if (pRes.data) setPhotos(pRes.data as InterventionPhoto[])
    setLoading(false)
  }, [currentMember, id])

  useEffect(() => { load() }, [load])

  // Timer
  useEffect(() => {
    if (!intervention || intervention.status !== 'in_progress') {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const update = () => {
      const started = new Date(intervention.started_at).getTime()
      setElapsed(Math.floor((Date.now() - started) / 1000))
    }
    update()
    timerRef.current = setInterval(update, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [intervention])

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleChecklist = async (item: InterventionChecklistItem) => {
    const newChecked = !item.is_checked
    await supabase
      .from('intervention_checklist_items')
      .update({ is_checked: newChecked, checked_at: newChecked ? new Date().toISOString() : null })
      .eq('id', item.id)
    setChecklist(checklist.map(c => c.id === item.id ? { ...c, is_checked: newChecked } : c))
  }

  const addChecklistItem = async () => {
    if (!newChecklistItem.trim()) return
    const { data } = await supabase
      .from('intervention_checklist_items')
      .insert({
        intervention_id: id,
        label: newChecklistItem.trim(),
        order_index: checklist.length,
        is_checked: false,
      })
      .select()
      .single()
    if (data) setChecklist([...checklist, data as InterventionChecklistItem])
    setNewChecklistItem('')
  }

  const removeChecklistItem = async (itemId: string) => {
    await supabase.from('intervention_checklist_items').delete().eq('id', itemId)
    setChecklist(checklist.filter(c => c.id !== itemId))
  }

  const addMaterial = async () => {
    if (!matName.trim()) return
    const { data } = await supabase
      .from('intervention_materials')
      .insert({
        intervention_id: id,
        name: matName.trim(),
        quantity: parseFloat(matQty) || 1,
        unit: matUnit,
        unit_price: matPrice ? parseFloat(matPrice) : null,
      })
      .select()
      .single()
    if (data) setMaterials([...materials, data as InterventionMaterial])
    setMatName('')
    setMatQty('1')
    setMatUnit('unité')
    setMatPrice('')
    setMatDialogOpen(false)
    toast.success('Matériel ajouté')
  }

  const removeMaterial = async (mid: string) => {
    await supabase.from('intervention_materials').delete().eq('id', mid)
    setMaterials(materials.filter(m => m.id !== mid))
  }

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const path = `interventions/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('irrigo').upload(path, file)
    if (upErr) { toast.error("Erreur d'upload"); return }

    const { data: { publicUrl } } = supabase.storage.from('irrigo').getPublicUrl(path)

    const { data } = await supabase
      .from('intervention_photos')
      .insert({ intervention_id: id, url: publicUrl })
      .select()
      .single()
    if (data) setPhotos([data as InterventionPhoto, ...photos])
    toast.success('Photo ajoutée')
  }

  const removePhoto = async (pid: string) => {
    await supabase.from('intervention_photos').delete().eq('id', pid)
    setPhotos(photos.filter(p => p.id !== pid))
  }

  const complete = async () => {
    if (!intervention) return
    setCompleting(true)

    const duration = Math.floor((Date.now() - new Date(intervention.started_at).getTime()) / 60000)

    const { error } = await supabase
      .from('interventions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_minutes: duration,
        notes: finalNotes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) { toast.error('Erreur'); setCompleting(false); return }

    if (intervention.site_id && currentMember) {
      await supabase.from('activity_log').insert({
        company_id: currentMember.company_id,
        member_id: currentMember.id,
        site_id: intervention.site_id,
        action: `${currentMember.first_name} a terminé l'intervention "${intervention.title}" (${Math.floor(duration/60)}h${(duration%60).toString().padStart(2,'0')})`,
      })

      await supabase
        .from('sites')
        .update({ last_maintenance_date: new Date().toISOString() })
        .eq('id', intervention.site_id)
    }

    toast.success('Intervention terminée')
    setCompleting(false)
    setCompleteOpen(false)
    router.push('/interventions')
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-matcha" /></div>
  if (!intervention) return <div className="text-center py-20 text-muted-foreground">Intervention introuvable</div>

  const requiredChecked = checklist.filter(c => c.is_checked).length
  const totalRequired = checklist.length
  const progress = totalRequired > 0 ? Math.round((requiredChecked / totalRequired) * 100) : 0
  const isActive = intervention.status === 'in_progress'

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Interventions', href: '/interventions' },
        { label: intervention.title },
      ]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{intervention.title}</h1>
            {!isActive && (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Terminé
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{(intervention.site as unknown as { client_name: string })?.client_name}</span>
            {intervention.technician && (
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{intervention.technician.first_name} {intervention.technician.last_name}</span>
            )}
          </div>
        </div>

        {isActive ? (
          <div className="flex items-center gap-3">
            <div className="bg-matcha/10 border border-matcha/20 rounded-xl px-4 py-2 flex items-center gap-2">
              <Timer className="w-4 h-4 text-matcha" />
              <span className="text-lg font-mono font-bold text-matcha">{formatTime(elapsed)}</span>
            </div>
            <Button
              className="rounded-full bg-red-500 hover:bg-red-600 text-white gap-2"
              onClick={() => setCompleteOpen(true)}
            >
              <StopCircle className="w-4 h-4" /> Terminer
            </Button>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl px-4 py-2 text-sm">
            <span className="text-muted-foreground">Durée : </span>
            <span className="font-semibold">
              {intervention.duration_minutes ? `${Math.floor(intervention.duration_minutes / 60)}h${(intervention.duration_minutes % 60).toString().padStart(2, '0')}` : '-'}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalRequired > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{requiredChecked}/{totalRequired} ({progress}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-matcha transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist */}
        <Card className="rounded-2xl shadow-sm border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-matcha" />
              Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Aucun item</p>
            ) : (
              checklist.map(item => (
                <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${item.is_checked ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <button
                    type="button"
                    onClick={() => isActive && toggleChecklist(item)}
                    disabled={!isActive}
                    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${item.is_checked ? 'bg-matcha border-matcha' : 'border-gray-300 hover:border-matcha'}`}
                  >
                    {item.is_checked && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`flex-1 text-sm ${item.is_checked ? 'line-through text-muted-foreground' : 'text-gray-900'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <button onClick={() => removeChecklistItem(item.id)} className="text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
            {isActive && (
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Ajouter un item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  className="text-sm"
                />
                <Button size="icon" variant="outline" className="rounded-full flex-shrink-0" onClick={addChecklistItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matériel */}
        <Card className="rounded-2xl shadow-sm border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-matcha" />
                Matériel utilisé ({materials.length})
              </CardTitle>
              {isActive && (
                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => setMatDialogOpen(true)}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Aucun matériel</p>
            ) : (
              materials.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.quantity} {m.unit}
                      {m.unit_price && ` · ${(m.quantity * m.unit_price).toFixed(2)}€`}
                    </p>
                  </div>
                  {isActive && (
                    <button onClick={() => removeMaterial(m.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
            {materials.length > 0 && materials.some(m => m.unit_price) && (
              <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-muted-foreground">Total matériel</span>
                <span className="font-semibold">
                  {materials.reduce((sum, m) => sum + (m.unit_price ? m.unit_price * m.quantity : 0), 0).toFixed(2)}€
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="rounded-2xl shadow-sm border border-gray-200 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-matcha" />
              Photos ({photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {photos.map(p => (
                <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border group">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  {isActive && (
                    <button
                      onClick={() => removePhoto(p.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                </div>
              ))}
              {isActive && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-matcha/50 transition-colors">
                  <ImagePlus className="w-6 h-6 text-gray-400" />
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={uploadPhoto} />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes finales (si terminé) */}
        {!isActive && intervention.notes && (
          <Card className="rounded-2xl shadow-sm border border-gray-200 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notes de fin</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{intervention.notes}</p>
              {intervention.completed_at && (
                <p className="text-xs text-muted-foreground mt-3">
                  Terminé le {format(new Date(intervention.completed_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ajouter matériel dialog */}
      <Dialog open={matDialogOpen} onOpenChange={setMatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter du matériel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input placeholder="Ex: Raccord T 25mm" value={matName} onChange={(e) => setMatName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantité</Label>
                <Input type="number" step="0.01" value={matQty} onChange={(e) => setMatQty(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Input placeholder="unité, m, kg..." value={matUnit} onChange={(e) => setMatUnit(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prix unitaire (€) <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input type="number" step="0.01" value={matPrice} onChange={(e) => setMatPrice(e.target.value)} />
            </div>
            <Button
              className="w-full rounded-full bg-matcha hover:bg-matcha-dark text-white"
              onClick={addMaterial}
              disabled={!matName.trim()}
            >
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terminer intervention dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer l&apos;intervention ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Durée totale</p>
              <p className="text-2xl font-mono font-bold text-matcha">{formatTime(elapsed)}</p>
            </div>
            <div className="space-y-2">
              <Label>Notes finales <span className="text-muted-foreground">(optionnel)</span></Label>
              <Textarea
                placeholder="Résumé de l'intervention, points à noter..."
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-full flex-1" onClick={() => setCompleteOpen(false)}>
                Annuler
              </Button>
              <Button
                className="rounded-full flex-1 bg-matcha hover:bg-matcha-dark text-white gap-2"
                onClick={complete}
                disabled={completing}
              >
                {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><StopCircle className="w-4 h-4" /> Terminer</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
