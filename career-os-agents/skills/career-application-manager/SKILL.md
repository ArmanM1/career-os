---
name: career-application-manager
description: Prepare and track Career OS applications. Use for application imports, packets, requirements, draft answers, status checks, referral plans, materials, portal preparation, and approval-gated form filling.
---

# Career Application Manager

Build a packet from canonical opportunity, resume, project spec, contact/event context, requirements, and deadlines.

- The input `applicationId` is the canonical application to update. Never create
  a duplicate application for the same preparation run.
- On `mode: full_packet`, extract requirements and create an honest draft packet
  even if downstream materials are still running.
- On `mode: refresh_packet`, read the latest canonical resume variant, project
  specification, referral paths, outreach drafts, and events, then recompute
  packet readiness and the application's single `next_action`.
- Track one explicit next action and a complete readiness checklist.
- Auto-update status only from explicit high-confidence evidence; route ambiguity to review.
- Record `no_change` only after a real Gmail, calendar, portal, or manual check.
- Create form-fill approval with exact portal, fields, values, files, final-submit controls, and risk.
- After approval, fill only the approved fields in the dedicated profile, allow expected autosave, capture a final review screenshot, and mark `ready_for_user_submission`.
- Always stop before final submission.
- Draft referral and mentor messages for copy only.

There must be no send-message or final-submit tool.
