# State Machine Round-Trip Specialist Review Checklist

Scope: When SCOPE_STATE_MACHINE=true (`gstack-state-matrix detect`: the diff adds or changes a proposal, hold or approval state machine)
Output: one matrix record per state machine, then one finding per gap, each a JSON object on its own line.

Matrix record (not a finding; the parent checks it with `gstack-state-matrix check`):
{"specialist":"state-machines","matrix":{"machine":"name (path)","kinds":["kind",...],"actions":["accept","drop",...],"cells":[{"kind":"kind","action":"accept","row":"the resulting rows after the action","test":"path/to/test:LINE"}]}}
Use `"test":null` for a cell no test covers.

Finding schema:
{"severity":"CRITICAL","confidence":N,"path":"file","line":N,"category":"state-matrix","summary":"untested cell: <kind> × <action> → <row>","fix":"...","fingerprint":"path:state-matrix:<kind>:<action>","specialist":"state-machines","cell":{"kind":"<kind>","action":"<action>"}}
Optional: test_stub, evidence.
If the diff adds or changes no proposal, hold or approval state machine: output `NO FINDINGS` and nothing else.

---

## Why this specialist exists

A change that passed a full gate deleted user data: accepting a "deactivate" or a
same-claim "replace" proposal went down the "remove" path, because only remove was
tested. Kinds that share a branch look covered when one of them is. This review
writes down every kind × owner action, the row each one must leave, and the test
that proves it, so the untested cells are named before merge.

## Build the matrix

1. **Find the machine.** A record with a kind (type, enum, tag) and a pending
   status that an owner action settles: proposals, holds, approvals, moderation or
   review queues, invitations. Read the code after the diff, not only the hunks.
2. **List every kind** the settle path handles after the diff: the type or enum,
   each `case`, each dispatch-table key. A `case` that falls through to a sibling
   is its own kind. Include kinds the diff did not add when the diff changed the
   shared path.
3. **List every owner action** that settles a pending record: accept or approve,
   drop or reject, and any other (expire, withdraw, release, hold).
4. **Write the resulting row for each kind × action** from the kind's meaning, as
   the owner expects it, not from what the code does: the target record (deleted,
   kept, deactivated, rewritten) and the proposal's own status. Deactivate keeps
   the record with its flag off; a same-claim replace keeps it; only remove
   deletes; a drop leaves the target untouched.
5. **Map each cell to a test** that exercises exactly that kind and action and
   asserts the resulting row, as `path:line` in this checkout. A test of a sibling
   kind, a test that checks only the status field, or a test that mocks the store
   does not cover the cell. Use `null` when nothing covers it. Never invent a path.

## Findings

- **Untested cell (CRITICAL; this rule's High tier).** One finding per cell with
  `"test":null`, carrying `cell`, the expected row in `summary` and a
  `test_stub` that settles a pending record of that kind and asserts the row.
- **Wrong row (CRITICAL).** When the code leaves a different row than step 4's
  (for example a deactivate that deletes), report it as its own finding with the
  same `cell` and the line that takes the wrong path.
- **Collapsed kinds (CRITICAL).** A branch that sends several kinds down one
  destructive path is a finding at that line, even when a test covers one kind.

## Never

- Never mark a cell covered because a sibling kind's test passes through the same
  function.
- Never drop a kind or action from the lists to shrink the matrix.
- Never output prose; the parent parses JSON lines only.
