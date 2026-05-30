import { StateType } from '../state';
import { bot } from '../utils/telegramBot';

export async function postToLinkedInNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log('--- SIMULATING LINKEDIN POST NODE ---');

  const post = state.post;
  const challengeText = post.tehnicalChallange
    ? 'Challenge: ' + post.tehnicalChallange.title + '\n' + post.tehnicalChallange.description
    : '';
  const formattedText = [
    post.postTitle,
    '',
    post.postContent,
    '',
    challengeText,
    '',
    post.hashtags?.join(' ') || ''
  ].join('\n').trim();

  console.log('SIMULATED LinkedIn Post:');
  console.log('========================================');
  console.log(formattedText);
  console.log('========================================');
  if (state.imageUrl) {
    console.log('Image URL: ' + state.imageUrl);
  }
  console.log('SIMULATION: Post would be published to LinkedIn');

  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (state.telegramChatId && state.telegramMessageId) {
    try {
      await bot.api.editMessageText(
        state.telegramChatId,
        state.telegramMessageId,
        'Simulated: Posted to LinkedIn!\n\n' + escapeMarkdown(post.postTitle) + '\n\n_(This was a simulation - no real post was published)_',
        { parse_mode: 'Markdown' },
      );
    } catch (tgError: any) {
      console.warn('Failed to update Telegram message:', tgError.message);
    }
  }

  return {
    isPosted: true,
    status: 'POSTED_TO_LINKEDIN',
    error: null,
  };
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+');
}
