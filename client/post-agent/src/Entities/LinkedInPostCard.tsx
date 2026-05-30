import { useState, useCallback } from 'react'
import { Card, Button, Space, Typography, Tooltip, message } from 'antd'
import {
  CopyOutlined,
  CheckOutlined,
  LinkedinOutlined,
} from '@ant-design/icons'
import Markdown from 'react-markdown'
import type { PostStructure } from '#/Features/types'

const { Title, Text } = Typography

interface LinkedInPostCardProps {
  readonly post: PostStructure | null
}

function getTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) {
    return children.map(getTextFromChildren).join('')
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return getTextFromChildren(
      (children as { props: { children?: React.ReactNode } }).props.children,
    )
  }
  return ''
}

function CodeBlock({
  children,
  className,
}: {
  readonly children: React.ReactNode
  readonly className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = useCallback(async () => {
    const codeText = getTextFromChildren(children).replace(/\n$/, '')
    try {
      await navigator.clipboard.writeText(codeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      message.error('Failed to copy code')
    }
  }, [children])

  return (
    <div className="relative group my-4">
      <pre
        className={`${className} bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto`}
      >
        <code>{children}</code>
      </pre>
      <Tooltip title={copied ? 'Copied!' : 'Copy code for ray.so'}>
        <Button
          size="small"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopyCode}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
        />
      </Tooltip>
    </div>
  )
}

function PreRenderer({ children }: { readonly children: React.ReactNode }) {
  return <>{children}</>
}

interface CodeRendererProps {
  readonly children: React.ReactNode
  readonly className?: string
}

function CodeRenderer({ children, className }: CodeRendererProps) {
  const isInline = !className
  if (isInline) {
    return (
      <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  }
  return <CodeBlock className={className}>{children}</CodeBlock>
}

export default function LinkedInPostCard({ post }: LinkedInPostCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyPost = useCallback(async () => {
    if (!post) return
    const linkedInText = `${post.postTitle}\n\n${post.postContent}\n\n${post.hashtags.join(' ')}`
    try {
      await navigator.clipboard.writeText(linkedInText)
      setCopied(true)
      message.success('Post copied for LinkedIn!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      message.error('Failed to copy post')
    }
  }, [post])

  if (!post) return null

  return (
    <Card
      className="mt-10 border-slate-200 shadow-sm"
      title={
        <Space>
          <LinkedinOutlined className="text-blue-700" />
          <span className="font-semibold">LinkedIn Post Preview</span>
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopyPost}
          className="bg-blue-700 hover:bg-blue-800"
        >
          {copied ? 'Copied!' : 'Copy for LinkedIn'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Title level={4} className="mb-2!">
          {post.postTitle}
        </Title>

        <div className="pt-2">
          <Text className="text-blue-600">
            {post.hashtags.map((hashtag) => `${hashtag}`).join(' ')}
          </Text>
        </div>

        <div className="prose prose-slate max-w-none">
          <Markdown
            components={{
              pre: PreRenderer,
              code: CodeRenderer,
            }}
          >
            {post.postContent}
          </Markdown>
        </div>
      </div>
    </Card>
  )
}
