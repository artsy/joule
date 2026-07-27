const {
  processThreadMessagesForGratitude,
  processTopMessagesForBugWorkflowReminder,
  processIncidentMessages,
  processEmeraldP2Messages,
  processHotjarRecordingMessages,
  processMazeResponseMessages,
  dispatchMessageProcessors,
} = require("../message-processors");
const { CHANNELS_FOR_BUGS_WORKFLOW_REMINDER, HOTJAR_RECORDING_CHANNEL, MAZE_RESPONSE_CHANNEL } = require("../config");

const BUGS_CHANNEL = CHANNELS_FOR_BUGS_WORKFLOW_REMINDER[0];

function makeClient() {
  return {
    reactions: { add: jest.fn().mockResolvedValue({}), get: jest.fn().mockResolvedValue({ message: { reactions: [] } }) },
    chat: { postMessage: jest.fn().mockResolvedValue({}), postEphemeral: jest.fn().mockResolvedValue({}) },
  };
}

describe("processThreadMessagesForGratitude", () => {
  it("does nothing if the thread already has a checkmark reaction", async () => {
    const client = makeClient();
    client.reactions.get.mockResolvedValue({ message: { reactions: [{ name: "white_check_mark" }] } });

    await processThreadMessagesForGratitude(client, { channel: "C1", thread_ts: "1.1", text: "solved" });

    expect(client.reactions.add).not.toHaveBeenCalled();
    expect(client.chat.postEphemeral).not.toHaveBeenCalled();
  });

  it("adds the checkmark reaction when the message says solved", async () => {
    const client = makeClient();

    await processThreadMessagesForGratitude(client, { channel: "C1", thread_ts: "1.1", text: "solved" });

    expect(client.reactions.add).toHaveBeenCalledWith({ name: "white_check_mark", channel: "C1", timestamp: "1.1" });
  });

  it("adds the checkmark reaction when a linked issue was closed/done", async () => {
    const client = makeClient();

    await processThreadMessagesForGratitude(client, {
      channel: "C1",
      thread_ts: "1.1",
      text: "JIRA-123 has been updated to `done`.",
    });

    expect(client.reactions.add).toHaveBeenCalled();
  });

  it("posts the solved reminder when the message thanks without solving", async () => {
    const client = makeClient();

    await processThreadMessagesForGratitude(client, { channel: "C1", thread_ts: "1.1", user: "U1", text: "thank you!" });

    expect(client.reactions.add).not.toHaveBeenCalled();
    expect(client.chat.postEphemeral).toHaveBeenCalledTimes(1);
    expect(client.chat.postEphemeral.mock.calls[0][0]).toMatchObject({ channel: "C1", user: "U1", thread_ts: "1.1" });
  });

  it("does nothing for unrelated text", async () => {
    const client = makeClient();

    await processThreadMessagesForGratitude(client, { channel: "C1", thread_ts: "1.1", text: "what time is standup?" });

    expect(client.reactions.add).not.toHaveBeenCalled();
    expect(client.chat.postEphemeral).not.toHaveBeenCalled();
  });
});

describe("processTopMessagesForBugWorkflowReminder", () => {
  it("ignores channels outside the configured list", async () => {
    const client = makeClient();

    await processTopMessagesForBugWorkflowReminder(client, { channel: "C-other", text: "I found a bug" });

    expect(client.chat.postEphemeral).not.toHaveBeenCalled();
  });

  it("posts the reminder when issue words are present", async () => {
    const client = makeClient();

    await processTopMessagesForBugWorkflowReminder(client, { channel: BUGS_CHANNEL, user: "U1", text: "I found a bug" });

    expect(client.chat.postEphemeral).toHaveBeenCalledTimes(1);
  });

  it("skips when the ignore word 'feedback' is present", async () => {
    const client = makeClient();

    await processTopMessagesForBugWorkflowReminder(client, {
      channel: BUGS_CHANNEL,
      user: "U1",
      text: "I have some feedback about a bug",
    });

    expect(client.chat.postEphemeral).not.toHaveBeenCalled();
  });
});

describe("processIncidentMessages", () => {
  it("posts to the incident channel when severity text matches in a configured channel", async () => {
    const client = makeClient();

    await processIncidentMessages(client, { channel: BUGS_CHANNEL, text: "This is a P1 - Critical issue", ts: "1.1" });

    expect(client.chat.postMessage).toHaveBeenCalledTimes(1);
    expect(client.chat.postMessage.mock.calls[0][0]).toMatchObject({ channel: "C9RK0BLEP" });
  });

  it("does nothing outside the configured channels", async () => {
    const client = makeClient();

    await processIncidentMessages(client, { channel: "C-other", text: "P1 - Critical", ts: "1.1" });

    expect(client.chat.postMessage).not.toHaveBeenCalled();
  });

  it("does nothing without the severity text", async () => {
    const client = makeClient();

    await processIncidentMessages(client, { channel: BUGS_CHANNEL, text: "just a normal message", ts: "1.1" });

    expect(client.chat.postMessage).not.toHaveBeenCalled();
  });
});

