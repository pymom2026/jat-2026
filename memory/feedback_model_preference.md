---
name: Always use cheapest model by default
description: Default to Haiku (cheapest); only recommend higher model if quality is demonstrably poor
type: feedback
---

Always use the cheapest available model (currently `claude-haiku-4-5`) for any Claude API call. Do not upgrade to Sonnet or Opus unless the user reports quality issues AND the use case clearly benefits from a more capable model.

**Why:** User burned through initial API credits because Opus was used by default for a simple classification task.

**How to apply:** Default to `claude-haiku-4-5` for all API calls in this project. If quality is bad, explain the tradeoff and let the user decide whether to upgrade.
