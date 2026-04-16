'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText, Loader2, Timer, Package, Users, MapPin, CheckCircle } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Intervention, InterventionMaterial, InterventionChecklistItem } from '@/types'

type InterventionWithDetails = Intervention & {
  checklist: InterventionChecklistItem[]
  materials: InterventionMaterial[]
}

export default function ReportsPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [interventions, setInterventions] = useState<InterventionWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const { currentMember, company } = useAppStore()
  const supabase = createClient()

  const load = async () => {
    if (!currentMember) return
    setLoading(true)

    const start = startOfDay(new Date(date)).toISOString()
    const end = endOfDay(new Date(date)).toISOString()

    const { data } = await supabase
      .from('interventions')
      .select(`
        *,
        site:sites(client_name, city, address),
        technician:members!interventions_technician_id_fkey(first_name, last_name),
        template:intervention_templates(name),
        checklist:intervention_checklist_items(*),
        materials:intervention_materials(*)
      `)
      .eq('company_id', currentMember.company_id)
      .gte('started_at', start)
      .lte('started_at', end)
      .order('started_at')

    if (data) setInterventions(data as InterventionWithDetails[])
    setLoading(false)
  }

  useEffect(() => { load() }, [date, currentMember])

  // Statistiques agrégées
  const stats = {
    total: interventions.length,
    completed: interventions.filter(i => i.status === 'completed').length,
    inProgress: interventions.filter(i => i.status === 'in_progress').length,
    totalMinutes: interventions.reduce((s, i) => s + (i.duration_minutes || 0), 0),
    totalMaterialCost: interventions.reduce((s, i) =>
      s + (i.materials?.reduce((ms, m) => ms + (m.unit_price ? m.unit_price * m.quantity : 0), 0) || 0), 0),
    technicians: [...new Set(interventions.map(i => i.technician_id).filter(Boolean))].length,
    sites: [...new Set(interventions.map(i => i.site_id))].length,
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h${m.toString().padStart(2, '0')}`
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    const dateFr = format(new Date(date), 'dd MMMM yyyy', { locale: fr })

    // Header
    doc.setFillColor(156, 167, 99)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Rapport journalier Irrigo', 14, 18)

    doc.setTextColor(40, 40, 40)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`${company?.name || 'Entreprise'} — ${dateFr}`, 14, 38)

    // Statistiques
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Synthèse de la journée', 14, 50)

    autoTable(doc, {
      startY: 54,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Interventions totales', stats.total.toString()],
        ['Terminées', stats.completed.toString()],
        ['En cours', stats.inProgress.toString()],
        ['Temps total travaillé', formatDuration(stats.totalMinutes)],
        ['Techniciens mobilisés', stats.technicians.toString()],
        ['Sites visités', stats.sites.toString()],
        ['Coût matériel total', `${stats.totalMaterialCost.toFixed(2)} €`],
      ],
      headStyles: { fillColor: [156, 167, 99], textColor: 255 },
      theme: 'grid',
      styles: { fontSize: 10 },
    })

    // Détail par intervention
    let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Détail des interventions', 14, y)
    y += 6

    interventions.forEach((i, idx) => {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFillColor(241, 232, 199)
      doc.rect(14, y, 182, 8, 'F')
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`${idx + 1}. ${i.title}`, 16, y + 6)
      y += 12

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const site = i.site as unknown as { client_name: string; city?: string }
      const tech = i.technician as unknown as { first_name: string; last_name: string } | undefined
      doc.text(`Site : ${site?.client_name}${site?.city ? `, ${site.city}` : ''}`, 16, y); y += 5
      if (tech) { doc.text(`Technicien : ${tech.first_name} ${tech.last_name}`, 16, y); y += 5 }
      doc.text(`Durée : ${i.duration_minutes ? formatDuration(i.duration_minutes) : '-'}`, 16, y); y += 5
      doc.text(`Statut : ${i.status === 'completed' ? 'Terminé' : i.status === 'in_progress' ? 'En cours' : 'Annulé'}`, 16, y); y += 5

      if (i.checklist && i.checklist.length > 0) {
        const done = i.checklist.filter(c => c.is_checked).length
        doc.text(`Checklist : ${done}/${i.checklist.length} validée`, 16, y); y += 5
      }

      if (i.materials && i.materials.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.text('Matériel :', 16, y); y += 4
        doc.setFont('helvetica', 'normal')
        i.materials.forEach(m => {
          if (y > 280) { doc.addPage(); y = 20 }
          const price = m.unit_price ? ` — ${(m.quantity * m.unit_price).toFixed(2)}€` : ''
          doc.text(`  • ${m.quantity} ${m.unit} ${m.name}${price}`, 16, y); y += 4
        })
      }

      if (i.notes) {
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 100)
        const splitNotes = doc.splitTextToSize(`Notes : ${i.notes}`, 180)
        doc.text(splitNotes, 16, y); y += splitNotes.length * 4
        doc.setTextColor(40, 40, 40)
      }
      y += 4
    })

    // Footer
    const pageCount = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages()
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p)
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(`Page ${p}/${pageCount} — Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`, 14, 290)
    }

    doc.save(`rapport-irrigo-${date}.pdf`)
    toast.success('Rapport PDF téléchargé')
  }

  const canAccess = currentMember?.role === 'admin' || currentMember?.role === 'chef_equipe'

  if (!canAccess) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Accès réservé aux administrateurs</p>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Rapports' }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Rapport journalier</h1>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 mb-6">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>
        <Button
          onClick={downloadPDF}
          disabled={interventions.length === 0}
          className="rounded-full bg-matcha hover:bg-matcha-dark text-white gap-2"
        >
          <Download className="w-4 h-4" /> Télécharger PDF
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-matcha" /></div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard icon={FileText} label="Interventions" value={stats.total} color="text-matcha" />
            <StatCard icon={CheckCircle} label="Terminées" value={stats.completed} color="text-green-500" />
            <StatCard icon={Timer} label="Temps total" value={formatDuration(stats.totalMinutes)} color="text-blue-500" />
            <StatCard icon={Package} label="Coût matériel" value={`${stats.totalMaterialCost.toFixed(2)}€`} color="text-amber-500" />
            <StatCard icon={Users} label="Techniciens" value={stats.technicians} color="text-purple-500" />
            <StatCard icon={MapPin} label="Sites visités" value={stats.sites} color="text-red-500" />
          </div>

          {/* Liste détaillée */}
          {interventions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune intervention ce jour-là</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interventions.map(i => (
                <Card key={i.id} className="rounded-xl shadow-sm border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{i.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {(i.site as unknown as { client_name: string })?.client_name}
                          {(i.site as unknown as { city?: string })?.city && ` · ${(i.site as unknown as { city: string }).city}`}
                          {i.technician && ` · ${(i.technician as unknown as { first_name: string; last_name: string }).first_name} ${(i.technician as unknown as { first_name: string; last_name: string }).last_name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Durée</p>
                        <p className="font-mono font-semibold">{i.duration_minutes ? formatDuration(i.duration_minutes) : '-'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {i.checklist && i.checklist.length > 0 && (
                        <span>✓ {i.checklist.filter(c => c.is_checked).length}/{i.checklist.length} checklist</span>
                      )}
                      {i.materials && i.materials.length > 0 && (
                        <span>📦 {i.materials.length} item{i.materials.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <Card className="rounded-xl shadow-sm border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${color}`} />
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
