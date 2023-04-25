#!/bin/bash

# Exit if any subcommand fails
set -e

# This assumes you have general prerequisites installed as by:
# https://github.com/artsy/potential/blob/master/scripts/setup
#
# Run like:
#   ./scripts/setup.sh
#

if [[ ! -z $NVM_DIR ]]; then # skip if nvm is not available
  echo "Installing Node..."
  source ~/.nvm/nvm.sh
  nvm install
fi

echo "Installing dependencies..."
yarn install || (npm install --global yarn@latest && yarn install)

echo 'Updating .env file (for shared configuration)...'
aws s3 cp s3://artsy-citadel/dev/.env.joule .env || 'Unable to download shared configuration, ensure you have S3 access!'

echo 'Setup complete! To start the server, run:
  yarn start'
