DayMark v1.1 - GitHub Pages deployment package

Upload the following files to the root of the existing GitHub repository:
- index.html
- style.css
- script.js
- .nojekyll

Repository Pages settings:
Source: Deploy from a branch
Branch: main
Folder: / (root)

Important:
- This package keeps the existing localStorage keys used by the current DayMark site, so existing users on the same GitHub Pages origin can keep their saved schedules after the code update.
- Do not change the repository name or Pages URL if you want users to continue using the same browser-stored data on the same origin.
