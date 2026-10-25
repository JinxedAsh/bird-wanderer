# Running, backing up and restoring Bird Wanderer

Updated 26 October 2026. These are deployment instructions and a verified synthetic restore rehearsal, not evidence that a public production service exists. The Android APK connects to the same server; it does not contain Express, SQLite or an offline copy of the project.

## Local demo

Use the existing developer launcher or run `pnpm dev` inside `frontend`. Keep that process running. Open the displayed local address; a phone needs the current LAN address, same network and exact allowed origin. A temporary Cloudflare tunnel changes address and must remain running. Do not describe either as permanent hosting. Use the existing automatic tunnel command rather than disabling origin/host checks.

Sign in with a real account you control. Demonstrate species search → sourced detail/reference EXIF → hotspot map/daylight/forecast/access sources. For later phases, use your own photo/observation and another authorized test account to demonstrate privacy, community, sighting subscriptions, messages and quiz. Missing EXIF is a normal result when the file has no metadata. Forecast windows are labelled heuristics; seasonal statistics, measured difficulty and historical environmental matching are not invented. Real Firebase delivery is unconfigured.

## Production prerequisites and startup

The operator supplies a reachable host, domain/HTTPS certificate, persistent private disk and access controls. Use Node24 (at least24.15, below25) and the pinned pnpm11.25.0. In `frontend`, run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test`, `pnpm build`. Run the built app with `pnpm start` using a private environment file containing:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://your-actual-host.example
HOST=127.0.0.1
PORT=3001
DATABASE_PATH=/var/lib/bird-wanderer/app.sqlite
MEDIA_PATH=/var/lib/bird-wanderer/media
EBIRD_API_KEY=your-private-key
EBIRD_REGION=IN-DL
```

Replace the example origin with the actual exact HTTPS origin. Store credentials outside source control, never under `dist` or another public folder. Both database and media paths need persistent storage writable only by the service/operator. Retain current private Firebase credentials separately if configured later; the backup tool deliberately does not copy `.env` or service-account files.

Express serves `dist` in production and keeps media behind authenticated APIs. Put an HTTPS proxy in front of the loopback server; do not expose a development Vite server as production. For a single local Nginx proxy, the relevant location settings are:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 11m;
    proxy_read_timeout 60s;
}
```

This belongs inside the operator's correctly configured HTTPS server; certificate provisioning is separate. The proxy overwrites client-supplied forwarding headers. Production Express trusts only loopback proxy hops, allowing separate client-IP rate-limit buckets; the development default ignores forwarded headers. Do not extend trust to arbitrary proxies or publish the private data directory through Nginx.

Use the host's service manager to run the Node process under an unprivileged service account, with `frontend` as its working directory, private environment loaded and automatic restart after failure/reboot. For systemd, the essentials are `User=birdwanderer`, `WorkingDirectory=/srv/bird-wanderer/frontend`, `EnvironmentFile=/etc/bird-wanderer.env`, `ExecStart=/usr/bin/node server/index.mjs`, and `Restart=on-failure`. These are templates, not services installed by this increment. Restrict network access to the intended proxy/HTTPS ports. Verify health, login/session/logout, source loading, authorized uploads/media, alert-worker operation and logs on the actual host before claiming production availability.

## Create and verify a backup

1. Schedule a short maintenance window. Stop **every process** using this database/media, including development servers, production workers and another checkout pointing at the same paths. Wait for shutdown. The flag below is an explicit operator confirmation; the tool cannot prove that another machine is stopped.
2. From `frontend`, with the same private `DATABASE_PATH`/`MEDIA_PATH` environment, choose a **new directory outside the repository** whose parent already exists:

   ```text
   pnpm backup create "C:\Users\ayush\BirdWandererBackups\2026-10-25-demo" --server-stopped
   pnpm backup verify "C:\Users\ayush\BirdWandererBackups\2026-10-25-demo"
   ```

   Linux uses the same command with an appropriate absolute private path. Create the parent folder beforehand. Never choose a public/cloud-shared folder casually: the snapshot contains account hashes/sessions, private records, source EXIF/coordinates and photos. Protect it with private filesystem/storage access; it is not encrypted by this tool.
3. A successful archive contains `bird-wanderer.sqlite`, `media/` and `manifest.json`. The SQLite backup API includes committed WAL data; copying only the live `.sqlite` file would not guarantee that. Every referenced photograph is copied. Integrity/foreign-key checks, counts, sizes and SHA-256 checksums are verified. The tool rejects existing/project destinations, unsafe filenames, media links/missing files and incomplete snapshots. It does not overwrite or delete an older backup.
4. If creation fails, leave its new partial directory for inspection. An `INCOMPLETE.txt` marker or failed verification means **do not restore**. No automatic recursive deletion occurs. Checksums detect accidental corruption; they are not signatures proving a backup came from a trusted source.
5. Restart the app using its original data paths and verify health/login. Keep an independently protected off-host copy if needed and verify it after transfer. Retention/encryption/off-host scheduling are operator tasks; none is silently configured here.

## Restore without overwriting the current installation

1. Stop all processes using the target data and verify a backup created by the trusted operator with `pnpm backup verify`.
2. Copy the archive's database and media into a **new empty private data directory**. Leave the original installation and archive untouched. Use `DATABASE_PATH` and `MEDIA_PATH` to point a test app at these copied paths. Do not run the app directly against the archive: startup migrations and new writes would change your backup.
3. Check account login, expected record/count/privacy, EXIF and actual image bytes; verify that a different account cannot read private records. Confirm messages/subscriptions/quiz state where used. A full snapshot includes sessions, so current pre-backup sessions may remain valid; if restoring after compromise, separately invalidate sessions and rotate affected secrets.
4. Start the intended server against the restored paths only after verification. Keep the previous paths for rollback until the operator accepts the result. Do not merge old and restored SQLite/media directories by hand.

## What has actually been verified

An isolated actual-app rehearsal created an account/session, uploaded a generated JPEG and private observation, stopped its HTTP server, and backed up committed WAL content plus referenced media. Both CLI create/verify and direct APIs were exercised. A copied restore reopened through the real app, restored session/private record/EXIF, retained the WAL-only test row and returned byte-identical media; unauthenticated access stayed denied. Corrupt media, missing references, unconfirmed copying, project/existing destinations and incomplete archives were rejected. No personal live backup, external host, off-host storage or production outage/recovery was performed.

## Viva Notes

1. **Why back up media with SQLite?** The database stores references and metadata; photographs are private files. Restoring only one side leaves broken records or missing photos.
2. **Why stop writes?** A database snapshot and file copy must describe the same state. A photo deleted during a live copy could make the archive inconsistent.
3. **What is WAL?** SQLite's write-ahead log can contain committed changes not yet copied into the main file. The SQLite backup API reads that committed state.
4. **Why use checksums?** They detect changed/missing bytes after creation or transfer. They do not authenticate a maliciously rewritten archive.
5. **Why restore to new paths?** It allows verification and rollback without destroying the current data or the archive.
6. **Why trust only the local proxy?** Rate limits need the real client's IP, but accepting arbitrary forwarded headers would let callers invent addresses to bypass limits.

Integrated rehearsal completed26 October with controlled data: existing login/source-ID discovery, generated photo/journal persistence, public-only feed, second-account sighting target/read, comment/message persistence and private404. Earlier quiz/native evidence was reused; no fresh quiz or native audit is implied.
