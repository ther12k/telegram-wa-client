# ADR 0005: Uploaded UI as Canonical Frontend

**Status:** Accepted  
**Date:** 2026-06-19

## Decision

The uploaded WhatsApp-inspired Telegram UI is the canonical frontend implementation. Product phases will bind real backend state into its existing components rather than maintaining a separate engineering UI.

## Consequences

- Visual regressions require explicit review.
- Demo behavior must be clearly separated from Telegram-backed behavior.
- Existing onboarding, messenger, panel, and state components become long-lived product surfaces.
- Shared typed contracts are required when replacing fixtures.
