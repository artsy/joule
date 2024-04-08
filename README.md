# joule

Helpful artsy engineering bot to send scheduled Slack messages.

Commands are added to [artsy/cli](https://github.com/artsy/cli) then called and scheduled under `.github/workflows`.

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
