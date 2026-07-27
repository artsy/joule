const { SOLVED_EMOJI } = require("./config");

function generateSlackMessageLink(channel, timestamp) {
  const baseTs = timestamp.replace(".", "");
  return `https://artsy.slack.com/archives/${channel}/p${baseTs}`;
}

function extractButtonUrl(event, label) {
  const buttons = event.blocks?.flatMap((block) => {
    if (block.type === "actions") return block.elements || [];
    if (block.accessory?.type === "button") return [block.accessory];
    return [];
  });
  const button = buttons?.find((el) => el.text?.text?.includes(label));
  return button?.url;
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

module.exports = {
  generateSlackMessageLink,
  extractButtonUrl,
  addCheckmarkReaction,
  hasCheckmarkReaction,
};
