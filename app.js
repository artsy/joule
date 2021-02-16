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

async function processCLICommand({ context, say }) {
  const args = context.matches.groups.args

  runCLI(args, async (error, stdout) => {
    let result

    if (error) {
      result = error.toString()
    } else {
      result = stdout
    }

    await say("```\n" + result.trim() + "\n```")
  })
}

async function processGreeting({ context, say }) {
  const greeting = context.matches.groups.greeting

  await say(`${greeting}, how are you?`)
}

app.message(onlyDirectMessages, /^cli (?<args>\S.*)$/, processCLICommand)
app.message(directMention(), /^<@U\S+> cli (?<args>\S.*)$/, processCLICommand)

app.message(onlyDirectMessages, /^(?<greeting>hi|hello|hey).*/i, processGreeting)
app.message(directMention(), /^<@U\S+> (?<greeting>hi|hello|hey).*/i, processGreeting)

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