import { Card, Header, Layout, Content } from '#/Shared/atom'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <Layout>
      <Header />
      <Content />
    </Layout>
  )
}
