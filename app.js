const { App } = require('@slack/bolt');

require('dotenv').config()

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.message(/^<@U01LVDNCZQF>\s(hi|hello|hey).*/i, async ({ context, say }) => {
  const greeting = context.matches[0];

  await say(`${greeting}, how are you?`);
});

(async () => {
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
