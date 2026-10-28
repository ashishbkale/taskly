---
description: Build, test and review a UI feature end to end
argument-hint: <feature description>
---

Feature request: $ARGUMENTS

Work in this order:

1. Use the component-builder agent to build the feature. State requirements, not specific class names. Have it run `npx tsc -b`.
2. Use the test-writer agent to write tests, including edge cases, empty states and focus behavior. All tests must pass.
3. Use the ui-reviewer agent to review the result.
4. If the reviewer reports High or Medium issues, send them back to component-builder as requirements to meet, then repeat steps 2 and 3. Stop after 2 fix rounds.
5. Finish with a short summary: what was built, test results, and any remaining Low issues. Do not claim anything passes unless you ran the check.