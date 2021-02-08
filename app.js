const { App } = require('@slack/bolt');
const { parse } = require('shell-quote');
const { execFile } = require('child_process');

require('dotenv').config()

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.message(/^<@U01LVDNCZQF> cli (\S.*)$/, async ({ context, say }) => {
  const args = context.matches[1];
  const parsedArgs = parse(args);
  const commandArgs = ["run", "--silent", "artsy"].concat(parsedArgs)

  execFile("yarn", commandArgs, async (error, stdout) => {
    if (error) {
      await say(`error: ${error.toString()}`) ;
    } else {
      await say("```\n" + stdout.trim() + "\n```");
    }
  });
})

app.message(/^<@U01LVDNCZQF>\s(hi|hello|hey).*/i, async ({ context, say }) => {
  const greeting = context.matches[0];

  await say(`${greeting}, how are you?`);
});

(async () => {
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();
