'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Trash2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import type { Member } from '@/types'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  chef_equipe: "Chef d'équipe",
  technicien: 'Technicien',
}

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  chef_equipe: 'bg-blue-100 text-blue-700 border-blue-200',
  technicien: 'bg-green-100 text-green-700 border-green-200',
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [siteCounts, setSiteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [inviteRole, setInviteRole] = useState('technicien')
  const [inviting, setInviting] = useState(false)
  const { currentMember } = useAppStore()
  const supabase = createClient()

  const load = async () => {
    if (!currentMember) return

    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .eq('company_id', currentMember.company_id)
      .order('created_at')

    if (membersData) {
      setMembers(membersData as Member[])

      // Count sites per technician
      const { data: sites } = await supabase
        .from('sites')
        .select('assigned_technician_id')
        .eq('company_id', currentMember.company_id)

      if (sites) {
        const counts: Record<string, number> = {}
        sites.forEach((s) => {
          if (s.assigned_technician_id) {
            counts[s.assigned_technician_id] = (counts[s.assigned_technician_id] || 0) + 1
          }
        })
        setSiteCounts(counts)
      }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [currentMember])

  const handleInvite = async () => {
    if (!currentMember || !inviteEmail || !inviteFirstName || !inviteLastName) return
    setInviting(true)

    // Create auth user via signUp (they'll get a confirmation email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inviteEmail,
      password: Math.random().toString(36).slice(2) + 'A1!', // temp password, user resets via email
      options: { data: { first_name: inviteFirstName, last_name: inviteLastName } },
    })

    if (authError) {
      toast.error(authError.message)
      setInviting(false)
      return
    }

    if (authData.user) {
      await supabase.from('members').insert({
        user_id: authData.user.id,
        company_id: currentMember.company_id,
        first_name: inviteFirstName,
        last_name: inviteLastName,
        email: inviteEmail,
        role: inviteRole,
      })
    }

    toast.success(`${inviteFirstName} a été invité(e)`)
    setDialogOpen(false)
    setInviteEmail('')
    setInviteFirstName('')
    setInviteLastName('')
    setInviteRole('technicien')
    setInviting(false)
    load()
  }

  const handleDelete = async (member: Member) => {
    await supabase.from('members').delete().eq('id', member.id)
    toast.success(`${member.first_name} a été retiré de l'équipe`)
    load()
  }

  const isAdmin = currentMember?.role === 'admin'

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Équipe' }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button className="rounded-full bg-matcha hover:bg-matcha-dark text-white gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Inviter un membre
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un membre</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v ?? "")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chef_equipe">Chef d&apos;équipe</SelectItem>
                      <SelectItem value="technicien">Technicien</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full rounded-full bg-matcha hover:bg-matcha-dark text-white" onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteFirstName || !inviteLastName}>
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer l\'invitation'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-matcha" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m) => (
            <Card key={m.id} className="rounded-2xl shadow-sm border border-gray-200">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-matcha/20 flex items-center justify-center text-lg font-semibold text-matcha flex-shrink-0">
                  {m.first_name[0]}{m.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{m.first_name} {m.last_name}</span>
                    <Badge variant="outline" className={`text-xs ${roleBadgeColors[m.role]}`}>
                      {roleLabels[m.role]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                  {siteCounts[m.id] !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{siteCounts[m.id]} site{siteCounts[m.id] > 1 ? 's' : ''} assigné{siteCounts[m.id] > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                {isAdmin && m.id !== currentMember?.id && (
                  <AlertDialog>
                    <AlertDialogTrigger className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md p-2 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {m.first_name} {m.last_name} sera retiré de l&apos;équipe. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => handleDelete(m)}>
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
    </div>
  )
}
