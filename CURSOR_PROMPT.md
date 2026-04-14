# Cursor / Claude Prompt — Build View360 WebApp

Copy toàn bộ prompt này vào Cursor (Composer) hoặc Claude Projects.

---

## PROMPT

Build a Node.js + Socket.io web application called **View360** — a real-time sync tool for real estate sales showrooms. A salesperson uses an iPad to select a 360° photo spot; the selection instantly appears fullscreen on a PC connected via HDMI to a large LED screen.

---

### Architecture

Two browser clients connect to the same Socket.io server and join the same room:
- **Controller** (`/sales`): opened on iPad. Tap a thumbnail → emit event to server.
- **Display** (`/display`): opened on PC in fullscreen (F11). Receives event → renders image fullscreen → HDMI → LED screen.

```
iPad /sales  ──WebSocket──▶  Socket.io Server  ──WebSocket──▶  PC /display  ──HDMI──▶  LED 44B
   (emit spot:change)           (broadcast)          (render image fullscreen)
```

---

### File structure to generate

```
view360/
├── server/
│   ├── index.js
│   └── package.json
├── client/
│   ├── sales.html
│   ├── display.html
│   └── assets/
│       ├── sales.js
│       ├── display.js
│       ├── projects.js
│       └── style.css
├── .env.example
└── README.md
```

---

### server/package.json

```json
{
  "name": "view360-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js", "dev": "nodemon index.js" },
  "dependencies": { "express": "^4.18.2", "socket.io": "^4.7.2", "dotenv": "^16.3.1" },
  "devDependencies": { "nodemon": "^3.0.1" }
}
```

---

### server/index.js — full implementation

```javascript
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Serve static client files
app.use(express.static(path.join(__dirname, '../client')));

// Route /sales → sales.html, /display → display.html
app.get('/sales', (req, res) => res.sendFile(path.join(__dirname, '../client/sales.html')));
app.get('/display', (req, res) => res.sendFile(path.join(__dirname, '../client/display.html')));
app.get('/', (req, res) => res.redirect('/sales'));

// Track display clients per room
const roomDisplays = {}; // { roomId: Set<socketId> }

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentRole = null;

  socket.on('join', ({ role, room }) => {
    currentRoom = room || 'default';
    currentRole = role;
    socket.join(currentRoom);

    if (role === 'display') {
      if (!roomDisplays[currentRoom]) roomDisplays[currentRoom] = new Set();
      roomDisplays[currentRoom].add(socket.id);
    }

    // Tell controller how many displays are connected
    const displayCount = roomDisplays[currentRoom]?.size || 0;
    io.to(currentRoom).emit('client:count', { displays: displayCount });

    console.log(`[${currentRoom}] ${role} connected (${socket.id})`);
  });

  // Controller sends spot change → broadcast to all displays in room
  socket.on('spot:change', (payload) => {
    if (!currentRoom) return;
    console.log(`[${currentRoom}] spot:change → spot ${payload.spotId}`);
    // Broadcast to everyone in room EXCEPT sender
    socket.to(currentRoom).emit('spot:change', payload);
  });

  socket.on('disconnect', () => {
    if (currentRole === 'display' && currentRoom) {
      roomDisplays[currentRoom]?.delete(socket.id);
      const displayCount = roomDisplays[currentRoom]?.size || 0;
      io.to(currentRoom).emit('client:count', { displays: displayCount });
    }
    console.log(`[${currentRoom}] ${currentRole} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`View360 running → http://localhost:${PORT}`));
