# Moviez Zone — Responsive All-Devices Version

This package is designed for **mobile phones, tablets, laptops and desktop PCs** with responsive breakpoints.

## Features
- Moviez Zone cinematic responsive UI
- Welcome hero + search
- Top 10 Most Viewed (real view count)
- Trending and genre filtering
- Sign up / login
- Mobile menu on small screens
- Responsive movie cards and movie player
- Quality-aware playback: 480p / 720p / 1080p / 4K files can be uploaded separately
- Download button for the selected quality
- Real server-side roles:
  - `admin`: upload + manage user permissions
  - `uploader`: upload videos
  - `user`: watch/search only
- Admin can promote/demote users to Uploader
- Uploader cannot manage permissions
- Upload API is protected server-side

## Run
1. Install Node.js.
2. Extract this ZIP.
3. Open a terminal in the extracted folder.
4. Run `npm install`
5. Run `npm start`
6. Open `http://localhost:3000`

## Demo admin
Email: `admin@moviezzone.local`
Password: `Admin@12345`

For production:
- Change the demo admin password.
- Set a strong random `JWT_SECRET` environment variable.
- Put the site behind HTTPS.
- Configure proper file storage and backups.

Only upload/distribute content you are authorized to distribute.


## GitHub mobile upload
Upload these files directly into the repository root:
`package.json`, `server.js`, `index.html`, `style.css`, `app.js`, `README.md`, `.gitignore`.

You do NOT need to create a `public` folder for this GitHub-ready version.
