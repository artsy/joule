jest.mock("@slack/bolt", () => {
  const message = jest.fn();
  const action = jest.fn();
  const use = jest.fn();
  const start = jest.fn().mockResolvedValue(undefined);
  const App = jest.fn().mockImplementation(() => ({ message, action, use, start }));
  const ExpressReceiver = jest.fn().mockImplementation(() => ({}));
  const directMention = jest.fn(() => "directMention-matcher");

  return { App, ExpressReceiver, directMention };
});

describe("app.js", () => {
  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = "xoxb-dummy";
    process.env.SLACK_SIGNING_SECRET = "dummy-signing-secret";
    delete process.env.DEBUG;
  });

  function loadApp() {
    jest.resetModules();
    require("../app");
    return require("@slack/bolt");
  }

  it("constructs the App with the bot token, registers every route without starting a server", () => {
    const bolt = loadApp();
    const instance = bolt.App.mock.results[0].value;

    expect(bolt.App).toHaveBeenCalledWith(expect.objectContaining({ token: "xoxb-dummy" }));
    // 3 command pairs (cli, greeting, rfcs) x2 for DM + mention, plus the catch-all processor dispatch handler
    expect(instance.message).toHaveBeenCalledTimes(7);
    expect(instance.action).toHaveBeenCalledTimes(2);
    expect(instance.use).not.toHaveBeenCalled();
    // requiring the module must never start the server on its own (require.main !== module under Jest)
    expect(instance.start).not.toHaveBeenCalled();
  });

  it("registers the DEBUG dump middleware only when DEBUG is set", () => {
    process.env.DEBUG = "1";

    const bolt = loadApp();
    const instance = bolt.App.mock.results[0].value;

    expect(instance.use).toHaveBeenCalledTimes(1);
  });
});
