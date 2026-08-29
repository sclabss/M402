# Multi-stage build for @m402/api inside a pnpm workspace. Only apps/api and
# its one workspace dependency (packages/shared-types) get built/shipped --
# apps/web and the agents/ Python-adjacent... actually TypeScript, per
# session 2's correction... projects are irrelevant to this image.
#
# NOTE: not validated with a real `docker build` -- this sandbox has no
# Docker (and no network path to an image registry to pull node:20-slim
# even if it did). Written against a well-established, standard pattern
# (pnpm's own documented monorepo Docker approach), but that's a different
# confidence level than the typecheck/build validation the rest of this
# project got. Worth running `docker build .` for real before relying on it.

FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

# --- deps: install only what apps/api needs, leveraging Docker layer cache ---
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @m402/api...

# --- build: compile TypeScript to dist/ ---
FROM deps AS build
COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN pnpm --filter @m402/api build

# --- runtime: slim image, prod deps only ---
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --prod --frozen-lockfile --filter @m402/api...
COPY --from=build /repo/apps/api/dist apps/api/dist

# Fix: Copy from the build stage instead of the host context
COPY --from=build /repo/packages/shared-types packages/shared-types

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
