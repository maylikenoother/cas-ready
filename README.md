# CAS Ready

CAS Ready is a practice app for the recorded pre-CAS credibility interview that many UK universities ask international applicants to pass before they issue a Confirmation of Acceptance for Studies (CAS).

A question appears on screen. You get a short time to read it. Recording then starts on its own and stops when the timer ends. A full mock does not let you record the answer again. Afterwards you get a practice score, notes on the answer, and a PDF.

It is practice software. It does not predict a CAS, a visa, or a university decision, and it does not judge honesty, emotion, or personality.

The first university profile in the database is the University of Lincoln, MSc International Business, because that is what the handover was built around. The app is not affiliated with the university, with Enroly, or with UK Visas and Immigration.

## What a student can do

- Create an account with an email code. There is no password.
- Save a course profile. Answers are checked against that profile and against the stored course record.
- Take **one free question** and see the full feedback for it.
- Subscribe to run a full **mock** (no re-record, questions drawn from the bank) or **practice** (hints and re-record).
- Check the camera, microphone, brightness, and background noise before recording. Brightness is an average of the picture. The app does not look at faces.
- If the camera is blocked, continue by typing the answer.
- Read a report with topic scores, a Green / Amber / Red band when there is enough text to score, the transcript, and a PDF.
- Delete the whole account, including recordings.

Mock interviews and practice mode stay locked until Stripe confirms the subscription. The success page does not unlock anything by itself.

## What you need before it will run

