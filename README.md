# SiteClock Pro (Independent Version)

Construction site attendance & payroll system — **no Base44 dependency**.

## What this is

A complete rewrite of your Base44 app so it runs on your own computer and can be hosted anywhere.

### Features already working
- Admin login (email + password)
- Worker clock in / out (Worker ID + PIN + GPS)
- Dashboard with today's attendance
- Database with Workers, Sites, Admins, AttendanceRecords
- Seed data so you can test immediately

### Still to be fully ported (we will do next)
- Full worker management UI
- Attendance reports & payroll export
- QR code scanning
- Selfie capture
- Geofence radius checking
- Offline queue
- Multi-site switching
- Admin management
- Map view

---

## How to run on your computer (Visual Studio Code)

### 1. Install Node.js (if you don't have it)
Go to https://nodejs.org and install the **LTS** version.

### 2. Open the project
1. Download / copy the `siteclock-pro` folder to your computer
2. Open **Visual Studio Code**
3. File → Open Folder → select the `siteclock-pro` folder

### 3. Install packages
Open the terminal in VS Code (`Ctrl + `` ` or Terminal → New Terminal`) and run:

```bash
npm install
```

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Start the app

```bash
npm run dev
```

Then open your browser at: **http://localhost:3000**

---

## Login details (after seeding)

**Admin**
- Email: `admin@siteclock.local`
- Password: `admin123`

**Demo Worker**
- Worker ID: `W001`
- PIN: `1234`

---

## Project structure

```
siteclock-pro/
├── prisma/
│   ├── schema.prisma      ← Database models
│   └── seed.ts            ← Creates demo admin + worker + site
├── src/
│   ├── app/
│   │   ├── page.tsx               ← Home (choose Worker or Admin)
│   │   ├── clock/page.tsx         ← Worker clock in/out
│   │   ├── admin/
│   │   │   ├── login/page.tsx     ← Admin login
│   │   │   └── page.tsx           ← Admin dashboard
│   │   └── api/                   ← Backend API routes
│   └── lib/
│       ├── db.ts          ← Database connection
│       ├── auth.ts        ← Login / JWT / cookies
│       └── api.ts         ← Frontend helper (replaces old Base44 db)
└── package.json
```

---

## Next steps

Reply with what you want next and we will continue porting:

1. Full Worker Management page
2. Attendance Reports + Payroll export
3. QR Code + Selfie clock-in
4. Sites management + geofence
5. Offline support

---

Made independent from Base44 · Ready for your own hosting
