import * as cheerio from "cheerio";
import textSplitterFunc from "../utils/textSplitterInChunks";
import { StateType } from "../state";
export async function scrapingWebNode(
  state: StateType,
): Promise<Partial<StateType>> {
  try {
    console.log(`--- Beging Scraping: ${state.url} ---`);
    if (!state.url) throw new Error("Please provide a valid url");

    const response = await fetch(state.url);

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const html = await response.text();
    //2. load to cherio for parsing
    const $ = cheerio.load(html);

    $("nav, footer, script, style, aside, header").remove();

    const container = $("article").length ? $("article") : $("main");

    const rawText = container.text();

    const cleanText = rawText.replace(/\s+/g, " ").trim();

    const docs = await textSplitterFunc(cleanText);

    console.log(`--- Done Scraping: ${state.url} ---`);
    return {
      docs: docs,
      error: null,
      status: "SCRAPING_COMPLETE",
    };
  } catch (e: any) {
    console.log("Face the error", e);

    return {
      error: e.message,
    };
  }
}
