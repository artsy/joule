FROM node:22-alpine

WORKDIR /app

# Install system dependencies
# Add deploy user
RUN apk --no-cache --quiet add \
  dumb-init && \
  adduser -D -g '' deploy

# Enable Corepack for Yarn v4
RUN corepack enable

# Copy files required for installation of application dependencies
COPY package.json yarn.lock ./

# Install application dependencies
RUN yarn install --immutable

# Copy application code
COPY . ./

# Update file/directory permissions
RUN chown -R deploy:deploy ./

# Switch to less-privileged user
USER deploy

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["yarn", "start"]
