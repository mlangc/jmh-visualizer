# Scrollable Sidebar Plan

Make the sidebar easy to use with large result files, such as
`e2e/fixtures/linked-hash-vs-hash-multiple-benchmarks-{1-thread,2-threads,3-threads}.json`
(the same class with 64 results each, run with 1, 2 and 3 threads). Today the
sidebar is taller than the window, so its lower part stays out of reach until
the user scrolls to the bottom of the report, and nothing links a chart to its
checkboxes in the sidebar. This plan describes the change users will see. How
to build it is up to the implementer.

## Ground rules

- Work in a feature branch based on `main`. Merging it back into `main` is left
  to the maintainer.
- **Every commit message has a terse summary as its title and a reference to
  this plan as its body.** Nothing else goes into the body (see `CLAUDE.md`).

## Intended behaviour

### 1. The sidebar's list scrolls on its own

- The sidebar has two parts. Its header (the metric dropdown, the buttons below
  it, the divider and the section heading, e.g. "Benchmarks") stays fixed and
  never scrolls. Below it, the list of classes with their method and param
  checkboxes scrolls on its own when it doesn't fit, without scrolling the
  report. When it fits, nothing changes.
- The sidebar as a whole still stays in view while the page scrolls. The header
  and every entry of the list, down to the last checkbox, can be reached
  however far the report is scrolled. Resizing the window, or toggling methods
  and params so the report gets shorter or longer, doesn't break this.
- The list moves only when the user scrolls it or clicks a chart, never as the
  report scrolls.

### 2. Clicking a chart scrolls the sidebar to the matching method

- Clicking a benchmark in a chart scrolls the sidebar's list so that the
  method's block is centred vertically in it, as far as the list can scroll
  (a method near its start or end can't be centred). The block is the method's
  checkbox plus all of its nested param names and param-value checkboxes.
- Only the list moves. The click changes nothing else: no checkbox gets
  toggled, nothing gets highlighted, and hover tooltips and line highlighting
  work as before.
- Click targets show a pointer cursor:

| View | Click target | Scrolls to |
| --- | --- | --- |
| Single run (bar chart) | anywhere in a row: its bars, its Y-axis label or the space between | the row's method |
| Two runs (diff bar chart) | anywhere in a row, as above | the row's method |
| Multi run (line chart) | a legend entry | that line's method |
| Details screen | the same click targets as the view for that number of runs, in every metric chart | the method in the Details sidebar |

## Out of scope

- Scrolling the report when a sidebar entry is clicked (the class links already
  do that, and stay as they are).
- Click-to-scroll on the Summary screen, and any change to the Upload screen.

## Phases

Each phase starts once the previous one is committed.

### Phase 1: e2e tests first

- First, wrap the sidebar's list in the box that will later scroll, and give
  the box a CSS class. This changes nothing visible yet. The class is the hook
  the specs use to find the list's box, and the hook the later styling uses, so
  it isn't a test-only attribute. Add it to `e2e/CLAUDE.md`'s list of allowed
  non-semantic hooks.
- Add e2e specs for the behaviour above, following `e2e/CLAUDE.md`'s rules.
  Between them, they cover every view in the table. Use the large fixtures
  above, which were committed together with this plan: one of them for the
  single-run view, two or all three for the other views. Their sidebars
  overflow the suite's window in every view, the Details screen included. The
  bundled examples ("Load Single Run Example", "Load Two Runs Example", "Load
  Multi Run Example") are fine wherever a spec doesn't need an overflowing
  list.
- Tag the specs and switch them with a new flag,
  `INCLUDE_SCROLLING_ENHANCEMENTS`, which works like `INCLUDE_FILTERS` except
  that it **defaults to off** for now, since no build has the feature yet.
  Update `e2e/CLAUDE.md` wherever it describes flags, their defaults or the
  fixtures.
- Run the suite against a fresh build of this branch. With the flag off,
  everything passes. With it on, the new specs fail because the behaviour is
  missing, not because a test is broken.
- Commit, then have a subagent review the specs (see `CLAUDE.md`'s "Agentic
  Reviews"). The review will most likely lead to a second commit.

### Phase 2: implementation

- Implement the behaviour. Don't bend the Phase 1 specs to make them pass. If
  one turns out to be wrong, fix it in a separate commit and point it out in
  Phase 3.
- Once the specs pass, make the flag **default to on** and update
  `e2e/CLAUDE.md` to match. `npm run build-and-check-all` passes.

### Phase 3: final review

- Have a subagent review every change on the branch, including the Phase 1
  specs, now that they run against the real implementation. Address its
  findings.
