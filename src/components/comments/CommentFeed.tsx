'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/useAppStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Comment, Member } from '@/types'

interface CommentFeedProps {
  siteId: string
  members: Member[]
}

export function CommentFeed({ siteId, members }: CommentFeedProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const { currentMember } = useAppStore()
  const supabase = createClient()

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, author:members!comments_author_id_fkey(*)')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true })

    if (data) setComments(data as Comment[])
  }

  useEffect(() => {
    loadComments()

    const channel = supabase
      .channel(`comments-${siteId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `site_id=eq.${siteId}` }, () => {
        loadComments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [siteId])

  const handleSend = async () => {
    if (!content.trim() || !currentMember) return
    setSending(true)

    // Parse @mentions
    const mentionRegex = /@(\w+\s\w+)/g
    const mentionNames = [...content.matchAll(mentionRegex)].map((m) => m[1])
    const mentionIds = members
      .filter((m) => mentionNames.some((name) => `${m.first_name} ${m.last_name}`.toLowerCase() === name.toLowerCase()))
      .map((m) => m.id)

    const { error } = await supabase.from('comments').insert({
      site_id: siteId,
      author_id: currentMember.id,
      content: content.trim(),
      mentions: mentionIds.length > 0 ? mentionIds : null,
    })

    if (error) {
      toast.error("Erreur lors de l'envoi")
      setSending(false)
      return
    }

    // Create notifications for mentions
    if (mentionIds.length > 0) {
      const notifications = mentionIds.map((recipientId) => ({
        company_id: currentMember.company_id,
        recipient_id: recipientId,
        type: 'mention' as const,
        title: 'Vous avez été mentionné',
        message: `${currentMember.first_name} vous a mentionné dans un commentaire`,
        related_site_id: siteId,
      }))
      await supabase.from('notifications').insert(notifications)
    }

    setContent('')
    setSending(false)
  }

  const renderContent = (text: string) => {
    return text.replace(/@(\w+\s\w+)/g, '<span class="text-matcha font-semibold">@$1</span>')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun commentaire</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-matcha/20 flex items-center justify-center text-[10px] font-semibold text-matcha flex-shrink-0 mt-0.5">
                {c.author?.first_name?.[0]}{c.author?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {c.author?.first_name} {c.author?.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p
                  className="text-sm text-gray-600 mt-0.5"
                  dangerouslySetInnerHTML={{ __html: renderContent(c.content) }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="Ajouter un commentaire... (@nom pour mentionner)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          size="icon"
          className="rounded-full bg-matcha hover:bg-matcha-dark text-white flex-shrink-0 self-end"
          onClick={handleSend}
          disabled={sending || !content.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
