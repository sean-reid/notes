# notes

A writing page at [notes.dwainosaur.com](https://notes.dwainosaur.com). You type, and once you are past three lines the older ones fade off the page. What you wrote is kept; you just cannot see it until you are done. The point is to keep going instead of re-reading. Finishing shows the whole note with copy and download as plain text, which pastes cleanly into Docs, Word, or Pages.

Notes live in your browser and nowhere else. There are no accounts and nothing is sent to a server. The list at /notes shows every note on this device by its first line; each note has its own /n/ address that only opens on the device that wrote it. From the finished view you can keep writing or delete the note, with one tap to confirm.

## Development

```sh
npm install
npm run dev        # build, then wrangler dev on http://localhost:8787
npm run dev:web    # vite with live reload, no Worker and no headers
npm test           # unit tests
npm run test:e2e   # Playwright against wrangler dev
npm run size       # fails past 16 KB of gzipped first-load JavaScript
```

`npm run dev` serves whatever is in `dist/` and does not rebuild on edits; use `dev:web` while changing the page and `dev` to check the result under the real headers.

## How it runs

One Cloudflare Worker serves the built files from `dist/` and answers `/api/health`. Everything else happens in the page: the text sits in a plain textarea that grows with its content, a paper-coloured veil covers all but the last three lines, and the page moves under a fixed frame so the line you are typing stays in place and there is nothing to scroll back through. Each keystroke updates a copy of the open note in localStorage; the note is written to IndexedDB 300ms after you stop typing and when the tab is hidden, and a draft left behind by a closed tab is written back on the next visit.
