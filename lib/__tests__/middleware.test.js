const { onlyDirectMessages, debugDumpMiddleware } = require("../middleware");

describe("onlyDirectMessages", () => {
  it("calls next when the channel_type is im", async () => {
    const next = jest.fn().mockResolvedValue();

    await onlyDirectMessages({ event: { channel_type: "im" }, next });

    expect(next).toHaveBeenCalled();
  });

  it("does not call next for other channel types", async () => {
    const next = jest.fn().mockResolvedValue();

    await onlyDirectMessages({ event: { channel_type: "channel" }, next });

    expect(next).not.toHaveBeenCalled();
  });
});

describe("debugDumpMiddleware", () => {
  it("redacts tokens, blanks client/logger in the dump, and calls next", () => {
    const info = jest.fn();
    const next = jest.fn();
    const args = {
      context: { botToken: "xoxb-real-token", userToken: "xoxp-real-token" },
      client: { real: "client" },
      logger: { info, real: "logger" },
      next,
    };

    debugDumpMiddleware(args);

    expect(info).toHaveBeenCalledTimes(1);
    const dumped = info.mock.calls[0][0];
    expect(dumped).toContain("xoxb-***");
    expect(dumped).toContain("xoxp-***");
    expect(dumped).not.toContain("xoxb-real-token");
    expect(dumped).not.toContain("xoxp-real-token");
    expect(dumped).toContain('"client": {}');
    expect(dumped).toContain('"logger": {}');
    expect(next).toHaveBeenCalled();
  });

  it("does not blow up when there is no userToken", () => {
    const info = jest.fn();
    const next = jest.fn();
    const args = { context: { botToken: "xoxb-real-token" }, client: {}, logger: { info }, next };

    expect(() => debugDumpMiddleware(args)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});
