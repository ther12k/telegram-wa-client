FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile || bun install
RUN bun run build

FROM oven/bun:1.3.14 AS runtime
WORKDIR /app
ENV APP_ENV=production
ENV PORT=3001
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages/contracts ./packages/contracts
USER bun
EXPOSE 3001
CMD ["bun", "--cwd", "apps/server", "run", "start"]
