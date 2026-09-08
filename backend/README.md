# Afia's World Shop — Backend

## Run on Windows

1. Open PowerShell in this `backend` folder.
2. If you copied an older project, delete the old `node_modules` folder first.
3. Install dependencies:

```powershell
npm install
```

4. Create `.env` from `.env.example` and fill in your SMTP/JWT settings.
5. Start the server:

```powershell
npm start
```

The site runs at `http://localhost:3000`.

## Admin

Default seeded admin:

- Email: `admin@afiasworld.local`
- Password: `ChangeMe123!`

Change the admin password before production use.

## Product images

Admin product images are uploaded to `backend/uploads/` and are served from `/uploads/...`.
The upload system uses an absolute project path, creates the upload directory automatically, accepts image files only, and limits files to 5 MB.

The ZIP intentionally does **not** include `node_modules` or `.env`. Run `npm install` on your own Windows machine so native dependencies are built for your Node.js/Windows environment.
