import { generatePost, rewritePost } from '#/Features/slice'
import type { PostStructure } from '#/Features/types'
import { useMutation } from '@tanstack/react-query'
import { Card as AntCard, Button, Input, Form } from 'antd'
import { useState } from 'react'
import Markdown from 'react-markdown'
import { useAgentLogs } from '../hooks/useAgentLogs'
import Steps from './Steps'

export default function Card() {
  const [post, setPost] = useState<PostStructure | null>(null)
  const [thread_id, setThread_id] = useState<string>('')
  const [iteration, setIteration] = useState<number>(0)

  const [form] = Form.useForm()

  console.log(thread_id, 'threadId CLIENT')

  const { agentMessage, streamedPost } = useAgentLogs(
    String(iteration),
    thread_id,
  )

  // function handleTopic() {
  //   const { topicForm, url } = form.getFieldsValue(true)

  //   if (url) {
  //     startAgent.mutate({
  //       url: url,
  //     })
  //     form.resetFields(['topicForm', 'url'])
  //     return
  //   }

  //   startAgent.mutate({
  //     url: `https://react.dev/reference/react/${topicForm || 'useActionState'}`,
  //   })
  //   form.resetFields(['topicForm', 'url'])
  // }
  // function handleFeedback() {
  //   const { feedback } = form.getFieldsValue(true)

  //   if (!feedback) return

  //   rewrite.mutate({
  //     feedback: feedback,
  //     thread_id: thread_id,
  //   })
  //   form.resetFields(['feedback'])
  // }

  // function handlePredifined(value: string) {
  //   startAgent.mutate({
  //     url: `https://react.dev/reference/react/${value}`,
  //   })
  // }

  // function handleSave() {
  //   if (!thread_id) return

  //   rewrite.mutate({
  //     feedback: '',
  //     thread_id: thread_id,
  //   })
  //   form.resetFields(['feedback'])
  // }

  // const isProcessing = startAgent.isPending || rewrite.isPending
  // const activePostData = post || streamedPost

  return (
    <Form form={form} component={false}>
      {/* <AntCard
        title="Generate post agent"
        style={{ width: 800, marginTop: 40 }}
        actions={[
          <Button onClick={handleTopic} key={'generate'} type="text">
            Generate post
          </Button>,
          <Button onClick={handleFeedback} key={'rewrite'} type="text">
            Rewrite post
          </Button>,
          <Button onClick={handleSave} key={'save'} type="text">
            Save post
          </Button>,
        ]}
      >
        <div className="flex gap-2 flex-wrap justify-center">
          <Button
            className="text-[14px] border-2 text-center rounded-xl cursor-pointer"
            onClick={() => handlePredifined('useCallback')}
            disabled={isProcessing}
          >
            Generate post about useCallback
          </Button>
          <Button
            className="text-[14px] border-2 text-center rounded-xl cursor-pointer"
            onClick={() => handlePredifined('useState')}
            disabled={isProcessing}
          >
            Generate post about useState
          </Button>
          <Button
            className="text-[14px] border-2 text-center rounded-xl cursor-pointer"
            onClick={() => handlePredifined('useEffect')}
            disabled={isProcessing}
          >
            Generate post about useEffect
          </Button>
        </div>

        <Steps agentMessages={agentMessage} />

        {activePostData && (
          <div className="mt-4  border border-gray-300 rounded-lg p-2">
            <h1 className="font-bold mb-4 text-xl">
              {activePostData.postTitle}
            </h1>
            <Markdown>{activePostData.postContent}</Markdown>
            <span>
              {activePostData.hashtags.map((hashtag) => `${hashtag}`).join(' ')}
            </span>
          </div>
        )}

        <div className="mt-6">
          <Form.Item name="url" label="URL" labelCol={{ span: 24 }} required>
            <Input
              placeholder="Provide your post URL"
              allowClear
              disabled={isProcessing}
            />
          </Form.Item>
          <Form.Item
            name="topicForm"
            label="Topic"
            labelCol={{ span: 24 }}
            required
          >
            <Input
              placeholder="Provide your post Topic"
              allowClear
              disabled={isProcessing}
            />
          </Form.Item>
          <Form.Item name="feedback" label="Feedback" labelCol={{ span: 24 }}>
            <Input.TextArea placeholder="Provide feedback" allowClear />
          </Form.Item>
        </div>
      </AntCard> */}
    </Form>
  )
}
