import { Context } from "grammy";

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply(
    "👋 Welcome to PosterAgent!\n\n" +
      "Send me a URL to generate a LinkedIn post.\n\n" +
      "Example: /generate https://react.dev/reference/react/useActionState",
  );
}
