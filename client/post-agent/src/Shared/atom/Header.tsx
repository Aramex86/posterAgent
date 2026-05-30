import { Avatar, Button, Layout, Space, Typography } from 'antd'

import {
  HistoryOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

const { Header } = Layout
const { Title, Text } = Typography

export default function AppHeader() {
  return (
    <Header className="flex justify-between items-center px-8 border-b border-slate-200 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Avatar
          shape="square"
          icon={<ThunderboltOutlined />}
          className="bg-indigo-600 shadow-md shadow-indigo-100"
        />
        <Title level={4} style={{ margin: 0, letterSpacing: '-0.5px' }}>
          Nexus{' '}
          <Text type="secondary" style={{ fontWeight: 400 }}>
            Content Agent
          </Text>
        </Title>
      </div>
      <Space>
        <Button icon={<HistoryOutlined />}>History</Button>
        <Button type="primary" ghost icon={<RocketOutlined />}>
          Pro Plan
        </Button>
      </Space>
    </Header>
  )
}
