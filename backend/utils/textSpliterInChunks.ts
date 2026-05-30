import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

async function textSplitterFunc(text: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkOverlap: 200,
    chunkSize: 1000,
  });

  const docs = await splitter.createDocuments([text]);

  console.log(`Создано чанков: ${docs.length}`);

  return docs;
}

export default textSplitterFunc;
