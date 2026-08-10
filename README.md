# joule

Helpful artsy engineering bot to send scheduled Slack messages.

Commands are added to [artsy/cli/src/commands/scheduled](https://github.com/artsy/cli/tree/main/src/commands/scheduled) then called and scheduled under [.github/workflows](.github/workflows).

## Setup

Clone the repo:

```sh
git clone git@github.com:artsy/joule.git
cd joule
```

Install dependencies and setup config values:

```
./scripts/setup.sh
```

## Running

Start bolt server
`yarn start`

Start ngrok (development proxy)
`yarn ngrok`

## Resources

- [Developing Slack apps locally](https://slack.dev/node-slack-sdk/tutorials/local-development)

> Note: To develop locally, request to be added as a collaborator.

## Migrating from Yarn 1 to Yarn 4

This repo moved from Yarn 1 (Classic) to Yarn 4 (Berry). The pinned version lives in `package.json`'s `packageManager` field and in `.yarnrc.yml`'s `yarnPath`, and the matching binary is vendored at `.yarn/releases/`.

If your local `yarn` is still Yarn 1, do this once:

```sh
corepack enable
yarn install
```

`corepack enable` makes the global `yarn` command read `packageManager` and hand off to the pinned version, so you don't need to install Yarn 4 yourself. `./scripts/setup.sh` already does this for you.

If `yarn --version` still shows `1.x` after that, corepack itself may be disabled system-wide (common on newer Node versions) — run `npm install --global corepack` first, then repeat the steps above.

## Adding a new workflow

When adding a new workflow, add a new yml file under `.github/workflows/` containing your workflow definition.

GitHub disables workflows within a repository if there is no activity in the repository for 60 days.
To avoid this happening to your workflow, place it within `workflow_files` in the `keepalive` workflow.
