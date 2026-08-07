# Ascend backend deployment

The public site is designed for Cloudflare Pages with Pages Functions.

## Required Pages environment variables / secrets

### Google Sheets pipeline
- `ASCEND_SHEET_ID` = `14j0uLb0DYetaqkaEkX-82SZUfxVfNlfHaPOZ3O_i_PU`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = service account email with Editor access to the Ascend Financial Group Business App Database
- `GOOGLE_PRIVATE_KEY` = the service account PKCS8 private key

The target sheet tab is `Webinar Registrations` and the backend appends columns A:P.

### Webinar
- `WEBINAR_DATE` = human-readable date/time shown in confirmations
- `WEBINAR_LINK` = webinar join URL

### Email delivery
- `RESEND_API_KEY`
- `FROM_EMAIL` = verified Ascend sender such as `Ascend Financial Group <webinar@ascend-fg.com>`

### SMS delivery
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

## Role access

Protect `/agent/*` and `/manager/*` with Cloudflare Access / Zero Trust using Google Workspace identity.

- Agent policy: approved Ascend agent accounts.
- Manager policy: approved Ascend manager accounts only.
- The Google Sheet itself must remain restricted to managers, providing a second authorization boundary even if someone knows the URL.

## Registration flow

1. Candidate opens `/join/`.
2. Candidate submits the webinar form and SMS/email consent.
3. `/api/register` validates required fields.
4. Registration is appended to `Webinar Registrations` with status `Registered` and communication flags `Pending`.
5. Confirmation email is sent when Resend is configured.
6. Confirmation SMS is sent when Twilio is configured.
7. Manager updates pipeline status through Registered → Confirmed → Attended / No Show → Interview → Hired / Not Moving Forward.

Do not expose secret values in GitHub. Store them only as Cloudflare encrypted environment variables/secrets.
