# LST Task Board

Read this before changing DrKard work that needs tracking.

The private LST board lives at `/lst` and `https://lst.drkard.com`. It is only accessible to `mousab.r@gmail.com`.

Rules:

- Every implementation task should be added to LST with a clear title.
- Use the task type tabs for filtering: Marketing, Content, Coding, Cloudflare, or Admin.
- Add tags for the real subject of the work. Use `coding` for implementation tasks.
- Keep the board item itself simple. Put description, subtasks, links, public URL, Cloudflare URL, done date, and notes inside the task details panel.
- The status columns are fixed: Backlog, Todo, In Progress, Testing, Done.
- Update the task when the work moves status, enters testing, or is completed.
- If the task affects production, add the public location and any Cloudflare dashboard or config location that helps find it later.

Data is stored in Cloudflare D1 table `lst_tasks` through `/api/admin/lst-tasks`.
