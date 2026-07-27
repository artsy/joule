const {
  ACTION_MARK_SOLVED,
  ACTION_REPORT_BUG,
  INCIDENT_SEVERITY,
  ORDER_MANAGEMENT_AREA,
  INCIDENT_CHANNEL,
  EMERALD_CHANNEL,
  CHANNELS_TO_EXCLUDE,
  CHANNELS_FOR_BUGS_WORKFLOW_REMINDER,
  HOTJAR_RECORDING_CHANNEL,
  MAZE_RESPONSE_CHANNEL,
} = require("./config");
const { generateSlackMessageLink, extractButtonUrl, addCheckmarkReaction, hasCheckmarkReaction } = require("./slack-helpers");

async function processThreadMessagesForGratitude(client, event) {
  if (await hasCheckmarkReaction({ client, channel: event.channel, timestamp: event.thread_ts })) return;

  const text = event.text.toLowerCase();
  if (text === "solved" || text.endsWith(" has been updated to `done`.") || text.endsWith(" has been updated to `closed`.")) {
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

async function processIncidentMessages(client, event) {
  try {
    if (!event?.channel || !event?.text) return;
    if (!CHANNELS_FOR_BUGS_WORKFLOW_REMINDER.includes(event.channel)) return;
    if (!event.text.includes(INCIDENT_SEVERITY)) return;

    const timestampToLink = event.thread_ts || event.ts;
    const messageLink = generateSlackMessageLink(event.channel, timestampToLink);

    await client.chat.postMessage({
      channel: INCIDENT_CHANNEL,
      text: `🚨 Potential incident reported <${messageLink}|here>.`,
      unfurl_media: false
    });
  } catch (error) {
    console.error("Error processing incident message:", error);
  }
}

async function processEmeraldP2Messages(client, event) {
  try {
    if (!event?.channel || !event?.text) return;
    if (!CHANNELS_FOR_BUGS_WORKFLOW_REMINDER.includes(event.channel)) return;
    if (!event.text.includes(ORDER_MANAGEMENT_AREA)) return;

    const timestampToLink = event.thread_ts || event.ts;
    const messageLink = generateSlackMessageLink(event.channel, timestampToLink);

    await client.chat.postMessage({
      channel: EMERALD_CHANNEL,
      text: `💸 Potential Order Support request <${messageLink}|here>.`,
      unfurl_media: false
    });
  } catch (error) {
    console.error("Error processing order support message:", error);
  }
}

async function processHotjarRecordingMessages(client, event) {
  try {
    if (event.channel !== HOTJAR_RECORDING_CHANNEL) return;
    if (!event.text?.trim().startsWith("New recording available")) return;

    const url = extractButtonUrl(event, "Watch Recording");
    if (!url) return;

    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: `URL: ${url}`,
    });
  } catch (error) {
    console.error("[hotjar] Error processing Hotjar recording message:", error);
  }
}

async function processMazeResponseMessages(client, event) {
  try {
    if (event.channel !== MAZE_RESPONSE_CHANNEL) return;
    if (!event.text?.includes("new response")) return;

    const url = extractButtonUrl(event, "View results dashboard");
    if (!url) return;

    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: `URL: ${url}`,
    });
  } catch (error) {
    console.error("[maze] Error processing Maze response message:", error);
  }
}

function buildProcessors({ client, message, event }) {
  return [
    {
      name: "threadStateProcessor",
      run: () => (message.thread_ts == null
        ? processTopMessagesForBugWorkflowReminder(client, event)
        : processThreadMessagesForGratitude(client, event)),
    },
    { name: "processIncidentMessages", run: () => processIncidentMessages(client, event) },
    { name: "processEmeraldP2Messages", run: () => processEmeraldP2Messages(client, event) },
    { name: "processHotjarRecordingMessages", run: () => processHotjarRecordingMessages(client, event) },
    { name: "processMazeResponseMessages", run: () => processMazeResponseMessages(client, event) },
  ];
}

async function dispatchMessageProcessors({ client, message, event }) {
  if (CHANNELS_TO_EXCLUDE.includes(event.channel)) return;

  const processors = buildProcessors({ client, message, event });
  const results = await Promise.allSettled(processors.map((p) => p.run()));

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[dispatchMessageProcessors] ${processors[i].name} failed (channel=${event.channel}, ts=${event.ts}):`,
        result.reason
      );
    }
  });
}

module.exports = {
  processThreadMessagesForGratitude,
  processTopMessagesForBugWorkflowReminder,
  processIncidentMessages,
  processEmeraldP2Messages,
  processHotjarRecordingMessages,
  processMazeResponseMessages,
  buildProcessors,
  dispatchMessageProcessors,
};