```

---

### client/assets/projects.js — sample data (replace with real images)

```javascript
// Replace imgUrl with real hosted image URLs or local paths
const PROJECTS = [
  {
    id: 'vinhomes',
    name: 'Vinhomes Ocean Park',
    spots: [
      { id: 0, title: 'Mặt tiền', sub: 'Toàn cảnh dự án', imgUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1920&q=90' },
      { id: 1, title: 'Phòng khách', sub: 'Nội thất 3PN mẫu', imgUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=90' },
      { id: 2, title: 'Hồ bơi', sub: 'Tầng 5 · Tiện ích', imgUrl: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1920&q=90' },
      { id: 3, title: 'Ban đêm', sub: 'View ánh sáng đô thị', imgUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920&q=90' },
    ]
  },
  {
    id: 'masteri',
    name: 'Masteri Thảo Điền',
    spots: [
      { id: 0, title: 'Lobby', sub: 'Sảnh tiếp đón', imgUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1920&q=90' },
      { id: 1, title: 'Penthouse', sub: 'View sông Sài Gòn', imgUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1920&q=90' },
      { id: 2, title: 'Gym', sub: 'Tầng 3 · Tiện ích', imgUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=90' },
    ]
  }
];
```

---

### client/sales.html — Controller UI (iPad)

Requirements:
- Mobile-first, dark theme (#0f0f1a background)
- Top bar: app name "VIEW360" left, live badge + display count right
- Project switcher: horizontal scrollable pill chips
- Spot grid: 2-column grid of thumbnail cards. Each card has: thumbnail image (16:9), spot title, spot subtitle, selection indicator dot
- Active card: blue border (#4f8ef7), dot visible
- Bottom bar: "Tap để chiếu lên LED ↑" button, turns to "Đã sync ✓" for 1.5s after tap
- On tap: emit `spot:change` with full payload; highlight selected card
- Connection status: small dot top-right (green=connected, red=disconnected)
- Auto-reconnect with Socket.io built-in

JavaScript logic (sales.js):
```javascript
// Connect to Socket.io
const socket = io();
const ROOM = 'showroom_demo';
let currentProject = PROJECTS[0];
let currentSpotId = 0;

socket.on('connect', () => {
  socket.emit('join', { role: 'controller', room: ROOM });
});

socket.on('client:count', ({ displays }) => {
  // Update display count badge in UI
});

function selectSpot(spotId) {
  currentSpotId = spotId;
  const spot = currentProject.spots.find(s => s.id === spotId);
  // Update UI active state
  // Emit event
  socket.emit('spot:change', {
    spotId: spot.id,
    imgUrl: spot.imgUrl,
    title: spot.title,
    sub: spot.sub,
    project: currentProject.name
  });
  // Show "Đã sync ✓" feedback
}

function selectProject(projectId) {
  currentProject = PROJECTS.find(p => p.id === projectId);
  currentSpotId = 0;
  renderSpots();
  selectSpot(0);
}
```

---

### client/display.html — Display UI (PC → HDMI → LED)

Requirements:
- Pure black background, zero padding, zero margin
- Single `<img>` tag, `object-fit: cover`, 100vw × 100vh
- Smooth fade transition on image swap: fade out 200ms → swap src → fade in 400ms
- Text overlay bottom-left: project name (small, muted), spot title (large, bold, white)
- Top-right: subtle "VIEW360" branding text
- Green flash ring border (2px, opacity 0→1→0 in 400ms) on each new image receive
- Cursor hidden (`cursor: none`)
- Auto fullscreen request on page load (with user gesture fallback)
- Connection indicator: tiny dot top-left (for PC operator only, hide in full kiosk)

JavaScript logic (display.js):
```javascript
const socket = io();
const ROOM = 'showroom_demo';

socket.on('connect', () => {
  socket.emit('join', { role: 'display', room: ROOM });
});

socket.on('spot:change', ({ imgUrl, title, sub, project }) => {
  // 1. Fade out current image (opacity 0, 200ms)
  // 2. After 200ms: set new src, update overlay text
  // 3. Fade in (opacity 1, 400ms)
  // 4. Flash ring animation
});
```

---

### client/assets/style.css

Shared variables:
```css
:root {
  --bg: #0f0f1a;
  --surface: #1a1a2e;
  --accent: #4f8ef7;
  --accent2: #00c896;
  --text: #ffffff;
  --text-muted: rgba(255,255,255,0.5);
  --border: rgba(255,255,255,0.1);
  --radius: 12px;
}
```

---

### .env.example

```
PORT=3000
```

---

### README.md — Quick start

```markdown
# View360

## Setup
npm install
node server/index.js

## Usage
- iPad: open http://YOUR_IP:3000/sales
- PC: open http://YOUR_IP:3000/display → press F11 → plug HDMI to LED

## Deploy to Railway
1. Push to GitHub
2. New project on railway.app → Deploy from GitHub
3. Set PORT env var (Railway sets automatically)
4. Share the Railway URL — replace localhost with it

## Replace images
Edit client/assets/projects.js — update imgUrl fields with real hosted image URLs
```

---

### Implementation notes for Cursor

1. Generate all files completely — no placeholders or TODOs
2. The server must serve the client folder as static files so one deploy covers everything
3. Socket.io client must be loaded from CDN: `https://cdn.socket.io/4.7.2/socket.io.min.js`
4. Both HTML files must load `projects.js` before their respective logic scripts
5. The display page must preload all images on project load to eliminate lag on first tap
6. Add a `preloadImages()` function in display.js that creates hidden Image objects for all spot URLs
7. Test checklist to include in README:
   - [ ] Two tabs on localhost both connect
   - [ ] Tap on sales → image changes on display within 100ms (LAN)
   - [ ] Display reconnects automatically after server restart
   - [ ] Works on iPad Safari (test touch events, not just click)

