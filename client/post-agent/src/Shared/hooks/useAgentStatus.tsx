import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LoadingOutlined,
  LinkedinOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'

export default function useAgentStatus(agentMessage: string | null) {
  switch (agentMessage) {
    case 'scrape':
      return {
        label: 'Scraping Source Data...',
        icon: <GlobalOutlined spin />,
      }
    case 'summarize':
      return {
        label: 'Summarizing Content...',
        icon: <FileTextOutlined spin />,
      }
    case 'generate_content':
      return {
        label: 'Generating Platform Drafts...',
        icon: <LoadingOutlined />,
      }
    case 'approve':
    case '__interrupt__':
      return {
        label: 'Drafts Ready for Review',
        icon: <CheckCircleOutlined className="text-green-500" />,
      }
    case 'rewrite':
      return {
        label: 'Rewriting Drafts...',
        icon: <CheckCircleOutlined className="text-green-500" />,
      }
    case 'save_complete':
      return {
        label: 'Post Saved! Preparing for LinkedIn...',
        icon: <LoadingOutlined className="text-blue-500" />,
      }
    case 'approve_posting':
      return {
        label: 'Ready to Post to LinkedIn',
        icon: <LinkedinOutlined className="text-blue-600" />,
      }
    case 'posted':
      return {
        label: '✅ Posted to LinkedIn!',
        icon: <CheckCircleOutlined className="text-green-600" />,
      }
    case 'posting_failed':
      return {
        label: '❌ LinkedIn Post Failed',
        icon: <CloseCircleOutlined className="text-red-500" />,
      }
    default:
      return { label: 'Run Content Agent', icon: <ArrowRightOutlined /> }
  }
}
