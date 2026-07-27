async function onlyDirectMessages({ event, next }) {
  if (event.channel_type === "im") {
    await next();
  }
}

function debugDumpMiddleware(args) {
  const copiedArgs = JSON.parse(JSON.stringify(args));
  copiedArgs.context.botToken = "xoxb-***";
  if (copiedArgs.context.userToken) {
    copiedArgs.context.userToken = "xoxp-***";
  }
  copiedArgs.client = {};
  copiedArgs.logger = {};
  args.logger.info(
    "Dumping request data for debugging...\n\n" +
    JSON.stringify(copiedArgs, null, 2) +
    "\n"
  );
  args.next();
}

module.exports = {
  onlyDirectMessages,
  debugDumpMiddleware,
};
