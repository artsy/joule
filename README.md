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

## Adding a new workflow

When adding a new workflow, add a new yml file under `.github/workflows/` containing your workflow definition.

GitHub disables workflows within a repository if there is no activity in the repository for 60 days.
To avoid this happening to your workflow, place it within `wokrflow_files` in the `keepalive` workflow.
