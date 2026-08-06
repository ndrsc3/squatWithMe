# /backlog — Session Brief & Task Triage

Use this command at the start of a session to orient on current work.

## Steps

1. **Read `docs/TASKS.md`** — load the full task board.

2. **Print a Session Brief** in this format:

```
## Session Brief — [today's date]

### P1 Blockers
[list all P1 tasks with their current status]

### P2 In-Progress & Next Up
[list [~] in-progress items first, then [ ] todo items]

### Recently Done
[last 3–5 items in the Done section]
```

3. **Ask:** "What are we working on today?"

4. **If the user names a feature**, grep `docs/TASKS.md` for matching tags and surface all related tasks before touching any code.

## Session End

When wrapping up a session, update `docs/TASKS.md`:
- Mark completed tasks `[x]`
- Change started-but-not-finished tasks to `[~]`
- Move newly completed items to the Done section
- Update the `_Last touched:` date at the top
