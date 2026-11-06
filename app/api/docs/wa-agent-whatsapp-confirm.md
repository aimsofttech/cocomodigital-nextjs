# WhatsApp confirmation for agent bookings (phase 2 of the WhatsApp agent)

Status: built and tested (34 automated tests, AiSensy stubbed) on 2026-11-06, branch `feature/kd/whatsapp-confirm`, off
`feature/kd/whatsapp-bot`. Not deployed, not yet exercised against AiSensy itself. Needs the AiSensy template, campaign
and key before it sends anything (see "AiSensy setup").

## What it does

When an admin clicks **Confirm** on a meeting that the WhatsApp agent
created (`source_page === 'whatsapp'`), the person gets one WhatsApp message
in the same chat with the bot, from the bot number:

> Hi {{1}}, your Cocoma Digital discovery call is confirmed for {{2}}. Your reference is {{3}}. Google Meet: {{4}}. The same details are in your confirmation email. Reply here if you need to change the time.

| Variable | Value | When missing |
|---|---|---|
| `{{1}}` | the name given in the chat | "there" |
| `{{2}}` | confirmed time in the person's own zone, e.g. `Nov 07, 2026 · 3:30 PM (Asia/Kolkata)` | "the agreed time" |
| `{{3}}` | booking reference, read from the `[via WhatsApp · ref XXXXXXXX]` prefix on the notes | "in your email" |
| `{{4}}` | Google Meet link | "link to follow by email" (so the sentence reads "Google Meet: link to follow by email.") |

The confirmation **emails are unchanged** and still go out first. The
WhatsApp message is an addition, fire-and-forget, after the response is sent,
exactly like the emails.

## Who gets it

**Strictly meetings created by the WhatsApp agent.** Website bookings and
every other lead are never messaged, they did not opt in to WhatsApp. Decision
by Kirk, 2026-11-06. The guard is in the confirm handler
(`src/controllers/admin/meetingController.js`) and again inside the service.

Reject and reschedule do not message on WhatsApp yet. Each needs its own
approved template; add them the same way when wanted.

## Transport

AiSensy's API Campaign endpoint, `POST https://backend.aisensy.com/campaign/t1/api/v2`
(docs: https://wiki.aisensy.com/en/articles/11501889-api-reference-docs). The
bot number is a WhatsApp Business API number managed by AiSensy; nothing else
can send from it. The CRM's Twilio / Meta Cloud sender is a different number
and is not used.

Body sent (the key is read from env at send time and never logged):

```json
{
  "apiKey": "<AISENSY_API_KEY>",
  "campaignName": "<AISENSY_CONFIRM_CAMPAIGN>",
  "destination": "+919876543210",
  "userName": "Jessica Browning",
  "templateParams": ["Jessica Browning", "Nov 07, 2026 · 3:30 PM (Asia/Kolkata)", "RQR749BF", "https://meet.google.com/abc-defg-hij"],
  "source": "cocoma-api-confirm"
}
```

Rules the code enforces, because AiSensy or Meta reject the send otherwise:

- `templateParams` always has exactly four entries; empty slots get the fallback text above.
- Each parameter is flattened to one line, control characters and runs of whitespace removed, capped at 200 characters.
- `destination` is `+` plus the stored 10–15 digit number; anything else is skipped as `bad_phone`.
- Checked against AiSensy's API reference on 2026-11-06: a leading `+` on `destination` is their documented form (`+917428526285` in the field table) and is required for numbers outside India; `userName` is required (sent as the name); `source` is optional; the request is rejected when `templateParams` has the wrong count. Success is HTTP 200 with the body `{"success":"true","submitted_message_id":"<uuid>"}` (seen on the first proof send, 2026-11-06); "submitted" means AiSensy accepted it, delivery is WhatsApp's. The code checks the status only.
- Confirmations arrive outside WhatsApp's 24-hour free-text window, so the campaign must be on an **approved Utility template**; a free-text message would be refused by WhatsApp.

## Behaviour on failure

Never throws into the confirm handler. Every outcome is one log line:

```
[aisensy] confirm status=sent http=200 ref=RQR749BF meeting=6aed… to=919876543210
[aisensy] confirm status=skipped reason=not_configured ref=RQR749BF meeting=6aed…
[aisensy] confirm status=skipped reason=bad_phone ref=… meeting=…
[aisensy] confirm status=failed reason=rejected http=400 ref=… meeting=… to=… body="…"
[aisensy] confirm status=failed reason=timeout|network ref=… meeting=… to=… error="…"
```

`skipped` lines are `info`, `failed` lines are `error`. The response body
snippet is capped at 160 characters with the API key redacted if it ever
appears. The meeting stays confirmed and the emails still went out whatever
happens here; nobody retries automatically. If a send fails, the admin can
tell the person by email or from the team line.

Not configured (either env key blank) is a `skipped` line plus one `warn`
at first use, mirroring the Google Calendar service. Dev and tests therefore
never send.

## Environment

```
AISENSY_API_KEY=            Developer → API Campaign key (server env only, never git)
AISENSY_CONFIRM_CAMPAIGN=   name of the Live API campaign on the template
AISENSY_API_URL=            optional, default https://backend.aisensy.com/campaign/t1/api/v2
AISENSY_TIMEOUT_MS=         optional, default 10000
```

All four are in `.env.example` and must exist (blank) in `.env.local`: dotenv
falls through to `.env` for a missing key, and `.env` is production.

## AiSensy setup (Kirk, one time)

1. **Template**: Manage → Templates → new, category **Utility**, name
   `meeting_confirmed_v1`, language English, body exactly as in "What it
   does" with four variables. Sample values for Meta review: a name, a time
   string, an 8-character reference, a `https://meet.google.com/…` link.
   Submit; Meta usually approves Utility templates within minutes to a day.
2. **Campaign**: Campaigns → Launch campaign → **API campaign**, pick the
   approved template, name it (this name is `AISENSY_CONFIRM_CAMPAIGN`), set
   it **Live**.
3. **Key**: Developer → API Campaign key → generate. Share via 1Password only.
4. Give Anshu the two values for the server env.

## Verify

Tests, no network and no AiSensy account needed (`fetch` is stubbed):

```bash
~/.cocoma-dev/mongo/start.sh
cd app/api && node tests/aisensyNotify.test.js      # 34 tests: unit (no DB) + the real admin confirm route (needs mongod)
cd app/api && node tests/meetingFlow.test.js        # existing confirm flow unchanged
```

Manual, once the campaign is Live and the key is in the **server** env (not
dev): book through the WhatsApp agent from a real number, confirm in the
admin panel, the chat with the bot shows the template message within seconds
and `pm2 logs cocoma-api | grep aisensy` shows `status=sent`. In dev the
same action logs `status=skipped reason=not_configured`.

## Accepted risk

While AiSensy may not inject the sender's real number into `wa_from` (see the
`$MobileNumber` note in `wa-agent-gateway.md`), the number can be the one the
person typed. A wrong or hostile number means a stranger receives one utility
message. Accepted by Kirk for phase 1, 2026-11-06; one more reason the
recipients are WhatsApp bookings only.

