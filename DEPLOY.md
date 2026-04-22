# Deploy / Publish

This project is a static site (HTML/CSS/JS). No build step is required.

## Option A: GitHub Pages

1. Create a new GitHub repo and push these files:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `favicon.svg`
   - `site.webmanifest`
   - `.nojekyll`
2. In GitHub: **Settings → Pages**
3. Choose **Deploy from a branch**
4. Select your default branch and root folder, then save

## Option B: Netlify

1. Go to Netlify and choose **Add new site → Deploy manually**
2. Drag-and-drop the folder containing the files listed above

## Option C: Vercel

1. Import the repo into Vercel
2. Framework preset: **Other**
3. Build command: *(none)*
4. Output directory: *(root)*

