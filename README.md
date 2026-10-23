# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two halves:

1. **A working API client** that proves the front end can talk to an API. It loads, creates and deletes notes using the [JSONPlaceholder](https://jsonplaceholder.typicode.com) practice API.
2. **Three design documents** the backend team will build the real QuickNotes service from: the API, the data model and the system architecture.

## Running the API client

No build step or install is needed. It is plain HTML, CSS and JavaScript.

1. Clone the repository:
```bash
   git clone https://github.com/smllborne/quicknotes-system-design.git
   cd quicknotes-system-design
```
2. Open `index.html` in a browser (double-click it), or serve the folder:
```bash
   python3 -m http.server 8000
   # then visit http://localhost:8000
```
3. Use it:
   - **Load notes** sends `GET /posts?_limit=10` and lists each note's title and body.
   - **Add note** (the form) validates the title (required, max 100 characters), then sends `POST /posts` with `{ title, body, userId: 1 }` and adds the new note to the top of the list.
   - **Delete** on any note sends `DELETE /posts/{id}` and removes it from the list when the server confirms.

> JSONPlaceholder is a fake API: it replies as if requests worked but does not store anything. Created notes all come back with id 101, and reloading brings back the original posts. `api.js` explains how the client handles this.

### Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure: load button, status line, note form, notes list |
| `style.css` | Layout and styling, with distinct success, error and loading messages |
| `api.js` | `request()` helper plus GET, POST and DELETE functions, validation, and loading / success / error / empty states |

## Design documents

- [API design](docs/api-design.md): the REST endpoints, request and response examples, and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, indexes and the SQL vs NoSQL decision
- [Architecture](docs/architecture.md): requirements, load estimates, diagram, components, request flows, trade-offs and single points of failure

## What I learned

- **A reusable `request()` function keeps API code clean.** Checking `response.ok` and throwing in one place means every GET, POST and DELETE handles errors the same way. Note that `fetch` does not throw on a 404 or 500 by itself, so the check is essential.
- **Every request needs loading, success, error and empty states, and a disabled button while it runs.** This stops double submits and tells the user what is happening. Using `try / catch / finally` makes sure the button is always re-enabled.
- **Never trust text from users or servers.** Inserting it with `textContent` instead of `innerHTML` prevents script injection.
- **A fake API changes how you design the client.** Because JSONPlaceholder does not store data (and returns the same id for every created note), I needed a local key for each note and had to treat the page as the source of truth.
- **System design starts with numbers.** Estimating 1 million users as about 46 reads and 9 writes per second (average) showed that the workload is modest, so the design focuses on availability and a path to scale instead of over-engineering.
- **Every layer needs a backup.** Load balancers, multiple app servers, a cache that can fail safely, a database with a replica and a queue with workers mean no single failure takes the service down.
- **Relational data suits SQL.** Users, notes, tags and a many-to-many junction table are a natural fit for PostgreSQL, with an index on `(user_id, created_at DESC)` serving the most common query.