## Files

```
src/services/aisensyNotify.js                 new: sendMeetingConfirmedWhatsapp, confirmPayload, helpers
src/controllers/admin/meetingController.js    +1 import, +source_page in meetingFields, +guarded call in confirm
.env.example                                  AISENSY_* block
tests/aisensyNotify.test.js                   new, 34 tests; fetch stubbed, nothing leaves the machine
docs/wa-agent-whatsapp-confirm.md             this file
```

## Changelog (newest first)

### 2026-11-06 (evening) — First real send

- Template `meeting_confirmed_v1` approved by Meta within the hour; API campaign `meeting_confirmed_v1_api` Live; key generated and placed in the dev `.env.local` for this test only.
- Proof send with curl from the terminal: HTTP 200, `{"success":"true","submitted_message_id":…}`, message received.
- End to end: WhatsApp booking ref `VMWP83E4` (typed-number fallback, see the gateway changelog) confirmed in the dev admin panel → `[aisensy] confirm status=sent http=200 ref=VMWP83E4 to=918655451464`, template received on the phone with name, `Nov 07, 2026 · 12:00 PM (Asia/Kolkata)`, the ref and "link to follow by email" (dev has no Google). Emails unchanged (both confirmed mails in Mailpit). No errors.

### 2026-11-06 — Tests, review fixes

- Reviewed the draft from the same day: the two env keys gate every send, the `source_page` guard is at the call site and in the service, the service never rejects, the key is never logged, the controller edit is one import + `source_page` in `meetingFields` + one guarded call. One fix: a `null` booking threw (a default parameter does not cover `null`); normalised at the top of `sendMeetingConfirmedWhatsapp`.
- New `tests/aisensyNotify.test.js`, 34 tests. Part 1 (no DB): both keys required, one-time warning, source guard, exact request body, `{{2}}` in the visitor's zone with the IST fallback, all four fallbacks, ref parsing, parameter cleaning and cap, bad phones, 10- and 15-digit numbers, non-200 / network / synchronous throw / timeout, key redaction in bodies and errors, no key in any log line. Part 2 (real admin confirm route): WhatsApp booking → one send with the ref and Meet link; website booking and legacy record → no call; keys blank → confirmed, skipped; AiSensy 500 or unreachable → still confirmed with both emails; unusable phone → skipped; already-confirmed and rejected meetings → no send.
- AiSensy field formats checked against their API reference (see "Transport"). No code change needed.
- `meetingFlow.test.js` 16/16, `waAgent.test.js` 117/117, existing suite 84/84 with the controller change.
- Doc example number changed to the gateway doc's example.

### 2026-11-06 — Template body changed before submission

- Meta rejects a template whose body begins or ends with a variable ("Leading or trailing parameters not allowed"). The first draft ended with `Join here: {{4}}`. New body, with a fixed closing sentence, in "What it does". The four variables and their order are unchanged, so the code's `templateParams` are unchanged.
- The `{{4}}` fallback is now "link to follow by email", so the sentence reads "Google Meet: link to follow by email." when the admin confirmed without Google configured. `NO_LINK_TEXT` in `src/services/aisensyNotify.js`; the tests read the constant.
