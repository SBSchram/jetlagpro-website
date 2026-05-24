# jetlagpro.com email setup

**Problem (May 2026):** `info@jetlagpro.com` uses Namecheap `eforward*.registrar-servers.com` MX records while DNS is hosted on Cloudflare. Inbound mail from Gmail sometimes bounces with `554 5.7.1 Relay access denied`.

**Fix:** Move inbound mail to **Cloudflare Email Routing** (free). DNS is already on Cloudflare.

---

## Step 1 — Enable Cloudflare Email Routing

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **jetlagpro.com** → **Email** → **Email Routing**
2. Click **Get started** / **Enable Email Routing**
3. When prompted, **delete the old Namecheap MX records** (`eforward1`–`eforward5.registrar-servers.com)
4. Let Cloudflare add its MX records (e.g. `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`)
5. Cloudflare updates SPF to include `_spf.mx.cloudflare.net`

---

## Step 2 — Create the forward rule

1. **Email Routing** → **Routing rules** → **Create address**
2. **Custom address:** `info@jetlagpro.com`
3. **Destination:** `sbschram@gmail.com`
4. Save → verify the destination from the email Cloudflare sends
5. Status must show **Verified**

---

## Step 3 — Disable Namecheap forwarding (avoid conflicts)

1. [Namecheap](https://www.namecheap.com) → **Domain List** → **jetlagpro.com** → **Manage**
2. **Private Email** / **Email Forwarding** → remove any `info@` or catch-all forwards
3. Mail for `@jetlagpro.com` is now handled only by Cloudflare MX

---

## Step 4 — Test inbound

From `sbschram@gmail.com`, send **3 test messages** to `info@jetlagpro.com`.

- All should arrive in Gmail (inbox or spam)
- No `554 relay access denied` bounces

Allow 5–15 minutes after DNS changes propagate.

---

## Step 5 — Send *as* info@ from Gmail (optional)

Cloudflare Email Routing is **receive-only**. To reply as `info@jetlagpro.com` from Gmail:

1. Google Account → **Security** → **2-Step Verification** (required)
2. **App passwords** → create one for Mail
3. Gmail → **Settings** → **Accounts** → **Send mail as** → **Add another email address**
4. Name: `JetLagPro` — Email: `info@jetlagpro.com` — untick **Treat as an alias**
5. SMTP: `smtp.gmail.com`, port **587**, TLS
6. Username: `sbschram@gmail.com` — Password: the **app password**
7. Complete Gmail verification

**Note:** DMARC is currently `p=none` — required for Gmail send-as to work. Do not tighten to `p=reject` without proper SPF/DKIM for outbound.

---

## Current DNS snapshot (before migration)

| Record | Value |
|--------|--------|
| NS | `thea.ns.cloudflare.com`, `lee.ns.cloudflare.com` |
| MX | `eforward*.registrar-servers.com` (Namecheap — **replace**) |
| SPF | `v=spf1 include:spf.efwd.registrar-servers.com ~all` (**replaced by Cloudflare**) |
| DMARC | `p=none` at `_dmarc.jetlagpro.com` |

---

## App Store / public contact

- **App Review contact:** `sbschram@gmail.com` (reliable during review)
- **Public / in-app contact:** `info@jetlagpro.com` (after Cloudflare routing is verified)

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Still bouncing to info@ | Old Namecheap MX still in Cloudflare DNS? Forwarding still enabled at Namecheap? |
| Mail in spam | Mark as not spam; add filter for `@jetlagpro.com` forwards |
| Send-as fails | App password, port 587, DMARC `p=none`, verify info@ in Gmail settings |
