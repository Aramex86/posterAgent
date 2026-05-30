import fs from "node:fs/promises";

export async function saveToFile(name: string, data: any) {
  if (!data) return;
  const content =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);

  await fs.writeFile(name, content);

  console.log(`💾 Saved to ${name}`);
}
