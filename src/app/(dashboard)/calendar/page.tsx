'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, CalendarDays, User, MapPin } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { Maintenance, Site, Member } from '@/types'

export default function CalendarPage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedMaint, setSelectedMaint] = useState<Maintenance | null>(null)
  const { currentMember } = useAppStore()
  const supabase = createClient()

  // Create form state
  const [formSiteId, setFormSiteId] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formAssignee, setFormAssignee] = useState('')
  const [formRecurring, setFormRecurring] = useState(false)
  const [formSaving, setFormSaving] = useState(false)

  const loadData = async () => {
    if (!currentMember) return
    const [mRes, sRes, memRes] = await Promise.all([
      supabase.from('maintenances').select('*, site:sites(client_name), assignee:members!maintenances_assigned_to_fkey(first_name, last_name)').eq('company_id', currentMember.company_id),
      supabase.from('sites').select('id, client_name').eq('company_id', currentMember.company_id),
      supabase.from('members').select('*').eq('company_id', currentMember.company_id),
    ])
    if (mRes.data) setMaintenances(mRes.data as Maintenance[])
    if (sRes.data) setSites(sRes.data as Site[])
    if (memRes.data) setMembers(memRes.data as Member[])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [currentMember])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = monthStart.getDay()
  const padStart = (startDay === 0 ? 6 : startDay - 1)
  const padDays = Array.from({ length: padStart }, (_, i) => {
    const d = new Date(monthStart)
    d.setDate(d.getDate() - padStart + i)
    return d
  })
  const allDays = [...padDays, ...days]

  const getMaintenancesForDay = (date: Date) =>
    maintenances.filter((m) => isSameDay(new Date(m.scheduled_date), date))

  const statusColor: Record<string, string> = {
    planned: 'bg-blue-500',
    done: 'bg-green-500',
    overdue: 'bg-red-500',
  }

  const handleDayClick = (date: Date) => {
    if (currentMember?.role !== 'admin') return
    setFormDate(format(date, 'yyyy-MM-dd'))
    setCreateOpen(true)
  }

  const handleMaintenanceClick = (e: React.MouseEvent, maint: Maintenance) => {
    e.stopPropagation()
    setSelectedMaint(maint)
    setDetailOpen(true)
  }

  const handleCreate = async () => {
    if (!currentMember || !formSiteId || !formTitle || !formDate) return
    setFormSaving(true)

    const { error } = await supabase.from('maintenances').insert({
      site_id: formSiteId,
      company_id: currentMember.company_id,
      title: formTitle,
      description: formDesc || null,
      scheduled_date: formDate,
      is_recurring: formRecurring,
      recurrence_rule: formRecurring ? 'annual' : null,
      assigned_to: formAssignee || null,
      created_by: currentMember.id,
    })

    if (error) {
      toast.error('Erreur lors de la création')
      setFormSaving(false)
      return
    }

    toast.success('Entretien planifié')
    setCreateOpen(false)
    setFormTitle('')
    setFormDesc('')
    setFormSiteId('')
    setFormAssignee('')
    setFormRecurring(false)
    setFormSaving(false)
    loadData()
  }

  const handleDelete = async () => {
    if (!selectedMaint) return

    const { error } = await supabase.from('maintenances').delete().eq('id', selectedMaint.id)

    if (error) {
      toast.error('Erreur lors de la suppression')
      return
    }

    toast.success('Entretien supprimé')
    setDeleteOpen(false)
    setDetailOpen(false)
    setSelectedMaint(null)
    loadData()
  }

  const isAdmin = currentMember?.role === 'admin'

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendrier' }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendrier des entretiens</h1>
        {isAdmin && (
          <Button className="rounded-full bg-matcha hover:bg-matcha-dark text-white gap-2" onClick={() => { setFormDate(format(new Date(), 'yyyy-MM-dd')); setCreateOpen(true) }}>
            <Plus className="w-4 h-4" /> Planifier
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-matcha" />
        </div>
      ) : (
        <Card className="rounded-2xl shadow-sm border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-lg capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
              ))}
              {allDays.map((day, i) => {
                const dayMaintenances = getMaintenancesForDay(day)
                const inMonth = isSameMonth(day, currentDate)
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] p-1.5 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${!inMonth ? 'opacity-30' : ''} ${isToday(day) ? 'bg-matcha/5 border-matcha/30' : ''}`}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-matcha' : 'text-gray-600'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="space-y-0.5 mt-1">
                      {dayMaintenances.slice(0, 2).map((m) => (
                        <button
                          key={m.id}
                          className="flex items-center gap-1 w-full text-left hover:bg-gray-100 rounded px-0.5 transition-colors"
                          onClick={(e) => handleMaintenanceClick(e, m)}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor[m.status]}`} />
                          <span className="text-[10px] text-gray-600 truncate">{m.title}</span>
                        </button>
                      ))}
                      {dayMaintenances.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{dayMaintenances.length - 2}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier un entretien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Site *</Label>
              <Select value={formSiteId} onValueChange={(v) => setFormSiteId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.client_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input placeholder="Purge hivernage" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Détails..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assigné à</Label>
              <Select value={formAssignee} onValueChange={(v) => setFormAssignee(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="recurring" checked={formRecurring} onChange={(e) => setFormRecurring(e.target.checked)} className="rounded" />
              <Label htmlFor="recurring" className="text-sm">Récurrent (annuel)</Label>
            </div>
            <Button className="w-full rounded-full bg-matcha hover:bg-matcha-dark text-white" onClick={handleCreate} disabled={formSaving || !formSiteId || !formTitle || !formDate}>
              {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer l'entretien"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMaint?.title}</DialogTitle>
          </DialogHeader>
          {selectedMaint && (
            <div className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-gray-900">{(selectedMaint.site as unknown as { client_name: string })?.client_name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="text-gray-900">{format(new Date(selectedMaint.scheduled_date), 'dd MMMM yyyy', { locale: fr })}</span>
                </div>
                {selectedMaint.assignee && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-gray-900">{(selectedMaint.assignee as unknown as { first_name: string; last_name: string }).first_name} {(selectedMaint.assignee as unknown as { first_name: string; last_name: string }).last_name}</span>
                  </div>
                )}
                {selectedMaint.description && (
                  <p className="text-sm text-muted-foreground bg-gray-50 rounded-lg p-3">{selectedMaint.description}</p>
                )}
                {selectedMaint.is_recurring && (
                  <p className="text-xs text-matcha font-medium">Récurrent (annuel)</p>
                )}
              </div>

              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-full rounded-full text-red-500 border-red-200 hover:bg-red-50 gap-2"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4" /> Supprimer cet entretien
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet entretien ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;entretien &quot;{selectedMaint?.title}&quot; sera supprimé définitivement. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
