import { Steps as AntSteps } from 'antd'

type StepsProps = {
  agentMessages: { message: string; timestamp: number } | null
}

const STEP_ITEMS = [
  { key: 'scrape', title: 'Scrape' },
  { key: 'summarize', title: 'Summarize' },
  { key: 'generate_content', title: 'Generate Post' },
  { key: 'approve', title: 'Review Gate' },
  { key: 'rewrite', title: 'Rewrite' },
]

export default function Steps({ agentMessages }: Readonly<StepsProps>) {
  const incomingMessage = agentMessages?.message
  const currentStepIndex = STEP_ITEMS.findIndex((item) => {
    // Map both native interrupt signals and approve node strings accurately
    if (
      item.key === 'approve' &&
      (incomingMessage === '__interrupt__' || incomingMessage === 'approve')
    ) {
      return true
    }
    return item.key === incomingMessage
  })

  // Sync step when backend message changes
  const activeStep = currentStepIndex !== -1 ? currentStepIndex : 0

  return (
    <div className="mt-10">
      <AntSteps
        current={activeStep} // ✅ prevent overflow
        items={STEP_ITEMS}
      />
      {agentMessages && (
        <div className="text-xs text-gray-400 mt-2">
          {new Date(agentMessages.timestamp).toLocaleTimeString()} •{' '}
          {agentMessages.message}
        </div>
      )}
    </div>
  )
}
