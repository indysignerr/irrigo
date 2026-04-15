'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Droplets, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState('')
  const [siren, setSiren] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      })

      if (authError || !authData.user) {
        toast.error(authError?.message || "Erreur lors de l'inscription")
        setLoading(false)
        return
      }

      // 2. Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name: companyName, siren: siren || null })
        .select()
        .single()

      if (companyError || !company) {
        toast.error("Erreur lors de la création de l'entreprise")
        setLoading(false)
        return
      }

      // 3. Create member as admin
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: authData.user.id,
          company_id: company.id,
          first_name: firstName,
          last_name: lastName,
          email,
          role: 'admin',
        })

      if (memberError) {
        toast.error("Erreur lors de la création du profil")
        setLoading(false)
        return
      }

      toast.success('Compte créé avec succès !')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-honey/30 px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl shadow-sm border border-gray-200">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-matcha rounded-xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Irrigo</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Créez votre espace entreprise
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
              <Input
                id="companyName"
                placeholder="Jardins du Soleil"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siren">SIREN <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input
                id="siren"
                placeholder="123456789"
                value={siren}
                onChange={(e) => setSiren(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  placeholder="Marc"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@entreprise.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-full bg-matcha hover:bg-matcha-dark text-white"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer mon entreprise"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-matcha hover:text-matcha-dark font-medium">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
