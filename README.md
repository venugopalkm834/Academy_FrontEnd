# The Academic Club

Needs Node.js 20+ (`node -v`). Login is by **mobile number** + password.

**Database** (backend/.env `DB_MODE=auto`): if a MongoDB is running at `MONGO_URI` (default mongodb://127.0.0.1:27017/academic_club) it is used, so you can see the data in MongoDB Compass. If not, a **saved** embedded MongoDB is used (kept in `storage/db`, open it in Compass at mongodb://127.0.0.1:27018/academic_club). Data is no longer lost on restart. The backend prints which database it connected to.

**Going live on theacademicclub.com, Docker, Git: see DEPLOY.md.**

## Easiest start: one command
    npm install
    npm run setup        (installs backend + frontend packages, first time and after updates)
    npm start            (starts the backend, waits until it answers, then starts the website)
Open http://localhost:4200. Something wrong? Run `npm run doctor`: it checks Node, packages, backend/.env and whether the backend answers, and tells you what to fix.

**One process, one port** (no proxy, closest to the live site): `npm run serve` builds the website and the backend then serves BOTH on http://localhost:5000.

## Run (from this folder)
    npm install
    npm run setup
    npm run dev
Open http://localhost:4200  (API on :5000). First install takes a few minutes.
Or two terminals: `cd backend && npm install && npm run dev` / `cd frontend && npm install && npm start`.

## Logins (demo data is created automatically)
| Role    | URL                | Mobile / Password |
|---------|--------------------|-------------------|
| Admin   | /admin/login       | 9000000000 / Admin@12345 (ADMIN_PHONE and ADMIN_PASSWORD in backend/.env) |
| Partner (demo) | /partner/login | 9876500001 school, 9876500002 college, 9876500003 training, 9876500004 dance, 9876500005 yoga, 9876500006 coaching / Partner@123 |
| Member  | /member/register   | register with your own 10-digit mobile, then /login |

## What works
- **Partners** (school, college, training institute, coaching, dance, yoga, music, sports, other): separate register + login, profile (logo, cover, services, contact, registration document), add/edit offerings with fee structure rows, offer %, live fee calculator, submit for admin approval.
- **Admin**: dashboard; approve/reject/suspend partners (view their document); approve/reject offerings and set the Academic Club discount; **Sponsors & Ads** (pick any approved partner, headline, banner image, start/end dates, order, pause/remove); manage members.
- **Member panel**: dashboard with search, category tiles and sponsor ads; **Sponsors page** where members search any service (text, type, city), browse a listing and open a details page (about, offerings, fee structure, prices after discount, contact, call/email/map).
- The public home page also shows the sponsors the admin picked; the public Sponsors page is at /partners.
- Mobile-friendly: responsive grids, slide-in sidebar, swipeable ad strip and category chips.

## What is new in v0.12
- **Your logo** (transparent background) in the header, footer, sidebar, ID card, PDF card, emails and as the browser icon.
- Demo content on first start (WhatsApp number, Club Entertainment events, banners) so every feature is visible at once. See `CHANGELOG.md` for where to find each feature, and the footer shows the version you are running.

## What was new in v0.11
- **Club Entertainment** replaces the old "Featured Partner Institute" section at the bottom of the home page. In **Admin > Club Entertainment** the admin adds any number of shows / events (image, title, date, time, venue, ticket price, seats, show-from / show-until dates, order) and can edit, hide or remove them. Every live item **slides** on the home page (auto-slide, arrows, swipe on phones).
- **Booking**: the member taps **Book now** (log in first; after login they come back to the same event), picks the number of tickets, pays by UPI / bank and uploads the payment screenshot. The admin approves under **Club Entertainment > Bookings** (or in Payments). Then the booking is confirmed, the member gets a notification and an email (wording editable in Email Templates). Seats are held while a booking is pending, so events cannot be overbooked. Free events (price 0) confirm immediately. The admin is notified of every booking.
- **ID card on WhatsApp**: My ID Card has **Share on WhatsApp** (a message with the member ID and the verification link) and, on phones that support it, **Share PDF** to send the PDF itself.

## What was new in v0.10
- **WhatsApp button**: a green floating icon on every page (site, member, academy and admin panels). Tapping it opens WhatsApp with the admin's number and a pre-filled message.
- **Contact details from the admin panel** (Admin > Contact & Email Settings): email, WhatsApp number, phone, address, working hours. They show on the Contact page, footer and in "Help & Contact" inside the member and academy panels.
- **Academy login**: the partner login is now called "Academy Login" (the address /partner/login still works, and /academy/login too).
- **Ad requests by academies** (Academy > Plans, Ads & Payments): an academy sends a request for an **image banner** or a **featured sponsor card**, pays the admin-set fee and uploads the payment screenshot. The admin approves in **Ad Requests** and the ad goes live (banner on the home slider and member panel). Fees and days are set in Payment Settings.
- **Notifications (bell icon)** in every panel. The admin is notified (bell + email) of every new member, new academy, new booking and every payment waiting for verification. Members and academies are notified of confirmed bookings and payment decisions.
- **Emails through Resend**: after a payment is approved or rejected (to the member or academy) and when a booking is confirmed (to the member **and** the academy). Set `RESEND_API_KEY` in `.env` and verify your sending domain in Resend. The sender (e.g. info@academicclub.com) and the admin alert address are set in Contact & Email Settings. Without a key emails are printed in the backend log.
- **Email Templates** (Admin > Email Templates): edit the subject and wording of each automatic email, switch them on or off, reset to default, and send yourself a test.
- **Mobile**: bottom menu bar in every panel, bigger touch targets, no iPhone zoom on fields, forms centred on every screen size.

## Membership, ID card and online payment (v0.8)
- **Register** (/member/register): full name, Student/Parent, mobile, email, DOB, gender, address, state/district/city/PIN, education level, Aadhaar, selfie (camera capture on phones or upload, with preview), password. Registration and payment are separate steps.
- **Plans** (Admin > Membership Plans): any number of one-year or lifetime plans with any price, optionally only for **LKG to SSLC** or **PUC to Degree** members. The member's education level decides which plans they see, automatically.
- **Pay** (Member > My Membership): **Pay now** (Razorpay, INR) or manual UPI / bank with a screenshot that the admin verifies. A membership is activated **only** after the server verifies the gateway signature and the gateway's own payment record (the webhook is the backup), or after the admin approves a manual payment. A payment can only be processed once (unique IDs + atomic status change), so double clicks, retries and webhook repeats cannot activate or charge twice.
- **ID card** (Member > My ID Card): created automatically after payment. Logo, photo, name, Member ID (TAC-26-000123), type, education, mobile, address, city, PIN, validity, status and a QR code that opens a public verification page (/verify/...). Download as PDF, print, or view on any screen size. Yearly memberships track expiry and can be renewed (extends from the current expiry); lifetime never expires.
- **Admin**: dashboard (members, students/parents, active/expired/lifetime, partners, institutes, pending approvals, successful/failed payments, revenue by type), members with search (name, mobile, member ID, PIN, city), filters, pagination, full profile with photo, suspend/reactivate, **CSV export** (opens in Excel), payments with filters, pagination and CSV export, landing-page counters override.
- **Landing page**: animated counters for students and partner institutions from the database (rounded, e.g. 1,200+), admin can override the numbers.
- **Find Partner Institutes** (Member panel): search by name, PIN code, state, district, city and category. Only approved, listed partners appear.

### Online payment setup (Razorpay)
1. Create a Razorpay account, copy the Key ID and Key Secret into `backend/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`). Use test keys first.
2. In the Razorpay dashboard add a webhook to `https://YOUR-DOMAIN/api/webhooks/razorpay` with events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`, and put the webhook secret in `RAZORPAY_WEBHOOK_SECRET`. (For local testing expose port 5000 with a tunnel such as ngrok.)
3. Without keys the **Pay now** button is hidden and members use the manual UPI / bank option.

### Aadhaar privacy
The number is validated (12 digits + checksum), then stored only as AES-256-GCM encrypted text, a keyed hash (to block duplicate registrations) and the last 4 digits. APIs, the admin screens, the ID card and the PDF show only `XXXX XXXX 1234`, never the full number. It needs a consent tick. **Set your own `AADHAAR_KEY`** (64 hex characters, see backend/.env) before going live and never change it afterwards. Collecting Aadhaar numbers is legally restricted for private organisations in India: get legal advice, and you can switch collection off in Admin > Payment Settings.

## Partner plans (set by the admin in Payment Settings, section 2)
- **Plan A: Normal listing.** The partner uploads details + offerings (e.g. a yoga class). Admin sets free days after partner registration, a listing fee and how long a paid listing lasts. After the free days the partner pays (QR / UPI / bank, transaction ID + screenshot), the admin verifies it, and the partner can then submit offerings. When the admin approves the offerings they appear in the user panel under **Find Services**. If the listing lapses the partner is hidden from members until renewed.
- **Plan B: Featured sponsor.** The partner requests to be shown on the main page (headline, text, banner). Admin sets the fee and how many days the ad runs. After payment is verified (or immediately, if free) the admin approves under **Sponsor Requests** and the ad goes live on the main page, at the top of the user panel and pinned first in Find Services with a "Sponsored" badge. The admin can also add sponsors directly under **Sponsors & Ads**.
- A fee of 0 makes a plan free. Partners manage all of this under **Plans & Payments**.

### Quick test of partner plans
1. Admin > Payment Settings: free listing days 0, listing fee 500, sponsorship fee 1000, add a UPI ID, save.
2. Register a partner (/partner/register), approve it in Admin > Partners.
3. Partner > Plans & Payments: pay the listing fee (any 6+ character transaction ID + screenshot). Admin > Payments > Approve.
4. Partner > My Offerings: add an offering, submit; Admin > Offerings > Approve. It now shows in Find Services.
5. Partner > Plans & Payments > Request sponsorship, pay; Admin > Sponsor Requests > Approve & publish. It appears on the home page.

## Payments (set by the admin in Admin > Payment Settings)
- **Mode**: No payment / pay at registration (membership fee) / pay when booking a course.
- **Free days**: members use everything free for N days from their registration (0 = none). Each member's end date is fixed at registration.
- **Amounts**: membership fee + validity days, booking fee.
- **Where to pay**: UPI ID, QR code image, bank account details (each can be shown or hidden), and instructions.
- Member pays, enters the transaction ID and uploads a screenshot (private file). **Nothing is activated until the admin approves** in Admin > Payments. Approval activates the membership (ID + validity dates) or confirms the booking; rejection lets the member pay again.
- Booking flow: Sponsors > offering > "Book now" > (pay if required) > My Bookings. Partners see confirmed bookings with the member's phone/email under Bookings.

### Quick test of the payment flow
1. Admin > Payment Settings: mode "At booking", free days 0, booking fee 199, add a UPI ID, save.
2. Register a member, open a sponsor (e.g. Zen Yoga), click "Book now": the payment form appears.
3. Submit a transaction ID + screenshot; log in as admin > Payments > Approve; the booking turns Confirmed and the partner (yoga@demo.com) sees it under Bookings.
Switch to "At registration" to test the membership fee: after the free days the member is sent to My Membership to pay.

## Checks
`cd backend && npm run build && node logic.test.js` runs the pricing/free-days/payment-mode logic tests (they passed when this was packaged).

## Check every flow automatically
With the backend running, in another terminal: `cd backend && npm run check:flow`. It registers a partner and a member, runs approvals, listing/booking/sponsorship payments, offerings and public listing, prints a tick or cross for each step, and restores your payment settings.

## Mobile login and validation
- Mobile = 10 digits starting 6-9 (+91 / 0 prefixes and spaces are accepted and cleaned). Registration and login show inline errors and the server validates again. Each mobile number can be registered once.
- Forgot password: enter the mobile number; a reset link is emailed to the address on the account (no SMS gateway is configured).

## Troubleshooting
- **Red bar "Cannot reach the backend"**: the backend is not running or crashed on start. Run `npm run doctor`, then `npm start` and read the FIRST red line of the backend output (the usual causes: packages not installed -> `npm run setup`; `AADHAAR_KEY` not 64 hex characters; port 5000 already used -> `kill-ports.bat`). If you changed `proxy.conf.json` or the port, restart `npm start`.
- **Red bar "backend is out of date"**: an OLD backend is still running on port 5000. On Windows double-click `kill-ports.bat` (or run `netstat -ano | findstr :5000` then `taskkill /PID <pid> /F`), then `npm run dev`. Confirm http://localhost:5000/api/health shows `"version":"0.8.0"`.
- Backend start-up must print `Academic Club API v0.8.0 running` and `Seeded (admin, categories, settings, demo partners)`. If not, you are running an old backend folder.
- A red bar at the top of the site means the backend is old or not running.
- After every backend restart the in-memory database is reset (re-register, or use the demo logins). Use a real MongoDB to keep data.
- Always replace BOTH folders from the zip, then run `npm install` in each (new packages were added).

## Real MongoDB
In backend/.env set USE_MEMORY_DB=false and MONGO_URI=..., then `npm run seed` once. Set SEED_DEMO=false to skip demo data.

## Structure
backend/src: config, models (one file per collection), middleware, services, modules/{auth,public,partner,admin,upload}, seed
frontend/src/app: core (api, auth, guards, interceptors), layouts, features/{home,auth,sponsors,member,partner,admin}, shared/components — each component has .ts + .html + .scss
Uploaded images go to storage/uploads (public); registration documents and payment screenshots go to storage/private (admin-only). The storage folder sits next to backend/ and frontend/.

## Not built yet (next stage)
- Admin-created **partner packages** (Basic / Premium / Platinum / Sponsorship with benefits, deposits and instalments) and partners buying them. Today partners use the simpler Plan A (listing) and Plan B (sponsor) fees under Payment Settings.
- Partners adding **several institutes** with gallery images and per-institute approval; separate offer records with fixed discounts, validity dates, eligibility and approval history / rejection reasons (today an offering is approved or rejected as a whole).
- Sponsorship packages with banner sizes and placements, a dedicated homepage sponsor section.
- Excel / PDF financial reports beyond the CSV exports; institute enquiry form.
- Mobile OTP verification (needs an SMS provider). Email verification works.
