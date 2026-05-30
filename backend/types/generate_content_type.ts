import { z } from "zod";

export const OutputSchema = z.object({
  postTitle: z.string().describe("Captivant title of the post"),
  postContent: z.string().describe("Primary post content with emodji"),
  codeExample: z
    .string()
    .describe("A practical JSX/React code example to illustrate the concept"),
  tehnicalChallange: z.object({
    title: z.string().describe("Title"),
    description: z.string().describe("What need to done"),
    difficulty: z.enum(["Easy", "Medium", "Hard"]).describe("Dificulty level"),
  }),
  hashtags: z.array(z.string()).describe("List of relevant hashtags"),
});

export type GeneratedOutput = z.infer<typeof OutputSchema>;
