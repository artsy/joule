const { handleMarkSolved, handleReportBug } = require("../actions");

function makeArgs(overrides = {}) {
  return {
    ack: jest.fn().mockResolvedValue(),
    respond: jest.fn().mockResolvedValue(),
    client: { reactions: { add: jest.fn().mockResolvedValue({}) } },
    body: { channel: { id: "C-actual" }, container: { channel_id: "C-container", thread_ts: "1.1" } },
    ...overrides,
  };
}

describe("handleMarkSolved", () => {
  it("acks, adds the checkmark reaction using body.channel.id, and deletes the original message", async () => {
    const args = makeArgs();

    await handleMarkSolved(args);

    expect(args.ack).toHaveBeenCalled();
    expect(args.client.reactions.add).toHaveBeenCalledWith({
      name: "white_check_mark",
      channel: "C-actual",
      timestamp: "1.1",
    });
    expect(args.respond).toHaveBeenCalledWith({ delete_original: true });
  });

  it("falls back to message_ts when thread_ts is absent", async () => {
    const args = makeArgs({ body: { channel: { id: "C-actual" }, container: { channel_id: "C-container", message_ts: "2.2" } } });

    await handleMarkSolved(args);

    expect(args.client.reactions.add).toHaveBeenCalledWith(expect.objectContaining({ timestamp: "2.2" }));
  });

  it("logs and does not respond when channel_id is missing", async () => {
    const args = makeArgs({ body: { channel: { id: "C-actual" }, container: { thread_ts: "1.1" } } });
    jest.spyOn(console, "error").mockImplementation(() => {});

    await handleMarkSolved(args);

    expect(args.respond).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();

    console.error.mockRestore();
  });

  it("logs and does not respond when timestamp is missing", async () => {
    const args = makeArgs({ body: { channel: { id: "C-actual" }, container: { channel_id: "C-container" } } });
    jest.spyOn(console, "error").mockImplementation(() => {});

    await handleMarkSolved(args);

    expect(args.respond).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();

    console.error.mockRestore();
  });
});

describe("handleReportBug", () => {
  it("only acks, no client interaction", async () => {
    const ack = jest.fn().mockResolvedValue();

    await handleReportBug({ ack });

    expect(ack).toHaveBeenCalled();
  });
});
