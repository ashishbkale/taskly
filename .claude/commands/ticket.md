Work on Jira ticket $ARGUMENTS end to end:

1. Read the ticket from Jira, including its acceptance criteria and definition of done.
2. Move the ticket to In Progress.
3. Create a branch named `$ARGUMENTS-<short-description>` from an up-to-date main.
4. Implement it in TypeScript, following the existing code style.
5. Add or update Vitest tests covering every acceptance criterion.
6. Run `npm run lint`, `npm run build` and `npm test`, and fix anything that fails.
7. Commit with a message starting with `$ARGUMENTS`, then push the branch.
8. Open a pull request titled `$ARGUMENTS: <ticket summary>` that lists the acceptance criteria as a checklist.
9. Add a comment on the Jira ticket with the PR link and move the ticket to In Review.

Do not merge the PR. I will review and merge it myself.
