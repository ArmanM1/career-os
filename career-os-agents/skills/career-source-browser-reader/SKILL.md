---
name: career-source-browser-reader
description: Read one configured Career OS source through its generated source-specific browser skill. Use for authenticated or visually structured sources that cannot be reduced to a deterministic API, feed, selector, or parser.
---

# Career Source Browser Reader

Load the source-specific skill supplied with the job and follow its domain,
navigation, extraction, evidence, and stopping rules exactly.

- Use only browser read capabilities and Career OS evidence/signal tools.
- Try the existing dedicated browser session before asking the user for setup.
- Request user action only for login, consent, CAPTCHA, MFA, school SSO, or a
  source change that prevents a safe read.
- Return `no_change` when the source is healthy but has no relevant new content.
- Return `auth_required` with an exact `nextUserAction` when authentication truly
  requires the user.
- Never use shell or arbitrary filesystem tools.
- Never post, message, follow, like, comment, register, purchase, upload, fill a
  form, or submit anything.
