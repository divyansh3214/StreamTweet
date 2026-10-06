# StreamTweet frontend

This standalone frontend lives in `frontend/` and uses only Node.js built-ins.
The development server proxies requests under `/api/` to the Express API, so
browser requests stay same-origin. Minimal backend integration fixes align
existing imports, authentication context, and handler contracts with the
frontend; they do not replace the API or change its database configuration.

## Run locally

1. Start the backend using the repository's existing start command.
2. In another terminal, run `API_TARGET=http://127.0.0.1:8000 npm --prefix frontend run dev`.
3. Open `http://localhost:5173`.

The proxy defaults to `http://127.0.0.1:3000`. This repository's current
backend configuration listens on port `8000`, so start the frontend with
`API_TARGET=http://127.0.0.1:8000 npm --prefix frontend run dev`. Set
`API_TARGET` when the API uses another origin and `FRONTEND_PORT` to change the
frontend port.

## API-backed screens

- Account: `POST /users/register`, `/users/login`, `/users/logout`,
  `/users/refresh-token`; `GET /users/get-current-user`,
  `/users/channel-profile/:username`, `/users/watch-history`; and
  `PUT /users/change-password`, `/users/update-other-details`,
  `/users/update-avatar`.
- Videos: `POST /videos/upload-video`; `GET /videos/get-all-videos` and
  `/videos/get-video/:videoid`; `PUT /videos/update-video/:videoid` and
  `/videos/toggle-publish-status/:videoid`; `DELETE /videos/delete-video/:videoid`.
- Updates: `POST /tweets/create-tweet`, `GET /tweets/get-user-tweets`,
  `PUT /tweets/update-tweet/:tweetid`, `DELETE /tweets/delete-tweet/:tweetid`.
- Comments: `GET /comments/get-video-comments/:videoid`,
  `POST /comments/add-comment/:videoid`, `PUT /comments/update-comment/:commentid`,
  `DELETE /comments/delete-comment/:commentid`.
- Likes: `POST /likes/toggle-video-like/:videoid`,
  `/likes/toggle-comment-like/:commentid`, `/likes/toggle-tweet-like/:tweetid`;
  `GET /likes/get-all-liked-videos`.

The frontend calls these `/api/v1` endpoints and displays the API's error
message if a request fails. It does not fabricate successful API results.
