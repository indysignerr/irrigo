import { create } from 'zustand'
import type { Member, Company } from '@/types'

interface AppState {
  currentMember: Member | null
  company: Company | null
  unreadCount: number
  setCurrentMember: (member: Member | null) => void
  setCompany: (company: Company | null) => void
  setUnreadCount: (count: number) => void
  incrementUnread: () => void
  decrementUnread: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentMember: null,
  company: null,
  unreadCount: 0,
  setCurrentMember: (member) => set({ currentMember: member }),
  setCompany: (company) => set({ company }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
}))
