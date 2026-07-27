jest.mock("child_process");
const { execFile } = require("child_process");
const { runCLI, processCLICommand, processGreeting, processRFCsCommand } = require("../commands");

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

describe("runCLI", () => {
  it("shells out via execFile with the parsed args prefixed by the artsy CLI invocation", async () => {
    execFile.mockImplementation((cmd, args, cb) => cb(null, "output"));
    const callback = jest.fn();

    await runCLI("scheduled:rfcs --foo bar", callback);

    expect(execFile).toHaveBeenCalledWith(
      "yarn",
      ["run", "--silent", "artsy", "scheduled:rfcs", "--foo", "bar"],
      callback
    );
  });
});

describe("processCLICommand", () => {
  beforeEach(() => execFile.mockReset());

  it("replies with the trimmed stdout wrapped in a code block", async () => {
    execFile.mockImplementation((cmd, args, cb) => cb(null, "  hello world  \n"));
    const say = jest.fn().mockResolvedValue();

    await processCLICommand({
      message: { thread_ts: "111.222" },
      context: { matches: { groups: { args: "some command" } } },
      say,
    });
    await flushMicrotasks();

    expect(say).toHaveBeenCalledWith({ text: "```\nhello world\n```", thread_ts: "111.222" });
  });

  it("replies with the stringified error on failure", async () => {
    execFile.mockImplementation((cmd, args, cb) => cb(new Error("boom")));
    const say = jest.fn().mockResolvedValue();

    await processCLICommand({
      message: { thread_ts: "111.222" },
      context: { matches: { groups: { args: "some command" } } },
      say,
    });
    await flushMicrotasks();

    expect(say).toHaveBeenCalledWith({ text: "```\nError: boom\n```", thread_ts: "111.222" });
  });
});

describe("processGreeting", () => {
  it("replies with the greeting", async () => {
    const say = jest.fn().mockResolvedValue();

    await processGreeting({ context: { matches: { groups: { greeting: "hi" } } }, message: { thread_ts: "111.222" }, say });

    expect(say).toHaveBeenCalledWith({ text: "hi, how are you?", thread_ts: "111.222" });
  });
});

describe("processRFCsCommand", () => {
  beforeEach(() => execFile.mockReset());

  it("parses the stdout JSON, attaches thread_ts, and replies with it", async () => {
    execFile.mockImplementation((cmd, args, cb) => cb(null, JSON.stringify({ text: "rfcs" })));
    const say = jest.fn().mockResolvedValue();

    await processRFCsCommand({ message: { thread_ts: "111.222" }, say });
    await flushMicrotasks();

    expect(say).toHaveBeenCalledWith({ text: "rfcs", thread_ts: "111.222" });
  });

  it("replies with the stringified error on failure", async () => {
    execFile.mockImplementation((cmd, args, cb) => cb(new Error("boom")));
    const say = jest.fn().mockResolvedValue();

    await processRFCsCommand({ message: { thread_ts: "111.222" }, say });
    await flushMicrotasks();

    expect(say).toHaveBeenCalledWith({ text: "```\nError: boom\n```", thread_ts: "111.222" });
  });
});
