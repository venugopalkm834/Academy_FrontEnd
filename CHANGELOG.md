# What is in each version, and where to see it

Check your copy first: the footer of the website shows **v0.12.0** and the backend start-up line says `Academic Club API v0.12.0 running`. `npm run doctor` also checks this. If you see an older number, you are running an old copy: replace the whole folder with this one, run `npm run setup`, then `npm start`.

On a fresh start the database is filled with demo content so every feature is visible straight away (only when `SEED_DEMO` is not `false`): a WhatsApp number, 3 Club Entertainment events, 2 banner ads, 6 demo academies.
Admin login: mobile `9000000000` / `Admin@12345` (from backend/.env).

| # | Request | Where to find it |
|---|---|---|
| 1 | WhatsApp contact icon | Green round icon bottom-right on every page. Tapping it opens WhatsApp chat with the admin's number. (Hidden only if no WhatsApp number is set.) |
| 2 | Admin sets email, WhatsApp, address | Admin > **Contact & Email Settings**. Shown on the Contact page, footer, and **Help & Contact** in the member and academy panels |
| 3 | Academy ad requests with payment screenshot | Academy login > **Plans, Ads & Payments** > "Advertise on the main page". Admin approves in **Ad Requests** |
| 4 | Forms centred | All forms in member, academy and admin panels |
| 5 | Mobile and responsive | Phone: bottom menu bar in every panel, big touch targets. Try the browser at phone width |
| 6 | Admin notified on registration and every booking | Bell icon (top bar) in the admin panel + email to the admin alert address |
| 7 | "Academy Login" | Header and footer of the website, and the login page title |
| 8 | Emails via Resend, wording editable | Set `RESEND_API_KEY` in .env. Admin > **Email Templates** (edit, test, switch on/off) |
| 9 | ID card on WhatsApp | Member > **My ID Card** > "Share on WhatsApp" (and "Share PDF" on phones) |
| 10 | Club Entertainment replaces "Featured Partner Institute" | Bottom of the home page (slides). Admin > **Club Entertainment** (add any number, edit, bookings, approve). Member > **Club Entertainment** to book and pay |
| 11 | New logo, no background | Header, footer, sidebar, ID card (screen and PDF), emails and the browser tab icon. Files: `frontend/public/logo.png`, `backend/assets/logo.png` |

To change the logo later, replace those two files (keep a transparent PNG) and the two icon files `favicon.png` and `apple-touch-icon.png` in `frontend/public`.

## Fixes after v0.12.0 (images and phone layout)
- Uploads, the embedded database and the built website are now found relative to the project, not the folder the backend was started from (a different start folder used to hide every uploaded image).
- Demo banner/event pictures are re-created on start if the storage folder was replaced.
- Pictures that fail to load no longer show a broken-image icon.
- Admin/partner/member forms get the two-column grid (one column on phones); the dashboard top bar and content area are styled; footer, header, home page, banner arrows, sponsor cover, bookings and filters tuned for phones.

## v0.12.2 additions
- **Institute Categories** (Admin menu): add / rename / reorder / hide / delete the categories used in Find Partner Institutes and academy registration (e.g. "Placements" is included; add your own).
- **District** is now asked when an academy registers, and the admin can fix any academy's category / district / city / state / PIN with Partners > Edit details (old academies had no district, so the district list was empty).
- **Club Entertainment offers**: Original price + Offer price. The website shows the old price struck through, the offer price and "% OFF".
- **Delete partner**: Partners > Delete (removes the academy, its offerings and ads, and frees its mobile and email).
