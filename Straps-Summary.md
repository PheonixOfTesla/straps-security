# STRAPS Security - Executive Summary

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla HTML/CSS/JavaScript (no framework) |
| **Backend** | Node.js + Express.js |
| **Database** | Supabase (PostgreSQL) |
| **Hosting** | Vercel (serverless) |
| **Maps** | Leaflet.js + OpenStreetMap |
| **Auth** | JWT (JSON Web Tokens) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
├──────────────────────┬──────────────────────────────────────┤
│   Admin Dashboard    │         Guard Mobile View            │
│   (dashboard.html)   │         (guard.html)                 │
│   - Live map         │         - Check in/out               │
│   - Guard roster     │         - GPS tracking               │
│   - Activity log     │         - Submit notes               │
│   - Export reports   │         - View team status           │
│   - Manage guards    │         - Activity feed              │
└──────────┬───────────┴──────────────────┬───────────────────┘
           │           HTTPS              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Serverless)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Express.js API                         │  │
│  │  /api/auth/*    - Login, users, JWT                   │  │
│  │  /api/guards/*  - Check-in, checkout, location        │  │
│  │  /api/locations/* - CRUD locations                    │  │
│  │  /api/dashboard/* - Stats, map, activity              │  │
│  │  /api/notes/*   - Shift notes                         │  │
│  │  /api/shifts/*  - Shift scheduling                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  PostgreSQL                          │    │
│  │  users, guard_status, locations, checkins,          │    │
│  │  activity_log, shift_notes, location_history,       │    │
│  │  shifts, availability                                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Guards & admins (username, password_hash, name, role, guard_type) |
| `guard_status` | Real-time status (guard_id, status, lat, lng, current_location_id) |
| `locations` | Job sites (name, address, lat, lng) |
| `checkins` | Clock in/out records (guard_id, location_id, type, timestamp, lat, lng) |
| `activity_log` | All actions (guard_id, action, details, timestamp) |
| `shift_notes` | Guard notes/incidents (guard_id, content, note_type) |
| `location_history` | GPS breadcrumb trail |
| `shifts` | Scheduled shifts |
| `availability` | Guard availability |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/users` | List all users (admin) |
| POST | `/api/auth/users` | Create guard (admin) |
| PUT | `/api/auth/users/:id` | Update guard (admin) |
| DELETE | `/api/auth/users/:id` | Delete guard (admin) |

### Guards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guards` | List all guards with status |
| GET | `/api/guards/:id` | Get single guard |
| POST | `/api/guards/checkin` | Check in at location |
| POST | `/api/guards/checkout` | Check out |
| POST | `/api/guards/location` | Update GPS position |
| POST | `/api/guards/break/start` | Start break |
| POST | `/api/guards/break/end` | End break |
| GET | `/api/guards/:id/hours` | Get hours worked today |

### Locations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations` | List all locations |
| GET | `/api/locations/:id` | Get single location |
| POST | `/api/locations` | Create location (admin) |
| DELETE | `/api/locations/:id` | Delete location (admin) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | On duty, break, hours stats |
| GET | `/api/dashboard/map` | Guards + locations for map |
| GET | `/api/dashboard/activity` | Activity log |
| GET | `/api/dashboard/activity/today` | Today's activity |
| GET | `/api/dashboard/checkins` | Check-in records for export |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List notes |
| GET | `/api/notes/today` | Today's notes |
| POST | `/api/notes` | Create note |
| DELETE | `/api/notes/:id` | Delete note |

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Live GPS Tracking** | Find My-style pulsing markers, 15s refresh |
| **Check-in/out** | Guards clock in at locations with GPS |
| **Activity Feed** | Real-time log of all guard actions |
| **Team Status** | Guards see other guards' locations |
| **Shift Notes** | Guards submit incidents/observations |
| **Export Reports** | CSV export with hours per guard |
| **PWA** | Add to home screen on mobile |

---

## Security

- **JWT Authentication** - Tokens expire, stored in localStorage
- **Role-based Access** - Admin vs Guard permissions
- **HTTPS** - Enforced by Vercel
- **Password Hashing** - bcrypt with salt

---

## Deployment

```
GitHub (main branch)
        │
        ▼ (auto-deploy)
     Vercel
        │
        ├── /client/* → Static files
        └── /server/* → Serverless functions
```

**URLs:**
- Production: `straps-security.vercel.app`
- API: `straps-security.vercel.app/api/*`

---

## User Roles

### Admin (Charles)
- View live map with all guard locations
- See real-time activity feed
- Add/remove guards and locations
- Export weekly reports with hours
- View all shift notes

### Guard
- Check in/out at assigned locations
- GPS tracked while on duty
- Submit shift notes (incidents, observations)
- View other guards' status and locations
- See activity feed

---

## File Structure

```
straps-security/
├── client/
│   ├── index.html        # Login page
│   ├── dashboard.html    # Admin dashboard
│   ├── guard.html        # Guard mobile view
│   ├── manifest.json     # PWA manifest
│   ├── css/
│   │   └── styles.css    # All styles
│   └── js/
│       └── api.js        # API helper + auth
│
├── server/
│   ├── index.js          # Express entry point
│   ├── db/
│   │   ├── database.js   # Supabase query wrapper
│   │   └── supabase.js   # Supabase client
│   ├── middleware/
│   │   └── auth.js       # JWT verification
│   └── routes/
│       ├── auth.js       # Auth endpoints
│       ├── guards.js     # Guard endpoints
│       ├── locations.js  # Location endpoints
│       ├── dashboard.js  # Dashboard endpoints
│       ├── notes.js      # Notes endpoints
│       ├── shifts.js     # Shifts endpoints
│       └── availability.js
│
└── vercel.json           # Vercel config
```
