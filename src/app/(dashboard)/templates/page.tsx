'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Trash2, GripVertical, FileCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import type { InterventionTemplate, TemplateChecklistItem } from '@/types'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<InterventionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<InterventionTemplate | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<Array<{ label: string; is_required: boolean }>>([])
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving] = useState(false)
  const { currentMember } = useAppStore()
  const supabase = createClient()

  const load = async () => {
    if (!currentMember) return
    const { data } = await supabase
      .from('intervention_templates')
      .select('*, items:template_checklist_items(*)')
      .eq('company_id', currentMember.company_id)
      .order('created_at', { ascending: false })
    if (data) setTemplates(data as InterventionTemplate[])
    setLoading(false)
  }

  useEffect(() => { load() }, [currentMember])

  const openNew = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setItems([])
    setNewItem('')
    setEditOpen(true)
  }

  const openEdit = (t: InterventionTemplate) => {
    setEditing(t)
    setName(t.name)
    setDescription(t.description || '')
    setItems((t.items || []).sort((a, b) => a.order_index - b.order_index).map(i => ({ label: i.label, is_required: i.is_required })))
    setNewItem('')
    setEditOpen(true)
  }

  const addItem = () => {
    if (!newItem.trim()) return
    setItems([...items, { label: newItem.trim(), is_required: false }])
    setNewItem('')
  }

  const removeItem = (i: number) => {
    setItems(items.filter((_, j) => j !== i))
  }

  const toggleRequired = (i: number) => {
    setItems(items.map((it, j) => j === i ? { ...it, is_required: !it.is_required } : it))
  }

  const handleSave = async () => {
    if (!currentMember || !name.trim()) return
    setSaving(true)

    let templateId = editing?.id

    if (editing) {
      await supabase
        .from('intervention_templates')
        .update({ name, description: description || null, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
      // Clear existing items
      await supabase.from('template_checklist_items').delete().eq('template_id', editing.id)
    } else {
      const { data } = await supabase
        .from('intervention_templates')
        .insert({ company_id: currentMember.company_id, name, description: description || null, created_by: currentMember.id })
        .select()
        .single()
      templateId = data?.id
    }

    if (templateId && items.length > 0) {
      await supabase.from('template_checklist_items').insert(
        items.map((it, idx) => ({ template_id: templateId, label: it.label, order_index: idx, is_required: it.is_required }))
      )
    }

    toast.success(editing ? 'Template mis à jour' : 'Template créé')
    setEditOpen(false)
    setSaving(false)
    load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('intervention_templates').delete().eq('id', id)
    toast.success('Template supprimé')
    load()
  }

  const isAdmin = currentMember?.role === 'admin' || currentMember?.role === 'chef_equipe'

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: "Templates d'intervention" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates d&apos;intervention</h1>
          <p className="text-sm text-muted-foreground mt-1">Modèles pré-remplis de checklist pour les interventions</p>
        </div>
        {isAdmin && (
          <Button className="rounded-full bg-matcha hover:bg-matcha-dark text-white gap-2" onClick={openNew}>
            <Plus className="w-4 h-4" /> Nouveau template
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-matcha" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun template créé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="rounded-2xl shadow-sm border border-gray-200 hover:border-matcha/30 transition-all cursor-pointer" onClick={() => isAdmin && openEdit(t)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-matcha" />
                  {t.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {t.description && <p className="text-sm text-muted-foreground mb-3">{t.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {t.items?.length || 0} item{(t.items?.length || 0) > 1 ? 's' : ''} de checklist
                </p>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger className="mt-3 text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Trash2 className="w-3 h-3" /> Supprimer
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le template &quot;{t.name}&quot; sera supprimé définitivement.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDelete(t.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le template' : 'Nouveau template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input placeholder="Ex: Mise en route printemps" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="À quoi sert ce template..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Items de la checklist</Label>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-sm">{it.label}</span>
                    <button
                      type="button"
                      className={`text-xs px-2 py-0.5 rounded-full ${it.is_required ? 'bg-matcha/20 text-matcha' : 'bg-gray-200 text-gray-600'}`}
                      onClick={() => toggleRequired(i)}
                    >
                      {it.is_required ? 'Obligatoire' : 'Optionnel'}
                    </button>
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter un item..."
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addItem() }
                  }}
                />
                <Button type="button" onClick={addItem} variant="outline" className="rounded-full">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button
              className="w-full rounded-full bg-matcha hover:bg-matcha-dark text-white"
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Enregistrer' : 'Créer le template')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
