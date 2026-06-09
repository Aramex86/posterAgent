import { Context } from "grammy";

export async function handleHealth(ctx: Context): Promise<void> {
  const uptime = process.uptime();
  const uptimeText = formatUptime(uptime);

  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);

  const healthReport =
    `🩺 *PosterAgent Health Report*\n\n` +
    `*Status:* ✅ Online\n` +
    `*Uptime:* ${uptimeText}\n` +
    `*Node:* ${process.version}\n` +
    `*Platform:* ${process.platform}\n\n` +
    `*Memory:*\n` +
    `  Heap used: ${heapUsedMB} MB\n` +
    `  Heap total: ${heapTotalMB} MB\n\n` +
    `*Env:* ${process.env.NODE_ENV || "development"}\n` +
    `*Railway:* ${process.env.RAILWAY_ENVIRONMENT ? "yes" : "no"}`;

  await ctx.reply(healthReport, { parse_mode: "Markdown" });
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}
