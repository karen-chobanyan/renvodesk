# Project tasks and weekly schedule

Tasks are saved in `project_tasks`, linked to projects by a composite organization /
project foreign key. Owners create, edit and delete; members can read. Identity and
creation timestamps are immutable. Updates increment a revision and match the loaded
revision; deletes also match it. Creation retains a UUID for lost-response recovery.

Titles are required (160 characters maximum), notes are optional (2,000 characters),
and statuses are `todo`, `in_progress`, `done`. Start and due dates are optional SQL
calendar dates, limited to 1900–2100; if both are present, start must not exceed due.
No times, timezone conversions, assignees, dependencies, notifications, recurrence or
Gantt planning are implemented. Browser-local today determines overdue indicators;
UTC arithmetic/formatting preserves date-only values across daylight saving changes.

Project pages contain the editor/list. `/workspace/:organizationId/schedule` shows
the selected company's Monday–Sunday week. A range occupies every inclusive day;
a single date occupies only that day. Overdue means unfinished with due date before
today. Undated means unfinished with neither date. Done tasks remain visible in dated
weeks and project lists, but disappear from overdue/undated queues.

Queries are organization-scoped and filter dates/status on the server before paging
50 rows at a time. Load more is explicit; loaded counts are not total company counts.
The schedule embeds project names in one query. Refresh is explicit; no realtime or
offline support is claimed. Edits are memory-only until saved; reload on a revision
conflict discards unsaved fields after an explicit user action. Deletion is permanent
and requires confirmation. Failed deletion requires refresh before another attempt.

The register's fictional task examples are replaced by a link to the live schedule.
Financial/sketch previews remain explicitly demo content. This supersedes the task
preview portion of decision 007. Database checks use rollback fixtures; browser tests
mock APIs and do not establish database authorization.
