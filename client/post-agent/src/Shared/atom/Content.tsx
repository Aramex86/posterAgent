import { AgentCard } from '#/Entities'
import { Layout } from 'antd'

const { Content } = Layout

export default function AppContent() {
  return (
    <Content className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="lg:col-span-5">
        <AgentCard />
      </div>
    </Content>
  )
}
