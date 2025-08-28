FROM node:22-alpine

WORKDIR /app

# Install system dependencies
# Add deploy user
RUN apk --no-cache --quiet add \
  dumb-init && \
  adduser -D -g '' deploy

# Copy files required for installation of application dependencies
COPY package.json yarn.lock ./

# Install application dependencies
RUN yarn install --frozen-lockfile && yarn cache clean

# Copy application code
COPY . ./

# Update file/directory permissions
RUN chown -R deploy:deploy ./

# Switch to less-privileged user
USER deploy

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["yarn", "start"]
