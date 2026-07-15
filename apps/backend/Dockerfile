FROM node:20

WORKDIR /app

# Build stage: install full deps in /app and run medusa build.
#
# NOTE: there is no package-lock.json in this context (the only lockfile is the monorepo root's,
# and the build context is apps/backend). So this install re-resolves the whole tree to the
# newest versions matching every semver range, on every build — meaning this image can break
# with no change to our code at all.
#
# It already did once: @medusajs/dashboard depends on "@ariakit/react": "^0.4.15", and
# @ariakit/react@0.4.33 shipped an internal import of "@ariakit/react-components/tab/tab" that
# doesn't resolve, so the admin bundle failed to build hours after that version was published.
# Hence the "@ariakit/react" pin in package.json — npm honours `overrides` here because in this
# image apps/backend/package.json IS the install root.
#
# The real fix is to build with the lockfile (see the monorepo root) rather than pin upstream
# packages one at a time as they break.
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

RUN NODE_OPTIONS=--max-old-space-size=3072 npm run build

# Runtime lives in the self-contained build output, which has its OWN package.json.
# Install its dependencies here so migration discovery + module resolution work.
WORKDIR /app/.medusa/server
RUN npm install --no-audit --no-fund

ENV NODE_ENV=production

EXPOSE 9000

# Run DB migrations, then start — both from inside .medusa/server (cwd matters).
# `&&` fails fast if a schema migration errors (never start on a bad schema);
# `exec` hands signals directly to the Medusa server for clean shutdowns.
CMD ["sh", "-c", "npx medusa db:migrate && exec npx medusa start"]
