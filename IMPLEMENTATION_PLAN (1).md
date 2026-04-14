# View360 — Implementation Plan
**LED Showroom Sync: iPad Controller → WebSocket → PC Display → HDMI → LED**

---

## 1. Tổng quan kiến trúc

```
iPad (Sales)              Server                 PC / Laptop
/sales route     ──WS──▶  Socket.io   ──WS──▶   /display route
touch → emit             broadcast              render image
                                                    │
                                                  HDMI
                                                    │
                                                 LED 44B
```

**Nguyên tắc:** 2 browser tab — cùng 1 codebase, 2 route khác nhau, sync qua 1 WebSocket room.

---

## 2. Cấu trúc thư mục

```
view360/
├── server/
│   ├── index.js          # Express + Socket.io server
│   └── package.json
├── client/
│   ├── index.html        # Entry (redirect theo role)
│   ├── sales.html        # Controller UI — mở trên iPad
│   ├── display.html      # Display UI — mở trên PC, fullscreen, HDMI → LED
│   └── assets/
│       ├── sales.js      # Logic controller
│       ├── display.js    # Logic display
│       └── style.css     # Shared styles
├── .env                  # PORT, ROOM config
└── README.md
```

---

## 3. Tech stack

| Layer | Tech | Lý do |
|---|---|---|
| Server | Node.js + Express | Nhẹ, dễ deploy |
| Realtime | Socket.io 4.x | Auto reconnect, room support |
| Client | Vanilla JS + HTML | Zero dependency, chạy mượt mọi browser |
| Deploy | Railway / Render / localhost | Free tier đủ dùng cho demo |
| Ảnh 360 | URL array trong config | Thay bằng Pannellum sau nếu cần viewer 360 thật |

---

## 4. Các bước thực hiện

### Phase 1 — Server (30 phút)
- [ ] Init Node project, cài `express`, `socket.io`, `dotenv`
- [ ] Tạo HTTP server serve static files từ `/client`
- [ ] Khởi tạo Socket.io, tạo room logic:
  - Client join với role `controller` hoặc `display`
  - Khi controller emit `spot:change` → broadcast cho tất cả `display` trong room
- [ ] Test bằng 2 tab browser local

### Phase 2 — Controller UI `/sales` (45 phút)
- [ ] Layout mobile-first: grid thumbnail ảnh, project switcher
- [ ] Tap thumbnail → emit `spot:change { spotId, imgUrl, title, project }`
- [ ] Visual feedback: highlight thumbnail đang active, toast "Đã sync ✓"
- [ ] Connection status badge (online / reconnecting)

### Phase 3 — Display UI `/display` (30 phút)
- [ ] Full-viewport black background, ảnh object-fit cover
- [ ] Nhận event `spot:change` → swap ảnh với fade transition 400ms
- [ ] Overlay: title + project name góc dưới trái
- [ ] Auto-reconnect khi mất kết nối
- [ ] Cursor hidden (kiosk mode)

### Phase 4 — Data & Config (15 phút)
- [ ] File `projects.js` chứa array project + spots (imgUrl, title, sub)
- [ ] Dễ thay ảnh thật sau mà không đụng logic

### Phase 5 — Deploy & Test (30 phút)
- [ ] Deploy lên Railway (free, có HTTPS)
- [ ] Test: iPad mở `/sales`, PC mở `/display` F11 fullscreen, cắm HDMI
- [ ] Kiểm tra latency tap → LED render (target < 100ms trên LAN)

---

## 5. Socket.io Events

| Event | Từ | Đến | Payload |
|---|---|---|---|
| `join` | Client | Server | `{ role: 'controller'|'display', room: 'demo' }` |
| `spot:change` | Controller | Server | `{ spotId, imgUrl, title, sub, project }` |
| `spot:change` | Server | Display(s) | *(forward nguyên payload)* |
| `client:count` | Server | Controller | `{ count: 2 }` — số display đang kết nối |
| `display:ready` | Display | Server | Thông báo display đã load xong |

---

## 6. Mở rộng sau demo

| Tính năng | Mô tả |
|---|---|
| Pannellum.js | Tích hợp viewer 360° thật thay ảnh tĩnh |
| Multi-room | Mỗi showroom / tầng có 1 room riêng |
| QR login | Sales quét QR để join đúng room |
| Analytics | Log tap events — biết khách xem góc nào nhiều nhất |
| Offline mode | Service Worker cache ảnh, không cần internet tại showroom |

---

## 7. Yêu cầu hỏi Anim khi họp

1. PC/laptop cắm HDMI chạy OS gì? (Windows/Mac/Linux) → đều dùng Chrome fullscreen được
2. Mạng tại showroom: WiFi chung hay cần LAN riêng?
3. Ảnh 360 hiện tại lưu ở đâu? (local NAS / cloud URL)
4. Muốn viewer 360° drag được hay chỉ cần ảnh tĩnh từng góc?
5. Số lượng project / số spot mỗi project?

