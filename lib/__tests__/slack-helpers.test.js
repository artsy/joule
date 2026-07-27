const {
  generateSlackMessageLink,
  extractButtonUrl,
  addCheckmarkReaction,
  hasCheckmarkReaction,
} = require("../slack-helpers");

describe("generateSlackMessageLink", () => {
  it("strips the dot from the timestamp and builds the archive link", () => {
    expect(generateSlackMessageLink("C123", "1234567890.123456")).toBe(
      "https://artsy.slack.com/archives/C123/p1234567890123456"
    );
  });
});

describe("extractButtonUrl", () => {
  it("finds a button inside an actions block", () => {
    const event = {
      blocks: [
        {
          type: "actions",
          elements: [{ text: { text: "Watch Recording" }, url: "https://example.com/recording" }],
        },
      ],
    };

    expect(extractButtonUrl(event, "Watch Recording")).toBe("https://example.com/recording");
  });

  it("finds a button inside a section block's accessory", () => {
    const event = {
      blocks: [
        {
          type: "section",
          accessory: { type: "button", text: { text: "View results dashboard" }, url: "https://example.com/dashboard" },
        },
      ],
    };

    expect(extractButtonUrl(event, "View results dashboard")).toBe("https://example.com/dashboard");
  });

  it("returns undefined when no button matches the label", () => {
    const event = { blocks: [{ type: "actions", elements: [{ text: { text: "Other" }, url: "https://example.com" }] }] };

    expect(extractButtonUrl(event, "Watch Recording")).toBeUndefined();
  });

  it("returns undefined when there are no blocks", () => {
    expect(extractButtonUrl({}, "Watch Recording")).toBeUndefined();
  });
});

describe("addCheckmarkReaction", () => {
  it("calls client.reactions.add with the emoji, channel, and timestamp", async () => {
    const client = { reactions: { add: jest.fn().mockResolvedValue({}) } };

    await addCheckmarkReaction({ client, channel: "C123", timestamp: "111.222" });

    expect(client.reactions.add).toHaveBeenCalledWith({
      name: "white_check_mark",
      channel: "C123",
      timestamp: "111.222",
    });
  });

  it("swallows errors from the client", async () => {
    const client = { reactions: { add: jest.fn().mockRejectedValue(new Error("boom")) } };
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(addCheckmarkReaction({ client, channel: "C123", timestamp: "111.222" })).resolves.toBeUndefined();

    console.error.mockRestore();
  });
});

describe("hasCheckmarkReaction", () => {
  it("returns true when the checkmark reaction is present", async () => {
    const client = {
      reactions: {
        get: jest.fn().mockResolvedValue({ message: { reactions: [{ name: "white_check_mark" }] } }),
      },
    };

    await expect(hasCheckmarkReaction({ client, channel: "C123", timestamp: "111.222" })).resolves.toBe(true);
  });

  it("returns false when the checkmark reaction is absent", async () => {
    const client = {
      reactions: { get: jest.fn().mockResolvedValue({ message: { reactions: [{ name: "eyes" }] } }) },
    };

    await expect(hasCheckmarkReaction({ client, channel: "C123", timestamp: "111.222" })).resolves.toBe(false);
  });

  it("returns false when the client call rejects", async () => {
    const client = { reactions: { get: jest.fn().mockRejectedValue(new Error("boom")) } };
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(hasCheckmarkReaction({ client, channel: "C123", timestamp: "111.222" })).resolves.toBe(false);

    console.error.mockRestore();
  });
});
