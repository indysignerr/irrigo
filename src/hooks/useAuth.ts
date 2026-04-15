'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import type { Member, Company } from '@/types'

export function useAuth() {
  const supabase = createClient()
  const router = useRouter()
  const { currentMember, company, setCurrentMember, setCompany } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: member } = await supabase
          .from('members')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (member) {
          setCurrentMember(member as Member)

          const { data: comp } = await supabase
            .from('companies')
            .select('*')
            .eq('id', member.company_id)
            .single()

          if (comp) setCompany(comp as Company)
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [supabase, setCurrentMember, setCompany])

  const signOut = async () => {
    await supabase.auth.signOut()
    setCurrentMember(null)
    setCompany(null)
    router.push('/login')
  }

  return { currentMember, company, loading, signOut, supabase }
}
