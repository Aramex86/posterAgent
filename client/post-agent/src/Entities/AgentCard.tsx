import { generatePost, rewritePost } from '#/Features/slice'
import type { PostStructure } from '#/Features/types'
import { ProgressCount } from '#/Shared/atom'
import { useAgentLogs } from '#/Shared/hooks/useAgentLogs'
import useAgentStatus from '#/Shared/hooks/useAgentStatus'
import {
  SearchOutlined,
  GlobalOutlined,
  EditOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  LoadingOutlined,
  SendOutlined,
  MessageOutlined,
  LinkedinOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import {
  Card,
  Space,
  Input,
  Tag,
  Button,
  Spin,
  Typography,
  Form,
  Image,
} from 'antd'
import { useState } from 'react'

const { Text } = Typography
const { TextArea } = Input

export default function AgentCard() {
  const [topic, setTopic] = useState('')
  const [post, setPost] = useState<PostStructure | null>(null)
  const [thread_id, setThread_id] = useState<string>('')
  const [iteration, setIteration] = useState<number>(0)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('')

  const [form] = Form.useForm()

  const suggestions = [
    { key: 'useCallback', value: 'useCallback usage' },
    { key: 'useState', value: 'useState hooks' },
    { key: 'useEffect', value: 'useEffect patterns' },
    { key: 'server-components', value: 'React Server Components' },
  ]

  const {
    agentMessage,
    streamedPost,
    setAgentMessage,
    isPostingPhase,
    setIsPostingPhase,
    imageUrl,
  } = useAgentLogs(iteration, thread_id)

  const startAgent = useMutation({
    mutationFn: generatePost,
    onSuccess: (data) => {
      setPost(data.post)
      setThread_id(data.thread_id)
      setIteration(0)
      setIsPostingPhase(false)
      setGeneratedImageUrl('')
    },
  })

  const rewrite = useMutation({
    mutationFn: rewritePost,
    onSuccess: (data) => {
      setPost(data.post)
      setThread_id(data.thread_id)

      if (data.status === 'APPROVED_AND_SAVED') {
        setAgentMessage({ message: 'save_complete', timestamp: Date.now() })
        return
      }

      if (data.status === 'REWRITE_TRIGGERED') {
        setIteration((prev) => prev + 1)
      }
    },
    onError: (error) => {
      console.log('❌ onError FULL:', error)
    },
  })

  const approvePosting = useMutation({
    mutationFn: async ({ approved }: { approved: boolean }) => {
      const response = await fetch(`http://localhost:5000/telegram/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id,
          approved,
        }),
      })
      return response.json()
    },
    onSuccess: (data) => {
      if (data.status === 'POSTING_APPROVED') {
        setAgentMessage({ message: 'posted', timestamp: Date.now() })
        setIsPostingPhase(false)
      } else {
        setAgentMessage({ message: 'posting_skipped', timestamp: Date.now() })
        setIsPostingPhase(false)
      }
    },
    onError: (error) => {
      console.error('❌ Posting approval error:', error)
      setAgentMessage({ message: 'posting_failed', timestamp: Date.now() })
    },
  })

  function handleStartAgent() {
    const { topicForm, url } = form.getFieldsValue(true)

    if (url) {
      startAgent.mutate({
        url: url,
      })
      form.resetFields(['topicForm', 'url'])
      return
    }

    startAgent.mutate({
      url: `https://react.dev/reference/react/${topicForm || topic}`,
    })
    form.resetFields(['topicForm', 'url'])
  }

  const isGeneratingPost =
    startAgent.isPending || rewrite.isPending || approvePosting.isPending
  const activePostData = post || streamedPost

  function handleSave() {
    if (!thread_id) return

    rewrite.mutate({
      feedback: '',
      thread_id: thread_id,
    })
    form.resetFields()
  }
  function handleFeedback() {
    const { feedback } = form.getFieldsValue(true)

    if (!feedback) return
    rewrite.mutate({
      feedback: feedback,
      thread_id: thread_id,
    })
    form.resetFields(['feedback'])
  }

  function handleApprovePosting() {
    if (!thread_id) return
    approvePosting.mutate({ approved: true })
  }

  function handleSkipPosting() {
    if (!thread_id) return
    approvePosting.mutate({ approved: false })
  }

  const status = useAgentStatus(agentMessage?.message || '')
  return (
    <Form form={form}>
      <Card
        title={
          <Space>
            <SearchOutlined className="text-indigo-600" />
            Configure Agent
          </Space>
        }
        className="border-slate-200 shadow-sm w-full"
      >
        <Space orientation="vertical" className="w-full" size="large">
          <div className="space-y-2">
            <Text strong={true} className="text-xs uppercase text-slate-400">
              Source URL
            </Text>
            <Form.Item name="url">
              <Input
                size="large"
                placeholder="https://example.com/article"
                prefix={<GlobalOutlined className="text-slate-300" />}
                allowClear
                disabled={isGeneratingPost}
              />
            </Form.Item>
          </div>

          <div className="space-y-2">
            <Text strong={true} className="text-xs uppercase text-slate-400">
              Focus Topic
            </Text>
            <Form.Item name="topicForm" style={{ background: 'transparent' }}>
              <Input
                size="large"
                placeholder="e.g. Master React Optimization"
                prefix={<EditOutlined className="text-slate-300" />}
                allowClear
                disabled={isGeneratingPost}
                className="bg-white"
              />
            </Form.Item>
            <div className="mt-2 flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <Tag
                  key={s.key}
                  className="cursor-pointer hover:border-indigo-400 transition-colors"
                  onClick={() => {
                    setTopic(s.key)
                    return (
                      !isGeneratingPost &&
                      form.setFieldsValue({ topicForm: s.value })
                    )
                  }}
                >
                  + {s.value}
                </Tag>
              ))}
            </div>
          </div>

          <div className="pt-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
            <ProgressCount status={status} agentMessage={agentMessage} />

            {isGeneratingPost ? (
              <Button block size="large" disabled className="bg-white">
                <Spin
                  indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
                  className="mr-2"
                />
                Agent is Busy...
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                block
                icon={<ArrowRightOutlined />}
                onClick={handleStartAgent}
                style={{ height: '54px', fontSize: '16px', fontWeight: 600 }}
                disabled={
                  agentMessage?.message === 'interrupt' || isPostingPhase
                }
              >
                Start Agent Workflow
              </Button>
            )}

            {agentMessage?.message === 'interrupt' && !isPostingPhase && (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 mt-4">
                {/* Post preview before first approval */}
                {activePostData && (
                  <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                    <Text strong className="text-lg block">
                      {activePostData.postTitle}
                    </Text>
                    <Text className="text-slate-600 block whitespace-pre-wrap">
                      {activePostData.postContent}
                    </Text>
                    <Text className="text-blue-600 block">
                      {activePostData.hashtags.join(' ')}
                    </Text>
                  </div>
                )}

                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                >
                  Save & Finalize Posts
                </Button>
              </div>
            )}

            {/* Second Approval Phase - Post to LinkedIn */}
            {isPostingPhase && (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 mt-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Text strong className="text-blue-700 block mb-2">
                    🚀 Ready to Post to LinkedIn
                  </Text>
                  <Text className="text-blue-600 text-sm">
                    Review your post below and approve to publish it to LinkedIn
                    automatically.
                  </Text>
                </div>

                {/* Post text preview */}
                {activePostData && (
                  <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                    <Text strong className="text-lg block">
                      {activePostData.postTitle}
                    </Text>
                    <Text className="text-slate-600 block whitespace-pre-wrap">
                      {activePostData.postContent}
                    </Text>
                    <Text className="text-blue-600 block">
                      {activePostData.hashtags.join(' ')}
                    </Text>
                  </div>
                )}

                {/* Generated image */}
                {(generatedImageUrl || imageUrl) && (
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    <Image
                      src={generatedImageUrl || imageUrl}
                      alt="Generated code snippet"
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<LinkedinOutlined />}
                    onClick={handleApprovePosting}
                    loading={approvePosting.isPending}
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    Post to LinkedIn
                  </Button>
                  <Button
                    size="large"
                    block
                    icon={<CloseOutlined />}
                    onClick={handleSkipPosting}
                    disabled={approvePosting.isPending}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Space>
      </Card>
      {agentMessage?.message === 'interrupt' && !isPostingPhase && (
        <Card
          className="mt-7 mb-3 border-indigo-100 bg-indigo-50/30 animate-in fade-in slide-in-from-top-4"
          title={
            <Space>
              <MessageOutlined className="text-indigo-600" />
              Post-Generation Feedback
            </Space>
          }
        >
          <Space orientation="vertical" className="w-full">
            <Form.Item name="feedback">
              <TextArea
                rows={3}
                placeholder={`Fine-tune the activePlatform draft... (e.g. 'Make it punchier', 'Add a hook')`}
                className="bg-white border-indigo-100 focus:border-indigo-300"
              />
            </Form.Item>
            <div className="flex justify-end gap-2">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleFeedback}
              >
                Update Drafts
              </Button>
            </div>
          </Space>
        </Card>
      )}
    </Form>
  )
}
