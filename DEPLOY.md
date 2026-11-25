# Deploying The Academic Club (theacademicclub.com)

Everything runs in Docker: **MongoDB + Node backend + website (Caddy, automatic HTTPS)**. The same files also run on your own computer.

## 1. What to push to Git (ONE repository)
Push the **whole `academic-club` folder as one repository** (a "monorepo"). Do not split backend and frontend: Docker builds both from this one folder and the website and API share one domain, which keeps login cookies and payments working.

```
academic-club/                 <- the repository
├── backend/                   Node + Express API (+ Dockerfile)
├── frontend/                  Angular website (+ Dockerfile)
├── deploy/                    Caddyfile (web server), backup.sh
├── docker-compose.yml         starts everything
├── .env.production.example    live settings template  (copy to .env on the server)
├── .env.local.example         local Docker settings template
├── .github/workflows/         optional auto-deploy
├── DEPLOY.md  README.md  .gitignore  kill-ports.bat
```
`.gitignore` keeps secrets (`.env`), `node_modules`, uploaded files and backups out of Git. **Never commit `.env`.** Use a **private** repository.

```bash
cd academic-club
git init
git add .
git status                 # check: no .env files and no node_modules in the list
git commit -m "The Academic Club"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/academic-club.git
git push -u origin main
```

## 2. Server (live)
1. Rent a Linux server (Ubuntu 22.04 / 24.04, **2 GB RAM or more**, a Mumbai / India region is best). The first build needs about 2 GB; if it runs out of memory add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`.
2. **DNS**: at your domain registrar create two **A records** pointing to the server's IP: `theacademicclub.com` and `www.theacademicclub.com`. Wait until they resolve (`ping theacademicclub.com`).
3. Install Docker: `curl -fsSL https://get.docker.com | sh`
4. Firewall: `sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable`
5. Get the code: `sudo mkdir -p /opt && cd /opt && sudo git clone https://github.com/YOUR-NAME/academic-club.git && cd academic-club`
6. Settings: `cp .env.production.example .env && nano .env` and fill **every** value (secrets: `openssl rand -hex 32`). **Back up `AADHAAR_KEY` somewhere safe.**
7. Start: `docker compose up -d --build` (first build takes a few minutes). Watch: `docker compose logs -f backend`. You should see `Academic Club API v0.12.0 running`.
8. Open https://theacademicclub.com. HTTPS certificates are issued automatically on the first visit.

## 3. First things to do after going live
1. Log in at `/admin/login` with `ADMIN_PHONE` and `ADMIN_PASSWORD`, and **change the password**.
2. Admin > **Membership Plans**: set your real prices.
3. Admin > **Payment Settings**: UPI ID / QR / bank details, partner fees, landing counters, Aadhaar on/off.
4. Admin > **Banners**: upload your first ad banners.
5. **Razorpay**: put the live keys in `.env`, then in the Razorpay dashboard add the webhook `https://theacademicclub.com/api/webhooks/razorpay` (events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`) with the same secret as `RAZORPAY_WEBHOOK_SECRET`. Run `docker compose up -d` to apply `.env` changes.
6. **Email (Resend)**: create an account at resend.com, verify your domain, create an API key and put it in `.env` as `RESEND_API_KEY`. Then in Admin > Contact & Email Settings set the sender (for example `info@academicclub.com`, it must belong to the verified domain) and the admin alert email, and use "Send test" in Email Templates. SMTP values still work as a fallback.
7. Test a registration and a small real payment end to end.

## 4. Update the live site later
```bash
cd /opt/academic-club && git pull && docker compose up -d --build
```
(or push to `main` with the optional GitHub Action in `.github/workflows/deploy.yml`). Your data lives in Docker volumes, so rebuilding does not delete it.

## 5. Backups (important: this site holds members' personal data)
`./deploy/backup.sh` saves the database and uploaded files into `backups/` (older than 14 days are removed). Run it nightly with cron and **copy `backups/` off the server**. Restore the database:
`docker compose exec -T mongo sh -c 'mongorestore --archive --gzip -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --drop' < backups/db-YYYY-MM-DD-HHMM.archive.gz`

## 6. Useful commands
| What | Command |
|---|---|
| Status | `docker compose ps` |
| Backend log | `docker compose logs -f backend` |
| Restart | `docker compose restart backend` |
| Stop all | `docker compose down` (data stays) |
| Look at the database | MongoDB Compass over an SSH tunnel: `ssh -L 27017:127.0.0.1:27017 user@server`, then `mongodb://academic:PASSWORD@localhost:27017/academic_club?authSource=admin` |

## 7. Run the whole thing on your computer
**With Docker** (same as live, plain http): `cp .env.local.example .env.local` then `docker compose --env-file .env.local up --build` and open http://localhost:8080 (admin 9000000000 / Admin@12345, demo partners are created).

**Without Docker** (best while developing): see README.md (`npm install`, `npm run setup`, `npm run dev`, site on http://localhost:4200).

## 8. Troubleshooting
* **Red bar "Cannot reach the backend" on the live site**: the backend container is not healthy. Run `docker compose ps` and `docker compose logs --tail=80 backend`. The most common causes: `AADHAAR_KEY` still `CHANGE_ME...` (it must be exactly 64 hex characters: `openssl rand -hex 32`), `MONGO_PASSWORD` containing `@ : / #`, or a blank required value in `.env`. After fixing `.env` run `docker compose up -d`.
* **Site not opening / no HTTPS**: DNS must point to the server first; check `docker compose logs web`. Ports 80 and 443 must be open.
* **Backend keeps restarting**: `docker compose logs backend`. A missing value in `.env` is reported by name.
* **Build fails with "heap out of memory"**: add swap (step 2.1).
* **TypeScript errors in the build log**: the image is still built; fix them in the code when convenient.
* **Payments not activating memberships**: check the Razorpay webhook URL and secret; failed deliveries are listed in the Razorpay dashboard.
* **Registration password has `@` or `:`**: the database password in `.env` must be letters and numbers only.
