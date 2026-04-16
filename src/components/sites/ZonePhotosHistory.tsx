'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ImagePlus, Images, X, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { Zone, ZonePhoto } from '@/types'

interface ZonePhotosHistoryProps {
  zones: Zone[]
}

export function ZonePhotosHistory({ zones }: ZonePhotosHistoryProps) {
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [photos, setPhotos] = useState<ZonePhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [viewing, setViewing] = useState<ZonePhoto | null>(null)
  const [uploading, setUploading] = useState(false)
  const { currentMember } = useAppStore()
  const supabase = createClient()

  useEffect(() => {
    if (zones.length > 0 && !selectedZone) {
      setSelectedZone(zones[0].id)
    }
  }, [zones])

  useEffect(() => {
    if (!selectedZone) return
    setLoading(true)
    supabase
      .from('zone_photos')
      .select('*, photographer:members(first_name, last_name)')
      .eq('zone_id', selectedZone)
      .order('taken_at', { ascending: false })
      .then(({ data }) => {
        if (data) setPhotos(data as ZonePhoto[])
        setLoading(false)
      })
  }, [selectedZone])

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedZone || !currentMember) return
    setUploading(true)

    const path = `zones/${selectedZone}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
    const { error: upErr } = await supabase.storage.from('irrigo').upload(path, file)
    if (upErr) { toast.error("Erreur d'upload"); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('irrigo').getPublicUrl(path)

    const { data } = await supabase
      .from('zone_photos')
      .insert({ zone_id: selectedZone, url: publicUrl, taken_by: currentMember.id })
      .select('*, photographer:members(first_name, last_name)')
      .single()

    if (data) setPhotos([data as ZonePhoto, ...photos])
    setUploading(false)
    toast.success('Photo ajoutée')
  }

  const removePhoto = async (id: string) => {
    await supabase.from('zone_photos').delete().eq('id', id)
    setPhotos(photos.filter(p => p.id !== id))
    toast.success('Photo supprimée')
  }

  if (zones.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <Images className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>Créez d&apos;abord des zones pour voir leur historique</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={selectedZone} onValueChange={(v) => setSelectedZone(v ?? '')}>
          <SelectTrigger className="flex-1 text-sm rounded-full">
            <SelectValue placeholder="Sélectionner une zone" />
          </SelectTrigger>
          <SelectContent>
            {zones.map(z => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="cursor-pointer">
          <Button size="sm" variant="outline" className="rounded-full gap-1.5 text-xs pointer-events-none">
            <ImagePlus className="w-3.5 h-3.5" /> Ajouter
          </Button>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={uploadPhoto}
            disabled={uploading}
          />
        </label>
      </div>

      {loading ? (
        <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Chargement...</div>
      ) : photos.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Images className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Aucune photo pour cette zone</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map(p => (
            <button
              key={p.id}
              type="button"
              className="relative aspect-square rounded-xl overflow-hidden border group"
              onClick={() => setViewing(p)}
            >
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <p className="text-[9px] text-white flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {format(new Date(p.taken_at), 'dd/MM/yy', { locale: fr })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-3xl p-2">
          {viewing && (
            <div className="space-y-2">
              <img src={viewing.url} alt="" className="w-full rounded-xl" />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="text-sm text-muted-foreground">
                  {format(new Date(viewing.taken_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  {viewing.photographer && ` · ${(viewing.photographer as unknown as { first_name: string }).first_name}`}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50 rounded-full text-xs gap-1"
                  onClick={() => { removePhoto(viewing.id); setViewing(null) }}
                >
                  <X className="w-3 h-3" /> Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
