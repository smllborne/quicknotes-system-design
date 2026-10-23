// QuickNotes API client (prototype)
// Talks to the JSONPlaceholder practice API. The real QuickNotes backend is
// specified in docs/api-design.md.

const API_URL = "https://jsonplaceholder.typicode.com/posts";

// ---------- DOM references ----------
const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const notesList = document.getElementById("notes-list");

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