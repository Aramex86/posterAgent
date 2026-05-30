import { Space, Progress, Typography } from 'antd'
import type { JSX } from 'react'

const { Text } = Typography
export default function ProgressCount({
  status,
  agentMessage,
}: Readonly<{
  status: { label: string; icon: JSX.Element }
  agentMessage: { message: string; timestamp: number } | null
}>) {
  const progressSteps = {
    scrape: 25,
    summarize: 50,
    generate_content: 75,
    approve: 100,
    __interrupt__: 100,
    rewrite: 50,
  }

  const progress = agentMessage?.message
    ? progressSteps[agentMessage.message as keyof typeof progressSteps]
    : 0

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Space>
          {status.icon}
          <Text strong={true}>{status.label}</Text>
        </Space>
        {/* {processStep !== 'idle' && (
                <Text type="secondary" className="text-xs font-mono">
                  {progress}%
                </Text>
              )} */}
        {agentMessage?.message && (
          <Text type="secondary" className="text-xs font-mono">
            {progress}%
          </Text>
        )}
      </div>

      {/* {processStep !== 'idle' && processStep !== 'complete' && (
              <Progress
                percent={progress}
                showInfo={false}
                strokeColor={{ '0%': '#818cf8', '100%': '#6366f1' }}
                className="mb-6"
              />
            )} */}
      {agentMessage?.message && (
        <Progress
          percent={progress}
          showInfo={false}
          strokeColor={{ '0%': '#818cf8', '100%': '#6366f1' }}
          className="mb-6"
        />
      )}
    </>
  )
}
