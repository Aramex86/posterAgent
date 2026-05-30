import { agentApi } from './api'
import type { PostInput, RewriteInput } from './types'

export async function generatePost(data: PostInput) {
  const response = await fetch(`http://localhost:5000/${agentApi.start}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function rewritePost(data: RewriteInput) {
  const response = await fetch(`http://localhost:5000/${agentApi.rewrite}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  console.log('📡 rewritePost response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Server error:', errorText)
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  console.log('✅ rewritePost result:', result)
  return result
}
export async function getStatus({ thread_id }: { thread_id: string }) {
  const response = await fetch(
    `http://localhost:5000/${agentApi.getUpdates}/${thread_id}`,
  )
  return response.json()
}
