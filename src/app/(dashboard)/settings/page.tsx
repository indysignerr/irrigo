'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/stores/useAppStore'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, LogOut, Building, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function SettingsPage() {
  const { currentMember, company, signOut } = useAuth()
  const { setCurrentMember, setCompany } = useAppStore()
  const supabase = createClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [siren, setSiren] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentMember) {
      setFirstName(currentMember.first_name)
      setLastName(currentMember.last_name)
    }
    if (company) {
      setCompanyName(company.name)
      setSiren(company.siren || '')
    }
  }, [currentMember, company])

  const saveProfile = async () => {
    if (!currentMember) return
    setSaving(true)

    await supabase
      .from('members')
      .update({ first_name: firstName, last_name: lastName })
      .eq('id', currentMember.id)

    setCurrentMember({ ...currentMember, first_name: firstName, last_name: lastName })
    toast.success('Profil mis à jour')
    setSaving(false)
  }

  const saveCompany = async () => {
    if (!company) return
    setSaving(true)

    await supabase
      .from('companies')
      .update({ name: companyName, siren: siren || null })
      .eq('id', company.id)

    setCompany({ ...company, name: companyName, siren })
    toast.success('Entreprise mise à jour')
    setSaving(false)
  }

  const isAdmin = currentMember?.role === 'admin'

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Paramètres' }]} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card className="rounded-2xl shadow-sm border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-matcha" /> Profil personnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={currentMember?.email || ''} disabled className="bg-gray-50" />
            </div>
            <Button className="rounded-full bg-matcha hover:bg-matcha-dark text-white" onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </CardContent>
        </Card>

        {/* Company (admin only) */}
        {isAdmin && (
          <Card className="rounded-2xl shadow-sm border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5 text-matcha" /> Entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de l&apos;entreprise</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>SIREN</Label>
                <Input value={siren} onChange={(e) => setSiren(e.target.value)} />
              </div>
              <Button className="rounded-full bg-matcha hover:bg-matcha-dark text-white" onClick={saveCompany} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Team link */}
        {isAdmin && (
          <Link href="/team">
            <Card className="rounded-2xl shadow-sm border border-gray-200 hover:border-matcha/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-matcha" />
                <span className="font-medium text-gray-900">Gérer l&apos;équipe</span>
              </CardContent>
            </Card>
          </Link>
        )}

        <Separator />

        <Button variant="outline" className="rounded-full text-red-500 border-red-200 hover:bg-red-50 gap-2" onClick={signOut}>
          <LogOut className="w-4 h-4" /> Se déconnecter
        </Button>
      </div>
    </div>
  )
}
