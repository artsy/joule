const { parse } = require("shell-quote");
const { execFile } = require("child_process");

async function runCLI(args, callback) {
  const parsedArgs = parse(args);
  const commandArgs = ["run", "--silent", "artsy"].concat(parsedArgs);

  return execFile("yarn", commandArgs, callback);
}

async function processCLICommand({ message, context, say }) {
  const args = context.matches.groups.args;

  runCLI(args, async (error, stdout) => {
    let result;

    if (error) {
      result = error.toString();
    } else {
      result = stdout;
    }

    await say({ text: "```\n" + result.trim() + "\n```", thread_ts: message.thread_ts });
  });
}

async function processGreeting({ context, message, say }) {
  const greeting = context.matches.groups.greeting;

  await say({ text: `${greeting}, how are you?`, thread_ts: message.thread_ts });
}

async function processRFCsCommand({ message, say }) {
  runCLI("scheduled:rfcs", async (error, stdout) => {
    if (error) {
      await say({ text: "```\n" + error.toString() + "\n```", thread_ts: message.thread_ts });
    } else {
      const json = JSON.parse(stdout);
      json.thread_ts = message.thread_ts;
      await say(json);
    }
  });
}

module.exports = {
  runCLI,
  processCLICommand,
  processGreeting,
  processRFCsCommand,
};
