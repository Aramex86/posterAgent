import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import { Document } from "@langchain/core/documents";
import { OutputSchema } from "./types/generate_content_type";

export type PostStructure = z.infer<typeof OutputSchema>;
// const GraphStateScheema = z.object({
//   url: z.string().default(""),
//   docs: z.array(z.instanceof(Document)).default([]),
//   summary: z.string().default(""),
//   post: z.string().default(""),
//   challenge: z.string().default(""),
//   isApproved: z.boolean().default(false),
//   feeedback: z.string().default(""),
//   error: z.string().nullable().default(null),
// });

export const GraphState = Annotation.Root({
  url: Annotation<string>,
  docs: Annotation<Document[]>,
  summary: Annotation<string>,
  post: Annotation<PostStructure>,
  challenge: Annotation<string>,
  isApproved: Annotation<boolean>,
  feedback: Annotation<string>,
  error: Annotation<string | null>,
  rewriteCount: Annotation<number>,
  status: Annotation<string>,
  // New fields for LinkedIn auto-posting
  imageUrl: Annotation<string>,
  telegramMessageId: Annotation<number | undefined>,
  telegramChatId: Annotation<number | undefined>,
  isPosted: Annotation<boolean>,
  postingError: Annotation<string | null>,
  isPostingApproved: Annotation<boolean>,
  // Topic inference for dynamic system messages
  topic: Annotation<string>,
});

export type StateType = typeof GraphState.State;
