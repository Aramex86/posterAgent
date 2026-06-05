import { START, END, StateGraph, MemorySaver } from "@langchain/langgraph";
import { GraphState } from "./state";
import { scrapingWebNode } from "./nodes/scrapingWeb_node";
import { summarizeNode } from "./nodes/summarize_node";
import { inferTopicNode } from "./nodes/inferTopicNode";
import { generateContentNode } from "./nodes/generate_node";
// import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { rewriteNode } from "./nodes/rewrite_node";
import { saveNode } from "./nodes/saveNode";
import { generateImageNode } from "./nodes/generateImageNode";
import { uploadImageNode } from "./nodes/uploadImageNode";
import { telegramNotifyNode } from "./nodes/telegramNotifyNode";
import { approvePostingNode } from "./nodes/approvePostingNode";
import { postToLinkedInNode } from "./nodes/postToLinkedInNode";
import { cancelNode } from "./nodes/cancelNode";
import { discussNode } from "./nodes/discussNode";

// const checkpointer = SqliteSaver.fromConnString("./checkpoints.sqlite");
const checkpointer = new MemorySaver();

const workflow = new StateGraph(GraphState)
  .addNode("scrape", scrapingWebNode)
  .addNode("summarize", summarizeNode)
  .addNode("infer_topic", inferTopicNode)
  .addNode("generate_content", generateContentNode)
  .addNode("discuss", discussNode)
  .addNode("rewrite", rewriteNode)
  .addNode("save", saveNode)
  .addNode("generate_image", generateImageNode)
  .addNode("upload_image", uploadImageNode)
  .addNode("telegram_notify", telegramNotifyNode)
  .addNode("approve_posting", approvePostingNode)
  .addNode("post_to_linkedin", postToLinkedInNode)
  .addNode("cancel", cancelNode);

workflow.addEdge(START, "scrape");

workflow.addConditionalEdges(
  "scrape",
  (state) => {
    return state.error ? "fail" : "continue";
  },
  {
    fail: END,
    continue: "summarize",
  },
);

workflow.addConditionalEdges(
  "summarize",
  (state) => {
    return state.error ? "fail" : "continue";
  },
  {
    fail: END,
    continue: "infer_topic",
  },
);

workflow.addConditionalEdges(
  "infer_topic",
  (state) => {
    return state.error ? "fail" : "continue";
  },
  {
    fail: END,
    continue: "generate_content",
  },
);

// After generation, go to discussion
workflow.addEdge("generate_content", "discuss");

// Discussion loop: can approve, rewrite, or continue discussing
workflow.addConditionalEdges(
  "discuss",
  (state) => {
    if (state.error) return "fail";
    if (state.status === "DISCUSSING") return "continue";
    return state.isApproved ? "save" : "rewrite";
  },
  {
    continue: "discuss", // Loop back for more discussion
    save: "save",        // Skip approve node — already approved in discuss
    rewrite: "rewrite",
    fail: END,
  },
);

workflow.addEdge("rewrite", "generate_content");

// After save, continue to image generation and posting pipeline
workflow.addEdge("save", "generate_image");
workflow.addEdge("generate_image", "upload_image");
workflow.addEdge("upload_image", "telegram_notify");
workflow.addEdge("telegram_notify", "approve_posting");

workflow.addConditionalEdges(
  "approve_posting",
  (state) => {
    if (state.error) return "fail";
    return state.isPostingApproved ? "post" : "cancel";
  },
  {
    post: "post_to_linkedin",
    cancel: "cancel",
    fail: END,
  },
);

workflow.addEdge("post_to_linkedin", END);
workflow.addEdge("cancel", END);

export const appGraph = workflow.compile({
  checkpointer,
});
