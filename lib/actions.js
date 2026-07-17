const { addCheckmarkReaction } = require("./slack-helpers");

async function handleMarkSolved({ ack, respond, client, body }) {
  await ack();

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
}

async function handleReportBug({ ack }) {
  await ack();
  // URL action, no action needed.
}

module.exports = {
  handleMarkSolved,
  handleReportBug,
};
