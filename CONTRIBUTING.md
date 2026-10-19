# Contributing to devflow

Thanks for helping. The most valuable contributions are concrete: a real case where devflow did the wrong thing, turned into something we can test.

## Reporting a bad review

A review that flagged something that wasn't real, or missed something that was, is the best bug report this project can get. Use the **Review was wrong** issue template and include:

- the finding (or the defect it missed) and why it was wrong,
- the smallest diff that reproduces it, if you can share one.

Each of these can become an eval case under `evals/`, so the mistake never comes back.

## Working on devflow

```bash
git clone https://github.com/robo311/devflow
claude --plugin-dir ./devflow        # try your changes in a session
claude plugin validate ./devflow     # manifests, skills, agents, the mod
claude plugin test ./devflow         # the mod's tests
claude plugin eval ./devflow --scaffold --allow-tools Write Edit Bash --runs 1 --ablation none
```

Evals run real model calls and count against your usage; run the cases you touched with `--case '<name>'`.

Guidelines:

- **Skills and agents are behaviour, not prose.** Change them when you can show a case that goes wrong, and add or update an eval that shows the fix.
- **Keep the plugin general.** Project-specific rules belong in the user's `CLAUDE.md` or project skills, not here.
- **Stay honest.** No invented numbers in docs; example output is labelled as an example.

## Releasing

Claude Code offers users an update when `version` in `.claude-plugin/plugin.json` changes.

1. Bump `version` in `.claude-plugin/plugin.json` and add an entry to `CHANGELOG.md`.
2. `claude plugin validate .`, then commit and push to `main`.
3. `claude plugin tag .` creates the `devflow--v<version>` tag; push it with `git push --tags`.
4. Create the GitHub release from that tag with the changelog entry.

Users then get it with `/plugin marketplace update devflow` and `/plugin update devflow@devflow`.