describe("processEmeraldP2Messages", () => {
  it("posts to the emerald channel when the order management area is mentioned", async () => {
    const client = makeClient();

    await processEmeraldP2Messages(client, { channel: BUGS_CHANNEL, text: "Order Management needs help", ts: "1.1" });

    expect(client.chat.postMessage).toHaveBeenCalledTimes(1);
    expect(client.chat.postMessage.mock.calls[0][0]).toMatchObject({ channel: "C02JHHHKP5K" });
  });

  it("does nothing without the area text", async () => {
    const client = makeClient();

    await processEmeraldP2Messages(client, { channel: BUGS_CHANNEL, text: "unrelated", ts: "1.1" });

    expect(client.chat.postMessage).not.toHaveBeenCalled();
  });
});

describe("processHotjarRecordingMessages", () => {
  const buttonEvent = (label, url) => ({
    channel: HOTJAR_RECORDING_CHANNEL,
    ts: "1.1",
    text: "New recording available for your review",
    blocks: [{ type: "actions", elements: [{ text: { text: label }, url }] }],
  });

  it("posts the recording URL when the button is present", async () => {
    const client = makeClient();

    await processHotjarRecordingMessages(client, buttonEvent("Watch Recording", "https://hotjar.example/rec"));

    expect(client.chat.postMessage).toHaveBeenCalledWith({
      channel: HOTJAR_RECORDING_CHANNEL,
      thread_ts: "1.1",
      text: "URL: https://hotjar.example/rec",
    });
  });

  it("does nothing outside the hotjar channel", async () => {
    const client = makeClient();

    await processHotjarRecordingMessages(client, { ...buttonEvent("Watch Recording", "https://hotjar.example/rec"), channel: "C-other" });

    expect(client.chat.postMessage).not.toHaveBeenCalled();
  });

  it("does nothing without the expected button", async () => {
    const client = makeClient();

    await processHotjarRecordingMessages(client, { ...buttonEvent("Other Button", "https://hotjar.example/rec") });

    expect(client.chat.postMessage).not.toHaveBeenCalled();
  });
});

describe("processMazeResponseMessages", () => {
  const buttonEvent = (label, url) => ({
    channel: MAZE_RESPONSE_CHANNEL,
    ts: "1.1",
    text: "You have a new response:",
    blocks: [{ type: "actions", elements: [{ text: { text: label }, url }] }],
  });

  it("posts the results dashboard URL when the button is present", async () => {
    const client = makeClient();

    await processMazeResponseMessages(client, buttonEvent("View results dashboard", "https://maze.example/results"));

    expect(client.chat.postMessage).toHaveBeenCalledWith({
      channel: MAZE_RESPONSE_CHANNEL,
      thread_ts: "1.1",
      text: "URL: https://maze.example/results",
    });
  });

  it("does nothing outside the maze channel", async () => {
    const client = makeClient();

    await processMazeResponseMessages(client, { ...buttonEvent("View results dashboard", "https://maze.example/results"), channel: "C-other" });

    expect(client.chat.postMessage).not.toHaveBeenCalled();
  });
});

describe("dispatchMessageProcessors", () => {
  it("does nothing for excluded channels", async () => {
    const client = makeClient();

    await dispatchMessageProcessors({
      client,
      message: { thread_ts: null },
      event: { channel: "C-other", text: "P1 - Critical", ts: "1.1" },
    });
    // sanity check that this channel isn't accidentally in the excluded list already
    expect(client.chat.postMessage).not.toHaveBeenCalled();
  });

  it("only runs the top-level bug reminder path when there is no thread_ts, not the gratitude path", async () => {
    const client = makeClient();

    await dispatchMessageProcessors({
      client,
      message: { thread_ts: null },
      event: { channel: BUGS_CHANNEL, user: "U1", text: "I found a bug, thanks", ts: "1.1" },
    });

    expect(client.chat.postEphemeral).toHaveBeenCalledTimes(1);
    expect(client.reactions.add).not.toHaveBeenCalled();
  });

  it("only runs the gratitude path when thread_ts is set, not the bug reminder path", async () => {
    const client = makeClient();

    await dispatchMessageProcessors({
      client,
      message: { thread_ts: "1.1" },
      event: { channel: BUGS_CHANNEL, user: "U1", thread_ts: "1.1", text: "solved", ts: "1.2" },
    });

    expect(client.reactions.add).toHaveBeenCalledTimes(1);
    expect(client.chat.postEphemeral).not.toHaveBeenCalled();
  });

  it("does not let one rejected processor block the others, and logs which one failed", async () => {
    const client = makeClient();
    client.chat.postEphemeral.mockRejectedValue(new Error("slack is down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await dispatchMessageProcessors({
      client,
      message: { thread_ts: "1.1" },
      event: {
        channel: BUGS_CHANNEL,
        user: "U1",
        thread_ts: "1.1",
        ts: "1.2",
        text: "thanks, also this is a P1 - Critical issue",
      },
    });

    expect(client.chat.postMessage).toHaveBeenCalledTimes(1);
    expect(client.chat.postMessage.mock.calls[0][0]).toMatchObject({ channel: "C9RK0BLEP" });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("threadStateProcessor"),
      expect.any(Error)
    );
    expect(console.error.mock.calls[0][0]).toContain(BUGS_CHANNEL);
    expect(console.error.mock.calls[0][0]).toContain("1.2");

    console.error.mockRestore();
  });
});