1. A [Supabase](https://supabase.com) project (free tier is enough to start).
2. A [Google AI Studio](https://aistudio.google.com) API key for Gemini.
3. A [Stripe](https://dashboard.stripe.com) account, kept in **test mode** until you are ready to charge people.
4. A [Vercel](https://vercel.com) account for the public site. Local development does not need Vercel.
5. Node.js 22.

You do not need Docker. The steps below use a hosted Supabase project. A local Supabase option is at the end.

## 1. Install and configure the app on your computer

```bash
git clone <this-repository>
cd cas-ready
npm install
cp .env.example .env.local
```

Fill in `.env.local` as you complete the steps below. Then:

```bash
npm run dev
```

Open http://localhost:3000.

`npm run dev` will start even before the keys are filled in. Sign-in, interviews, and payments will not work until they are.

## 2. Create the Supabase project

1. In Supabase, create a new project. Choose a region close to your students. A UK or EU region is a reasonable default. Save the database password somewhere safe.
2. Open **Project Settings → API**.
3. Copy **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy the **anon public** key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Copy the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`.

The service role key bypasses row level security. It must only live in `.env.local` and in the Vercel server environment. Never put it in a `NEXT_PUBLIC_` variable.

### Create the tables

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the whole of `supabase/migrations/20261126120000_schema.sql` and run it.
3. New query. Paste the whole of `supabase/migrations/20261126120100_seed.sql` and run it.

That creates the question bank (39 questions), the University of Lincoln profile, the maintenance figures, and the two plans. It also creates a private Storage bucket named `recordings`.

If the storage section reports an error, open **Storage**, create a bucket named `recordings`, set it to **private**, and run the schema file again. The policy statements skip themselves if they already exist.

### Turn on email codes

Sign-in is a 6-digit code. The same address works for a first visit and for coming back. The app asks Supabase to email the code and then checks it with `verifyOtp`. It does not depend on the link in the message. If someone taps the link anyway, `/auth/callback` still finishes the sign-in.

1. Open **Authentication → Providers → Email**. Leave Email enabled.
2. Set **Email OTP expiration** to `600` seconds (10 minutes). The code screen counts down those same 10 minutes. A shorter setting in Supabase would expire the code before the screen says it has.
3. Open **Authentication → URL configuration**.
4. Set **Site URL** to `http://localhost:3000` while you are developing.
5. Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
6. When you deploy, set Site URL to the Vercel address and add `https://your-app.vercel.app/auth/callback` as well.

#### Email templates

Open **Authentication → Emails → Templates**. Paste the text below into both **Magic Link** (people who already have an account) and **Confirm signup** (people signing in for the first time, if confirmations are on). Both must include `{{ .Token }}`, or the email will not contain the code.

Magic Link:

```html
<h2>Your CAS Ready code</h2>
<p>Enter this code on the sign-in page. It expires in 10 minutes.</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
<p>If you did not try to sign in, you can ignore this email.</p>
<p>You can also open this link: <a href="{{ .ConfirmationURL }}">Continue to CAS Ready</a></p>
```

Confirm signup:

```html
<h2>Confirm your CAS Ready email</h2>
<p>Enter this code on the sign-in page to finish creating your account. It expires in 10 minutes.</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
<p>If you did not ask for this, you can ignore this email.</p>
<p>You can also open this link: <a href="{{ .ConfirmationURL }}">Continue to CAS Ready</a></p>
```

#### Email limits and your own mailer

Supabase’s built-in email service is for trying the product. It is tightly rate limited. The number in force is shown under **Authentication → Rate Limits** as “Rate limit for sending emails”. On many projects that limit is 2 emails per hour, which is why a second code can fail on the live site. The sign-in screen says so when Supabase returns a rate-limit error.

For a real site, send mail through your own provider, then raise that rate limit to a number you can afford.

Resend is one option:

1. In Resend, verify the domain you will send from, and create an API key.
2. In Supabase, open **Project Settings → Authentication → SMTP Settings** and turn on custom SMTP.
3. Host `smtp.resend.com`, port `465`, username `resend`, password the API key.
4. Set the sender name and a from address on that verified domain, for example `CAS Ready <hello@yourdomain.com>`.
5. Save, then send yourself a code from the sign-in page. The 10-minute countdown starts again each time a new code is sent. The Resend button waits 60 seconds between sends.

### Make yourself an admin

Sign up once in the app so your user exists. Then, in the SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Open `/admin` after signing in again. You can edit maintenance figures, mark them verified or unverified, and turn a row on or off. Figures marked “needs verification”, or marked inactive, are not used by the calculator.

## 3. Gemini

1. Open [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.
2. Put it in `GEMINI_API_KEY`.
3. Leave `GEMINI_MODEL=gemini-2.5-flash` unless you want a different model.
4. Leave `GEMINI_TIER=free` while you are on the unpaid tier.

The free tier may use prompts and responses to improve Google’s products. The privacy notice says so, because it reads `GEMINI_TIER`.

To move to the paid tier later:

1. Enable billing on the same Google project. Google’s paid Gemini API terms say prompts and responses are not used to improve Google’s models.
2. Set `GEMINI_TIER=paid`.
3. Redeploy, or restart `npm run dev`.

No application code has to change. The privacy notice and the wording you show students should be re-read after you switch, and you should confirm the current Google terms yourself.

If the key is missing, interviews still save and the fixed rubric still scores them. The written coaching notes are skipped.

The model is instructed not to predict a CAS or a visa, and not to judge honesty, emotion, accent, or appearance. The app also drops coaching text that slips into that kind of claim.

## 4. Stripe test mode

Stay in **test mode** (the switch in the Stripe dashboard) until you have decided to take real payments.

1. **Product catalogue → Add product**.
   - Name: `CAS Ready Starter`.
   - Price: £9.99, recurring, monthly.
   - Copy the price ID (`price_...`) into `STRIPE_PRICE_STARTER`.
2. Second product.
   - Name: `CAS Ready Ready`.
   - Price: £24.99, recurring, monthly.
   - Copy the price ID into `STRIPE_PRICE_READY`.
3. **Developers → API keys**. Copy the secret key (`sk_test_...`) into `STRIPE_SECRET_KEY`.
4. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhooks:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
```

The CLI prints a webhook signing secret (`whsec_...`). Put that in `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.

On Vercel you will create a different webhook endpoint (step 6). The local secret and the Vercel secret are not the same.

5. **Settings → Billing → Customer portal**. Turn the portal on and allow customers to cancel. The “Manage the subscription” button needs this.

Starter includes 4 full mock interviews per billing period, plus practice mode. Ready includes unlimited mocks and practice mode. The free question is not part of Stripe. A mock that is abandoned before any answer is saved returns one interview to the allowance.

Paystack and Flutterwave are named in the code (`BILLING_PROVIDER`) so a later version can add them for cards and transfers that students in Nigeria and nearby countries actually use. They do not take payment in this version. Leave `BILLING_PROVIDER=stripe`.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.

After paying, refresh the billing page. The plan becomes active only when the webhook has been accepted. If it stays inactive, the Stripe CLI window will show the error.

## 5. Run the checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Unit tests cover the rubric, the maintenance calculator, question selection, the paywall rules, webhook handling, and the fact that every table has row level security. The end-to-end test loads the public pages. It does not record a camera.

## 6. Deploy on Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project** and import the repository. Framework preset: Next.js. Root directory: the repository root.
3. Add every variable from `.env.example` in **Project → Settings → Environment Variables**. Use the production Supabase URL and keys. Use Stripe **test** keys until you are ready for live charges.
4. Set `NEXT_PUBLIC_APP_URL` to the Vercel URL, with no trailing slash. You can set it after the first deploy, then redeploy.
5. Deploy.
6. In Supabase **Authentication → URL configuration**, set Site URL to the Vercel URL and add `https://YOUR-APP.vercel.app/auth/callback` as a redirect URL.
7. In Stripe **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-APP.vercel.app/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy that endpoint’s signing secret into the Vercel `STRIPE_WEBHOOK_SECRET` and redeploy.
8. Vercel Cron calls `/api/cron/retention` once a day. It only runs if `CRON_SECRET` is set. The request must send `Authorization: Bearer <CRON_SECRET>`. Vercel Cron does not add that header by itself on every plan. If the job is not authorised, call the URL from a scheduler that can set the header, or add the header in a Vercel cron proxy you control. Until it runs, use **Settings → Delete everything** and the 90-day dates stored on each answer. Scores are kept when the job runs; video, transcript, and model notes are cleared.

Camera and microphone only work on `https://` (or `localhost`). That is why a deployed URL is required for a real phone test.

## How the interview is scored

This is a practice rubric, not a university mark scheme. It has not been checked by an admissions tutor.

- **Delivery** starts from how much of the time was used. Full marks from 60% of the limit. It then deducts for a slow start, a long silence, little time spent speaking, and, when there is a transcript, a very slow or very fast pace or a lot of fillers (`um`, `uh`, `erm`).
- **Content** is 55% “did it touch the ideas for this question”, 25% specific details (numbers, names from the profile), and 20% length. General phrases such as “good university” or “my agent told me” reduce it.
- The answer score is 70% content and 30% delivery. With no transcript it is delivery only.
- If Gemini returns relevance and specificity scores, they are averaged with the rubric rather than replacing it.
- A Green / Amber / Red band (80 / 55) is shown when enough answers have text. A single free question can show a band, and it is labelled as a partial result.
- A money amount in a finance answer that matches none of the saved tuition, deposit, or rent (within 6%) is flagged for the student to check. It is not called a lie.

## Figures that are not hard-coded as facts

Maintenance amounts, the 28-day rule, and the accommodation offset live in the `reference_facts` table with a source URL and a last-verified date.

Checked against GOV.UK on 26 November 2026, and used by the calculator:

- £1,529 a month in London, £1,171 outside London, for up to 9 months. Lincoln is outside London.
- Funds held for 28 days in a row, ending within 31 days of the application.
- An accommodation deposit already paid to the university can be offset, up to the London monthly figure.

A law-firm article reported £1,570 and £1,203 from 30 November 2026. Those rows are stored **inactive** and flagged, and the calculator ignores them. After you have seen the new numbers on GOV.UK, edit them in `/admin`: set the source, the date, clear “needs verification”, and mark them active. Retire the older row by marking it inactive.

The app does not state a Student visa work-hour limit. That row points at GOV.UK and is flagged until someone checks the current rule.

The Lincoln tuition figure of £19,300 comes from the university’s International Prospectus 2026 (printed July 2025). The course row is flagged because fees change and the university says programme information can be revalidated. Students should read [the course page](https://www.lincoln.ac.uk/course/busintms/) before they quote a fee.

## Privacy and security, in short

- Row level security is on every application table. Students read their own rows. Sponsor income is in a separate table with no admin or university policy.
- Recordings are in a private bucket. Playback uses a short-lived signed URL. Paths are limited to the signed-in user’s folder.
- The Gemini key, the Stripe secret, the webhook secret, and the service role key are read only on the server.
- AI routes are rate limited.
- Security headers and a content security policy are set in `next.config.ts`.
- Account deletion is in Settings. Type `DELETE` to confirm.
- There is no face, emotion, personality, or honesty analysis.

The privacy notice and terms are a starting point. Have a lawyer read them before a public launch, and put a real contact address on the privacy page. A data protection impact assessment is appropriate once you store student video for real.

## University and agent access

The tables `organisations`, `organisation_members`, and `student_org_links` exist, with a summary function that returns name, country, number of finished sessions, and the latest score. It does not return money details or recordings. `/org` shows that summary for a signed-in member. Nothing in the interface yet sends an invite or links a student; an admin does that in SQL for now:

```sql
insert into public.organisation_members (org_id, user_id)
values ('33333333-3333-4333-8333-333333333333', '<staff user uuid>');

insert into public.student_org_links (org_id, student_id)
values ('33333333-3333-4333-8333-333333333333', '<student user uuid>');
```

The organisation id above is the seeded University of Lincoln organisation.

## Local Supabase instead of a hosted project

Docker is required. This repository includes `supabase/config.toml`.

```bash
npx supabase start
npx supabase db reset
```

`db reset` runs both migrations and then `supabase/seed.sql`, which only points at the migration so the rows are not inserted twice. Copy the local URL and keys printed by `supabase start` into `.env.local`. Local auth mail is caught by Inbucket (the URL is in the CLI output) rather than a real inbox.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local site at http://localhost:3000 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run test` | Unit tests |
| `npm run build` | Production build |
| `npm run test:e2e` | Playwright smoke test against the production build |
| `npm start` | Serve the production build |

## Open points for the owner

- Confirm the monthly prices (£9.99 with 4 mocks, £24.99 with unlimited mocks) and whether practice mode should stay inside the subscription.
- Confirm Lincoln as the first university, and which courses to add next.
- Have an admissions or compliance person review the questions, the hints, and the Green / Amber / Red bands.
- Re-check GOV.UK maintenance figures on and after 30 November 2026, then update `/admin`.
- Have a lawyer review the privacy notice, the terms, retention, and a data protection impact assessment before launch.
- Put the operator’s name and contact email on the privacy page.
- Decide when to enable Gemini billing and set `GEMINI_TIER=paid`.
- Add Paystack or Flutterwave when you want to charge in local African payment methods. The provider switch is in place; the payment calls are not.
- The basic admin and organisation screens are groundwork. They are not a full university dashboard.
