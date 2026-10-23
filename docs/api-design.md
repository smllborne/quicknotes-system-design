# QuickNotes API Design

This is the REST API the backend team should build for the real QuickNotes service. It is **not** JSONPlaceholder; the prototype client in this repo only uses JSONPlaceholder to prove the front end can talk to an API.

## Conventions

- **Base URL:** `https://api.quicknotes.example/v1`
- **Format:** JSON requests and responses (`Content-Type: application/json`)
- **Auth:** `Authorization: Bearer <access_token>` on every endpoint except register and login
- **IDs:** UUIDs (strings), so they are safe to expose and hard to guess
- **Timestamps:** ISO 8601 in UTC, e.g. `2026-10-23T05:19:00Z`
- **Ownership:** a user can only see and change their own notes. All `/notes` queries are scoped to the authenticated user.
- **Pagination:** cursor-based (`?limit=20&cursor=...`), because offset pagination gets slow with millions of rows.

## Endpoint table

| # | Method | Path | Description | Success status |
|---|--------|------|-------------|----------------|
| 1 | POST | `/auth/register` | Create a new user account | 201 Created |
| 2 | POST | `/auth/login` | Log in and receive an access token | 200 OK |
| 3 | GET | `/notes` | List the current user's notes (paginated, filter by `tag`, search with `q`) | 200 OK |
| 4 | POST | `/notes` | Create a note | 201 Created |
| 5 | GET | `/notes/{id}` | Get one note | 200 OK |
| 6 | PUT | `/notes/{id}` | Replace a note's title, body and tags | 200 OK |
| 7 | PATCH | `/notes/{id}` | Partially update a note (e.g. only the title) | 200 OK |
| 8 | DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| 9 | GET | `/tags` | List the current user's tags | 200 OK |
| 10 | POST | `/notes/{id}/tags` | Attach a tag to a note (creates the tag if new) | 200 OK |
| 11 | DELETE | `/notes/{id}/tags/{tagId}` | Remove a tag from a note | 204 No Content |

### Query parameters for `GET /notes`

| Parameter | Example | Meaning |
|-----------|---------|---------|
| `limit` | `20` | Page size (default 20, max 100) |
| `cursor` | `eyJjIjoiMjAyNi0xMC0y...` | Opaque cursor from the previous page's `next_cursor` |
| `tag` | `work` | Only notes with this tag |
| `q` | `groceries` | Search in title and body |

## Request and response examples

### Create a note: `POST /notes`

**Request**

```http
POST /v1/notes HTTP/1.1
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json
```

```json
{
  "title": "Buy groceries",
  "body": "Milk, eggs, sukuma wiki",
  "tags": ["personal", "errands"]
}
```

Rules: `title` is required, 1 to 100 characters. `body` is optional (max 10,000 characters). `tags` is optional (max 10, each max 30 characters).

**Response: `201 Created`**

```http
Location: /v1/notes/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "title": "Buy groceries",
  "body": "Milk, eggs, sukuma wiki",
  "tags": ["personal", "errands"],
  "created_at": "2026-10-23T05:19:00Z",
  "updated_at": "2026-10-23T05:19:00Z"
}
```

### List notes: `GET /notes?limit=2&tag=personal`

**Response: `200 OK`**

```json
{
  "data": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "title": "Buy groceries",
      "body": "Milk, eggs, sukuma wiki",
      "tags": ["personal", "errands"],
      "created_at": "2026-10-23T05:19:00Z",
      "updated_at": "2026-10-23T05:19:00Z"
    },
    {
      "id": "0b8f2a64-5c1d-4e0b-9a77-3f2d8c1e9a10",
      "title": "Call Mama",
      "body": "",
      "tags": ["personal"],
      "created_at": "2026-10-22T18:02:11Z",
      "updated_at": "2026-10-22T18:02:11Z"
    }
  ],
  "next_cursor": "eyJjIjoiMjAyNi0xMC0yMlQxODowMjoxMVoifQ",
  "has_more": true
}
```

### Register: `POST /auth/register`

```json
{ "email": "hesborn@example.com", "password": "a-long-passphrase", "display_name": "Hesborn" }
```

Response `201 Created`:

```json
{ "id": "a3d1c5e2-9f44-4b1a-8c2e-6d7f0b9e1234", "email": "hesborn@example.com", "display_name": "Hesborn" }
```

### Login: `POST /auth/login`

```json
{ "email": "hesborn@example.com", "password": "a-long-passphrase" }
```

Response `200 OK`:

```json
{ "access_token": "eyJhbGciOi...", "token_type": "Bearer", "expires_in": 3600 }
```

### Delete a note: `DELETE /notes/{id}`

Response `204 No Content` (empty body). Deleting the same note again returns `404`, so clients should treat a `404` after a retry as "already gone".

## Error codes

Every error uses the same body shape so clients can handle errors in one place.

| Status | Name | When it is returned |
|--------|------|---------------------|
| 400 | Bad Request | Malformed JSON, missing required field, title longer than 100 characters, invalid cursor |
| 401 | Unauthorized | Missing, expired or invalid access token; wrong login credentials |
| 403 | Forbidden | Token is valid but the user may not do this (e.g. touching another user's note) |
| 404 | Not Found | The note or tag does not exist (or belongs to someone else; see note below) |
| 409 | Conflict | Registering an email that already exists |
| 422 | Unprocessable Entity | Well-formed JSON that fails business rules (e.g. more than 10 tags) |
| 429 | Too Many Requests | Rate limit exceeded; includes a `Retry-After` header |
| 500 | Internal Server Error | Unexpected server failure |
| 503 | Service Unavailable | Temporarily overloaded or in maintenance; includes `Retry-After` |

**Error body example (`400 Bad Request`):**

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request body is invalid.",
    "details": [
      { "field": "title", "issue": "Must be between 1 and 100 characters." }
    ],
    "request_id": "req_8f3a1c92"
  }
}
```

**Error body example (`401 Unauthorized`):**

```json
{
  "error": {
    "code": "invalid_token",
    "message": "Your session has expired. Please log in again.",
    "request_id": "req_2b7d40e1"
  }
}
```

> **403 vs 404 for other users' notes:** to avoid leaking which note IDs exist, `GET/PUT/PATCH/DELETE /notes/{id}` for a note owned by someone else returns `404`. `403` is used for permission rules that do not reveal existence (for example, a suspended account or a future "read-only" shared note).

## Design decisions

- **Plural nouns, no verbs in paths** (`/notes`, not `/createNote`); the HTTP method carries the action.
- **POST returns 201 plus a `Location` header** so the client knows where the new resource lives.
- **DELETE is idempotent in effect**: the end state is the same however many times it is called.
- **Versioned in the path (`/v1`)** so breaking changes can ship as `/v2` without breaking old clients.
- **Rate limiting** per user and per IP protects the service from abuse and runaway clients.