import { ConfigProvider, Layout } from 'antd'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        components: {
          Layout: {
            headerBg: '#fff',
            bodyBg: '#f8fafc',
          },
          Card: {
            boxShadowTertiary:
              '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          },
          Input: {
            activeBg: 'transparent',
            hoverBg: 'transparent',
          },
        },
      }}
    >
      <Layout className="min-h-screen">{children}</Layout>
    </ConfigProvider>
  )
}
