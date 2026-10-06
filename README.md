# StreamTweet
A hybrid social media platform that fuses YouTube’s video‑sharing ecosystem with Twitter’s real‑time micro‑updates. It enables users to post short video clips alongside instant text updates, creating a dynamic space for fast, engaging, and viral conversations.

## Local build

From the repository root, run `npm run dev` to start both the API and Next.js
frontend for local development. The API is available on port `8000` and the
frontend on port `5173`. Use `npm run dev:api` or `npm run dev:web` to start
either service by itself. Run `npm run build` to build the frontend.

The API service on port `8000` does not serve the old static social UI anymore.
Use the Next.js frontend on port `5173` for the new StreamTweet experience.

## Deploy to Render

This repository includes a Render Blueprint at [`render.yaml`](./render.yaml)
that creates two web services: the Express API and the Next.js frontend. From
the Render dashboard, choose **New → Blueprint**, connect this repository, and
deploy the Blueprint. The frontend's `/api/*` rewrite uses the API service's
Render hostname automatically.

Before deploying, have these values ready to enter in the API service's
environment:

- `MONGODB_URL`: MongoDB connection URI without a database path or trailing
  slash. The API appends the `StreamTweet` database name itself. Ensure the
  MongoDB network access settings allow connections from Render.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`:
  your Cloudinary credentials.

The Blueprint generates separate access and refresh token secrets. It also
sets token expirations and Node.js version. Never commit `.env` or paste
credentials into source files. User media is uploaded to Cloudinary; Render's
local filesystem is ephemeral.

After deployment, open the frontend service URL. Free Render web services can
sleep while idle and may take a little while to respond to the first request.
