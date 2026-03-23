---
name: Gmail is strictly read-only
description: Never write, delete, modify, or label anything in Gmail
type: feedback
---

Never write to Gmail under any circumstances. The app only reads email metadata (From, Subject, Date) for scanning. Only use `gmail.users.messages.list` and `gmail.users.messages.get`.

**Why:** User was alarmed when "Clear Gmail" ran and explicitly stated they never want Gmail to be modified.

**How to apply:** Any feature that involves Gmail must be read-only. Never suggest or implement sending, deleting, labeling, archiving, or modifying emails in any way.
