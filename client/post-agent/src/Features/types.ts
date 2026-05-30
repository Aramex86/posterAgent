import { z } from 'zod'

const GeneratedPost = z.object({
  postTitle: z.string(),
  postContent: z.string(),
  tehnicalChallange: z.object({
    title: z.string(),
    description: z.string(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  }),
  hashtags: z.array(z.string()),
  feedback: z.string(),
})

const PostInput = z.object({
  url: z.string().nonempty(),
})

const RewriteInput = z.object({
  feedback: z.string().min(1),
  thread_id: z.string().nonempty(),
})

export type PostStructure = z.infer<typeof GeneratedPost>
export type PostInput = z.infer<typeof PostInput>
export type RewriteInput = z.infer<typeof RewriteInput>
