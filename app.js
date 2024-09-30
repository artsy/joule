const { App, ExpressReceiver, directMention } = require('@slack/bolt')
const { parse } = require('shell-quote')
const { execFile } = require('child_process')
require('dotenv').config()

const ACTION_MARK_SOLVED = "solved";
const ACTION_REPORT_BUG = "report_bug";
const SOLVED_EMOJI = "white_check_mark";
const CHANNELS_TO_EXCLUDE = [
  // 'C012K7XU4LE', // #bot-testing
];
const CHANNELS_FOR_BUGS_WORKFLOW_REMINDER = [
  "C02E1D1G3B3", // #chr-test 
  "C03N12SR0RK", // #product-questions
  "C07PRTJSD6G", // #product-bugs
];

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

async function addCheckmarkReaction({ client, channel, timestamp }) {
  try {
    await client.reactions.add({ name: SOLVED_EMOJI, channel, timestamp });
  } catch (error) {
    console.error(error);
  }
}

async function hasCheckmarkReaction({ client, channel, timestamp }) {
  try {
    const response = await client.reactions.get({ channel, timestamp });
    return response.message.reactions?.some((reaction) => reaction.name === SOLVED_EMOJI) || false;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function processThreadMessagesForGratitude(client, event) {
  if (event.user !== event.parent_user_id) return;
  if (await hasCheckmarkReaction({ client, channel: event.channel, timestamp: event.thread_ts })) return;

  const text = event.text.toLowerCase();
  if (text === "solved") {
    await addCheckmarkReaction({ client, channel: event.channel, timestamp: event.thread_ts });
  } else if (/thank|^ty|solved/.test(text)) {
    const reminderMessage = "Mark this thread as solved by clicking the button or replying `solved`.";

    await client.chat.postEphemeral({
      channel: event.channel,
      user: event.user,
      text: reminderMessage,
      thread_ts: event.thread_ts,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: reminderMessage,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "✅  Mark as Solved",
              },
              style: "primary",
              action_id: ACTION_MARK_SOLVED,
            },
          ],
        },
      ],
    });
  }
}

async function processTopMessagesForBugWorkflowReminder(client, event) {
  if (!CHANNELS_FOR_BUGS_WORKFLOW_REMINDER.includes(event.channel)) return;

  const issueWordsRegex = /(bug|issue|error|reproduce|complain|replicate|wrong)/i;
  const ignoreWordsRegex = /feedback/i;
  const reminderMessage = `Oops! 🐞\nIt seems you found a bug, <@${event.user}>. Please use the 'Report a Bug' workflow. Thanks! 🙌`;

  if (issueWordsRegex.test(event.text) && !ignoreWordsRegex.test(event.text)) {
    try {
      await client.chat.postEphemeral({
        channel: event.channel,
        user: event.user,
        text: reminderMessage,
        thread_ts: event.thread_ts,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: reminderMessage,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "▶️  Report Bug",
                },
                style: "primary",
                url: "https://slack.com/shortcuts/Ft074LRBHCE6/8e9a1ef94c02a74bbb6e2aee43b22d87",
                action_id: ACTION_REPORT_BUG
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error(error);
    }
  }
}

app.message(onlyDirectMessages, /^cli (?<args>\S.*)$/, processCLICommand)
app.message(directMention(), /^<@U\S+> cli (?<args>\S.*)$/, processCLICommand)

app.message(onlyDirectMessages, /^(?<greeting>hi|hello|hey).*/i, processGreeting)
app.message(directMention(), /^<@U\S+> (?<greeting>hi|hello|hey).*/i, processGreeting)

app.message(onlyDirectMessages, /^rfcs$/i, processRFCsCommand)
app.message(directMention(), /^<@U\S+> rfcs$/i, processRFCsCommand)

app.message(async ({ client, message, event }) => {
  if (CHANNELS_TO_EXCLUDE.includes(event.channel)) return;

  if (message.thread_ts == null) {
    await processTopMessagesForBugWorkflowReminder(client, event);
  } else {
    await processThreadMessagesForGratitude(client, event);
  }
});

app.action(ACTION_MARK_SOLVED, async ({ action, ack, respond, client, body }) => {
  await ack();
  const { channel, container } = action;

  try {
    const channel = body.container.channel_id;
    const ts = body.container.thread_ts || body.container.message_ts;

    if (!channel) throw new Error("Channel is undefined");
    if (!ts) throw new Error("Timestamp is undefined");

    await addCheckmarkReaction({ client, channel: body.channel.id, timestamp: ts });
    await respond({ delete_original: true });

  } catch (error) {
    console.error("Error adding checkmark reaction:", error);
  }
});

app.action(ACTION_REPORT_BUG, async ({ ack }) => {
  await ack();
  // URL action, no action needed. 
});

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
