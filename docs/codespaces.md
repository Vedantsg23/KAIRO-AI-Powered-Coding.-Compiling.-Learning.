# Running KAIRO in GitHub Codespaces

The runner needs a Linux Docker daemon to start the sandbox containers. If
Docker Desktop cannot run on your computer (for example "Virtualization
support not detected", or a broken WSL installation), a **GitHub Codespace**
gives you a Linux machine in the cloud, with Docker, that you open in the
browser. The repository contains its setup in `.devcontainer/devcontainer.json`.

> **Status:** written for Codespaces but not yet run there: the development
> environment could not download the dev-container base images. The first
> team member to create a codespace should follow this page once and fix
> anything that differs.

## Cost

Personal GitHub accounts get a free monthly allowance: **120 core-hours and
15 GB-month of storage** on GitHub Free, **180 core-hours and 20 GB-month** on
GitHub Pro (included in the GitHub Student Developer Pack). A 4-core codespace
uses 4 core-hours per hour, so the free plan covers about 30 hours a month on
4 cores or 60 hours on 2 cores. Check your usage under GitHub *Settings →
Billing and licensing*, and see
[GitHub's billing page](https://docs.github.com/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces)
for the current numbers.

To stay inside it:

* **Stop** the codespace when you finish (it also stops by itself after 30
  idle minutes by default). A stopped codespace keeps your files and images.
* Build only the sandbox images you need (`make image-gcc` is enough for C and
  C++); all nine take about 8 GB.
* **Delete** codespaces you no longer need; storage is counted while they exist.

## First start (about 10 minutes)

1. Put the project on GitHub (see the README, "Put the project on GitHub").
2. On the repository page: **Code → Codespaces → ⋯ → New with options**.
   Choose the branch `main` and **4-core** machine type, then **Create
   codespace**. (2 cores also work; the Kotlin and C# compilers are slower.)
3. Wait while it builds. `make setup` runs automatically at the end and
   installs the Python and web dependencies (a few minutes).
4. In the terminal, build the sandbox images:

   ```bash
   make image-gcc          # C and C++ (a few minutes)
   make image-python       # Python
   make images             # or all eleven images (20-40 minutes, about 11 GB)
   ```

## Every start

Open three terminals (the **+** button in the terminal panel, or split with
the ⊞ icon) and run one command in each:

```bash
make runner      # 1: the sandbox runner (the only process that uses Docker)
make api         # 2: the API on port 8000
make web         # 3: the web app on port 5173
```

A notification offers **Open in Browser** for port 5173; the **Ports** tab
lists the address too (it looks like `https://<name>-5173.app.github.dev`).
Only languages whose image you built appear in the language picker.

### With Docker Compose instead

This runs the same containers a lab server would:

```bash
cp .env.example .env     # then set RUNNER_TOKEN to a long random string
docker compose --profile images build
docker compose up -d
```

Open port **8080** from the Ports tab. Stop with `docker compose down`.

## Saarthi (the AI guide) in a codespace

Never write the API key into a file in the repository. Store it as a
**Codespaces secret** instead:

1. GitHub → your profile picture → **Settings → Codespaces → Secrets → New secret**.
2. Name `ANTHROPIC_API_KEY`, value: your key, repository access: this repository.
3. Stop and start the codespace (or create a new one). `make api` then finds
   the key in the environment; without one, Saarthi says it is not set up and
   everything else works.

For a free offline demo, run the canned test double instead (it is not an AI
and says so in every answer): `make mock-ai` in one terminal and
`make api-mock` instead of `make api`.

## Tests

```bash
make test             # API, runner, web unit tests
make test-languages   # every language whose image is built, end to end
make browsers         # once: installs Chromium for the browser tests
make e2e              # with `make runner`, `make mock-ai` and `make api-mock` running
```

## Keep it private

Forwarded ports are **private** by default: only your GitHub account can open
them. Leave them that way. If you set port 5173 or 8080 to *Public* for a
demo, anyone with the link can run code in your codespace (still inside the
sandbox, but using your quota); switch it back afterwards. Never make port
8081 (the runner) public.

## Troubleshooting

| Symptom | What to do |
|---|---|
| "API offline", "Runner offline" or "Sandbox degraded" in the status bar | Start the missing `make api` or `make runner`; "degraded" means the runner cannot reach Docker yet: wait a few seconds and look at the runner's terminal. |
| A language is missing from the picker | Its image is not built: `make image-<name>` (see `make help`), then restart `make runner`. |
| "Blocked request. This host is not allowed." | The Vite dev server allows `*.app.github.dev` automatically in a codespace (`vite.config.ts`). Restart `make web`; if it persists, open port 8080 with Docker Compose instead. |
| Kotlin or C# runs end with "time limit" while compiling | Use a 4-core machine; the first compile after a start is the slowest. |
| `docker: permission denied` or "Cannot connect to the Docker daemon" | Rebuild the container: Command Palette (F1) → **Codespaces: Rebuild Container**. |
| Out of disk space | `docker image prune` removes unused layers; build fewer images. |
