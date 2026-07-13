# Security review notes

## Reviewed dependency advisory

`npm audit` currently reports the PostCSS advisory `GHSA-qx2v-qp2m-jg93` through Next.js 16.2.10, whose package manifest pins PostCSS 8.4.31. The accepted build plan pins Next.js 16.2.10. npm's automated `--force` remediation proposes downgrading Next.js to 9.3.3, which is incompatible with this application and would remove current security and framework behavior.

Risk treatment for the first-user release:

- Keep Next.js at the accepted 16.2.10 release.
- Do not expose a feature that accepts untrusted user CSS and serializes it into a `<style>` block.
- Keep the audit visible in local output and fail CI on high/critical advisories.
- Re-evaluate and remove this exception as soon as the accepted Next.js line no longer pins the affected PostCSS version.

This is a reviewed moderate advisory, not a silently ignored production finding.
