# StreamTweet frontend

The frontend is built with Next.js App Router and React. Its cinematic, creator-first
interface is inspired by the shared streaming-app reference while retaining the
existing StreamTweet API workflows.

## Run locally

1. Start the backend with the repository's root `npm run dev` command.
2. In another terminal, run:

   ```sh
   API_TARGET=http://127.0.0.1:8000 npm --prefix frontend run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173).

The Next.js rewrite proxies `/api/*` to `API_TARGET` (default
`http://127.0.0.1:8000`), so frontend requests remain same-origin. Set
`API_TARGET` when the backend uses another HTTP or HTTPS origin.

## API-backed screens

- Accounts: register, login, logout, token refresh, current user, channel lookup
  with creator videos, playlists, and recent tweets, watch history, profile
  details, password, and avatar updates.
- Videos: upload, list/search/sort, details and playback, comments, likes, edit,
  publication status, and delete.
- Updates: create, list, edit, delete, and like.
- Comments: list, create, edit, delete, and like.
- Likes and history: liked videos and watch history.
- Playlists: create, list, edit, and delete playlists, then add or remove your
  videos from each collection.

The interface calls the existing `/api/v1` endpoints and surfaces API errors
instead of presenting failed requests as successful. Cloudinary behavior remains
owned by the backend.

## Render

The repository-level `render.yaml` deploys this app as a Node web service and
provides the API service hostname through `API_HOST`; the Next.js config adds
HTTPS automatically. Use the Render Blueprint instructions in the root README
to deploy both services together. The production start command uses Render's
assigned `PORT`, with port `5173` as the local fallback.
