const { App, directMention} = require('@slack/bolt')
const { parse } = require('shell-quote')
const { execFile } = require('child_process')

require('dotenv').config()

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
})

async function onlyDirectMessages({ event, next }) {
  if (event.channel_type === "im") {
    await next()
  }
}

async function runCLI(args, callback) {
  const parsedArgs = parse(args)
  const commandArgs = ["run", "--silent", "artsy"].concat(parsedArgs)

  return execFile("yarn", commandArgs, callback)
}

async function processCLICommand({ message, context, say }) {
  const args = context.matches.groups.args

  runCLI(args, async (error, stdout) => {
    let result

    if (error) {
      result = error.toString()
    } else {
      result = stdout
    }

    await say({ text: "```\n" + result.trim() + "\n```", thread_ts: message.thread_ts })
  })
}

async function processGreeting({ context, message, say }) {
  const greeting = context.matches.groups.greeting

  await say({ text: `${greeting}, how are you?`, thread_ts: message.thread_ts })
}

async function processRFCsCommand({ message, say }) {
  runCLI("scheduled:rfcs", async (error, stdout) => {
    if (error) {
      await say({ text: "```\n" + error.toString() + "\n```", thread_ts: message.thread_ts })
    } else {
      json = JSON.parse(stdout)
      json.thread_ts = message.thread_ts
      await say(json)
    }
  })
}

app.message(onlyDirectMessages, /^cli (?<args>\S.*)$/, processCLICommand)
app.message(directMention(), /^<@U\S+> cli (?<args>\S.*)$/, processCLICommand)

app.message(onlyDirectMessages, /^(?<greeting>hi|hello|hey).*/i, processGreeting)
app.message(directMention(), /^<@U\S+> (?<greeting>hi|hello|hey).*/i, processGreeting)

app.message(onlyDirectMessages, /^rfcs$/i, processRFCsCommand)
app.message(directMention(), /^<@U\S+> rfcs$/i, processRFCsCommand)

if (process.env.DEBUG) {
  app.use(args => {
    const copiedArgs = JSON.parse(JSON.stringify(args))
    copiedArgs.context.botToken = 'xoxb-***'
    if (copiedArgs.context.userToken) {
      copiedArgs.context.userToken = 'xoxp-***'
    }
    copiedArgs.client = {}
    copiedArgs.logger = {}
    args.logger.info(
      "Dumping request data for debugging...\n\n" +
      JSON.stringify(copiedArgs, null, 2) +
      "\n"
    )
    args.next()
  });
}

(async () => {
  await app.start(process.env.PORT || 3000)

  console.log('⚡️ Bolt app is running!')
})()