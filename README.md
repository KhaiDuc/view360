# View360

Real-time LED showroom sync: iPad Controller → WebSocket → PC Display → HDMI → LED

## Setup

```bash
cd server
npm install
npm start
```

## Usage

- **iPad (Sales):** open `http://YOUR_IP:3000/sales`
- **PC (Display):** open `http://YOUR_IP:3000/display` → press F11 → plug HDMI to LED

## Deploy to Railway

1. Push to GitHub
2. New project on railway.app → Deploy from GitHub
3. Set root directory to `server/`
4. Railway auto-sets `PORT` — no config needed

## Replace images

Edit `client/assets/projects.js` — update `imgUrl` fields with real hosted image URLs.

## Test checklist

- [ ] Two tabs on localhost both connect
- [ ] Tap on sales → image changes on display within 100ms (LAN)
- [ ] Display reconnects automatically after server restart
- [ ] Works on iPad Safari (touch events)
