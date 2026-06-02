import { agentApi } from '#/Features/api'
import { API_BASE_URL } from '#/config'
import type { PostStructure } from '#/Features/types'
import { useState, useEffect } from 'react'

export function useAgentLogs(iteration: number, thread_id: string) {
  const [agentMessage, setAgentMessage] = useState<{
    message: string
    timestamp: number
  } | null>(null)
  const [streamedPost, setStreamedPost] = useState<PostStructure | null>(null)
  const [isPostingPhase, setIsPostingPhase] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')

  useEffect(() => {
    if (!thread_id || thread_id === '') return

    const es = new EventSource(
      `${API_BASE_URL}/${agentApi.getUpdates}/${thread_id}`,
    )

    es.addEventListener('update', (e) => {
      console.log('📩 Update received:', e.data)

      // ✅ Parse and store in state
      try {
        const parsed = JSON.parse(e.data)

        if (parsed.message === '__interrupt__') {
          setAgentMessage({ message: 'interrupt', timestamp: Date.now() })
          return
        }

        // Handle second approval interrupt for posting
        if (parsed.message === 'approve_posting') {
          setIsPostingPhase(true)
          setImageUrl(parsed.imageUrl || '')
          setAgentMessage({ message: 'approve_posting', timestamp: Date.now() })
          return
        }

        console.log(parsed, 'PARSED')

        if (parsed.message === 'save_complete') {
          setAgentMessage({ message: 'save_complete', timestamp: Date.now() })
          // Don't close SSE yet — wait for posting phase
          return
        }

        if (parsed.message === 'POSTED_TO_LINKEDIN') {
          setAgentMessage({ message: 'posted', timestamp: Date.now() })
          es.close()
          return
        }

        if (parsed.message === 'POSTING_FAILED') {
          setAgentMessage({ message: 'posting_failed', timestamp: Date.now() })
          es.close()
          return
        }

        setAgentMessage(parsed)

        if (parsed.post) setStreamedPost(parsed.post)
      } catch {
        console.error('Failed to parse SSE data:', e.data)
      }
    })

    es.onerror = (err) => {
      console.error('❌ SSE Error:', err)
    }

    return () => {
      es.close()
    }
  }, [thread_id, iteration])

  return {
    agentMessage,
    setAgentMessage,
    streamedPost,
    isPostingPhase,
    setIsPostingPhase,
    imageUrl,
  }
}
