---
name: itsaplan-upgrade-deploy
description: Integrate upstream ItsAPLAN changes into the Avant Aegis fork, publish custom images, deploy staging, and verify service health. Use for version upgrades, staging releases, migration conflicts, or targeted staging repairs. Production deployment requires a separate explicit request.
---

# ItsAPLAN upgrade and staging deployment

Work from the authoritative Windows checkout containing this skill. Read the repository `AGENTS.md` and any more specific instructions before changing files.

## Boundaries

- Treat `upstream/main`, GitHub releases, and the fork's branches as distinct version signals. Fetch before reporting their current state.
- Local integration and explicitly requested staging work are in scope. Do not change production without a separate explicit request.
- Preserve persistent PostgreSQL and MinIO data. Never use `docker compose down -v` for deployment or rollback.
- Do not expose `.env` values, credentials, registry tokens, or private keys in output.
- Prefer the GitHub connector for repository, workflow, and CI inspection. Use the local checkout for merges, conflict resolution, and validation.

## Establish live state

Before choosing an upgrade path:

1. Confirm the checkout path, current branch, worktree status, remotes, and tracking branch.
2. Fetch `origin` and `upstream` without discarding local work.
3. Read the version from `upstream/main:package.json`, then inspect upstream tags/releases separately.
4. Compare the intended Avant branch against `upstream/main` with left/right commit counts and a file-level diff summary.
5. Inspect current GitHub Actions status and the deployed staging version. Historical results are context, not proof of current state.

Stop before merging if the worktree contains overlapping user changes or an unfinished operation that cannot be safely preserved.

## Integrate the upgrade

- Use a dedicated `upgrade/itsaplan-<version>` branch based on the intended Avant staging lineage. Reuse an existing branch when continuing that upgrade.
- Preserve Avant Aegis custom behavior while accepting compatible upstream changes. Resolve each conflict by understanding both sides; never apply `--ours` or `--theirs` across all conflicts.
- Keep pinned infrastructure image versions when upstream changes them to floating tags unless the user explicitly approves that operational change.
- For Drizzle migration-number collisions, retain upstream migrations and renumber the custom migration to the next free sequence. Update the SQL filename, snapshot filename and identifiers, `_journal.json` entry, ordering, and previous-snapshot lineage together.
- Keep deployment-related changes consistent across the applicable Compose variants unless the difference is intentional.
- Do not modify unrelated production configuration while preparing staging.

## Validate before publishing

Run the narrow checks first, then broader gates supported by the environment:

1. Confirm no conflict markers or unresolved Git entries remain.
2. Parse changed JSON files and inspect migration journal/snapshot lineage.
3. Run `bun run format:check`, `bun run lint`, and `bun run typecheck` as applicable.
4. Validate Compose with `PROXY_NETWORK=avant-proxy-net` or the live staging proxy-network value.
5. Run relevant tests or builds when available.
6. Before pushing changed code, apply the repository's `tidy` skill and then its `code-review` skill.

Classify permission, Buildx-lock, or process-spawn failures as environment failures only when the evidence supports that conclusion. Do not report the code as validated by a gate that did not complete.

## Publish and deploy staging

- Push only when the user has requested it.
- Use `.github/workflows/publish-custom-images.yml` for the Avant images. Confirm the required service jobs succeed and the expected `staging` tags are published.
- Deploy only the services whose images or runtime configuration changed. A web-only repair should recreate only the web service unless dependencies require more.
- Preserve the staging database, object storage, volumes, domains, secrets, and external proxy network.
- Use Portainer or approved host access to pull the intended images and recreate the affected services. Record the image reference or digest and container start time when available.

## Verify staging

Do not treat a page load as complete verification. Check independently:

- all expected containers are running and health checks pass;
- the public web endpoint returns successfully;
- the public API and `/docs/json` return successfully and report the intended version;
- authentication or login reaches the API successfully;
- worker and bot remain running when part of the deployment;
- database and MinIO remain healthy;
- changed functionality works through the public staging route.

For a broken Next.js image, test both the raw asset and the `/_next/image` optimizer URL. A raw asset returning 200 does not prove that `images.localPatterns` permits it.

## Report and stop conditions

Report the integrated version, branch and commit, validation results, CI/image status, deployed services, endpoint checks, and any unverified item. If staging fails, preserve volumes, capture the failing service and logs, and stop before production. Production remains unchanged unless the user explicitly authorizes its deployment.
