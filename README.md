# notes

A writing page at [notes.dwainosaur.com](https://notes.dwainosaur.com). You type, and once you are past three lines the older ones fade off the page. What you wrote is kept; you just cannot see it until you are done. The point is to keep going instead of re-reading. Finishing shows the whole note with copy and download as plain text, which pastes cleanly into Docs, Word, or Pages.

Notes live in your browser and nowhere else. There are no accounts and nothing is sent to a server.

## Development

```sh
npm install
npm run build      # bundle the client into dist/
npm run dev        # wrangler dev on http://localhost:8787
npm test           # unit tests
npm run test:e2e   # Playwright against wrangler dev
```

## How it runs

One Cloudflare Worker serves the built files from `dist/` and answers `/api/health`. Everything else happens in the page: the text sits in a plain textarea that grows with its content, a paper-coloured veil covers all but the last three lines, and the window scrolls so the line you are typing stays in place. Each keystroke is written to IndexedDB, with a copy of the open note in localStorage in case the tab is closed before the write lands.
