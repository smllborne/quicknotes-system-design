// QuickNotes API client (prototype)
// Talks to the JSONPlaceholder practice API. The real QuickNotes backend is
// specified in docs/api-design.md.

const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;

// ---------- DOM references ----------
const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const notesList = document.getElementById("notes-list");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");

// ---------- Local state ----------
// The list the user sees. Each entry: { key, id, title, body }.
// `key` is a purely local identifier used to find the right <li>.
let notes = [];
let nextKey = 1;

// ---------- Status helpers ----------
// kind is one of: "loading", "success", "error", or "" (clear).
// textContent only: never innerHTML, so user/server text cannot inject markup.
function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = kind || "";
}

// ---------- Reusable request helper ----------
// Wraps fetch, checks response.ok and throws on HTTP errors.
// Returns { status, data } so callers can show the status code.
async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error("Request failed with status " + response.status);
    error.status = response.status;
    throw error;
  }

  // DELETE on JSONPlaceholder returns "{}"; guard against empty bodies anyway.
  let data = null;
  const text = await response.text();
  if (text) {
    data = JSON.parse(text);
  }
  return { status: response.status, data: data };
}

// Turn technical errors into friendly messages.
function friendlyError(error, action) {
  if (error instanceof TypeError) {
    return "Could not " + action + ". Check your internet connection and try again.";
  }
  if (error.status >= 500) {
    return "The server had a problem while trying to " + action + ". Please try again later.";
  }
  if (error.status === 404) {
    return "Could not " + action + ": that note was not found on the server.";
  }
  return "Could not " + action + " (error " + (error.status || "unknown") + "). Please try again.";
}

// ---------- GET: load 10 notes ----------
async function getNotes() {
  const result = await request(API_URL + "?_limit=10");
  return result.data;
}

async function handleLoad() {
  loadBtn.disabled = true;
  setStatus("Loading notes...", "loading");

  try {
    const fetched = await getNotes();
    notes = fetched.map(function (post) {
      return { key: nextKey++, id: post.id, title: post.title, body: post.body };
    });
    renderNotes();

    if (notes.length === 0) {
      setStatus("", "");
    } else {
      setStatus("Loaded " + notes.length + " notes from the server.", "success");
    }
  } catch (error) {
    setStatus(friendlyError(error, "load your notes"), "error");
  } finally {
    loadBtn.disabled = false;
  }
}

// ---------- POST: create a note ----------
async function createNote(note) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(note),
  });
}

// Returns an error message, or "" when the title is valid.
function validateTitle(title) {
  if (title.length === 0) {
    return "Please enter a title for your note.";
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return "The title is too long (" + title.length + " characters). The maximum is " + MAX_TITLE_LENGTH + ".";
  }
  return "";
}

async function handleSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem) {
    setStatus(problem, "error");
    titleInput.focus();
    return;
  }

  submitBtn.disabled = true;
  setStatus("Saving note...", "loading");

  try {
    const result = await createNote({ title: title, body: body, userId: 1 });
    const created = result.data;

    // Newest note goes to the top of the list.
    notes.unshift({ key: nextKey++, id: created.id, title: created.title, body: created.body });
    renderNotes();

    setStatus("Note created (status " + result.status + ", id " + created.id + ").", "success");
    noteForm.reset();
  } catch (error) {
    setStatus(friendlyError(error, "create the note"), "error");
  } finally {
    submitBtn.disabled = false;
  }
}
// ---------- Rendering ----------
function renderNotes() {
  notesList.textContent = ""; // clears the list safely

  // Empty state: a message shown inside the list.
  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No notes yet. Click \"Load notes\" or add one above.";
    notesList.appendChild(empty);
    return;
  }

  notes.forEach(function (note) {
    const li = document.createElement("li");
    li.className = "note";
    li.dataset.key = String(note.key);

    const content = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "note-title";
    title.textContent = note.title;

    const body = document.createElement("p");
    body.className = "note-body";
    body.textContent = note.body || "";

    content.appendChild(title);
    if (note.body) {
      content.appendChild(body);
    }

    li.appendChild(content);
    notesList.appendChild(li);
  });
}

// ---------- Wire everything up ----------
loadBtn.addEventListener("click", handleLoad);
renderNotes(); // show the empty state on first load
noteForm.addEventListener("submit", handleSubmit)