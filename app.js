const { App, ExpressReceiver, directMention } = require('@slack/bolt')
require('dotenv').config()

const { ACTION_MARK_SOLVED, ACTION_REPORT_BUG } = require('./lib/config')
const { onlyDirectMessages, debugDumpMiddleware } = require('./lib/middleware')
const { processCLICommand, processGreeting, processRFCsCommand } = require('./lib/commands')
const { dispatchMessageProcessors } = require('./lib/message-processors')
const { handleMarkSolved, handleReportBug } = require('./lib/actions')

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: {
    events: '/slack/events',
    actions: '/slack/actions'
  }
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
})

app.message(onlyDirectMessages, /^cli (?<args>\S.*)$/, processCLICommand)
app.message(directMention(), /^<@U\S+> cli (?<args>\S.*)$/, processCLICommand)

app.message(onlyDirectMessages, /^(?<greeting>hi|hello|hey).*/i, processGreeting)
app.message(directMention(), /^<@U\S+> (?<greeting>hi|hello|hey).*/i, processGreeting)

app.message(onlyDirectMessages, /^rfcs$/i, processRFCsCommand)
app.message(directMention(), /^<@U\S+> rfcs$/i, processRFCsCommand)

app.message(async ({ client, message, event }) => {
  await dispatchMessageProcessors({ client, message, event });
});

app.action(ACTION_MARK_SOLVED, handleMarkSolved);
app.action(ACTION_REPORT_BUG, handleReportBug);

if (process.env.DEBUG) {
  app.use(debugDumpMiddleware);
}

if (require.main === module) {
  (async () => {
    await app.start(process.env.PORT || 3000)

    console.log('⚡️ Bolt app is running!')
  })()
}
