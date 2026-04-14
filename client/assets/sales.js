const socket = io();
const ROOM = 'showroom_demo';
let currentProject = PROJECTS[0];
let currentSpotId = 0;

const $grid = document.getElementById('spotGrid');
const $switcher = document.getElementById('projectSwitcher');
const $syncBtn = document.getElementById('syncBtn');
const $statusDot = document.getElementById('statusDot');
const $displayCount = document.getElementById('displayCount');

// --- Socket events ---

socket.on('connect', () => {
  socket.emit('join', { role: 'controller', room: ROOM });
  $statusDot.classList.add('connected');
});

socket.on('disconnect', () => {
  $statusDot.classList.remove('connected');
});

socket.on('client:count', ({ displays }) => {
  $displayCount.textContent = displays;
});

// --- Render functions ---

function renderProjects() {
  $switcher.innerHTML = PROJECTS.map(p =>
    `<button class="project-pill${p.id === currentProject.id ? ' active' : ''}" data-id="${p.id}">${p.name}</button>`
  ).join('');

  $switcher.querySelectorAll('.project-pill').forEach(btn => {
    btn.addEventListener('click', () => selectProject(btn.dataset.id));
  });
}

function renderSpots() {
  $grid.innerHTML = currentProject.spots.map(spot => {
    const hasPlay = spot.type === 'video' || spot.type === 'youtube';
    const thumbSrc = hasPlay ? spot.thumbUrl : spot.imgUrl;
    const tagLabel = spot.type === 'youtube' ? 'YT' : spot.type === 'video' ? 'VIDEO' : '';
    return `<div class="spot-card${spot.id === currentSpotId ? ' active' : ''}" data-id="${spot.id}">
      <div class="thumb-wrap">
        <img class="thumb" src="${thumbSrc}" alt="${spot.title}" loading="lazy">
        ${hasPlay ? '<div class="play-badge">▶</div>' : ''}
      </div>
      <div class="info">
        <div class="texts">
          <div class="title">${spot.title}</div>
          <div class="sub">${spot.sub}</div>
        </div>
        ${tagLabel ? `<div class="type-tag${spot.type === 'youtube' ? ' yt' : ''}">${tagLabel}</div>` : ''}
        <div class="selection-dot"></div>
      </div>
    </div>`;
  }).join('');

  $grid.querySelectorAll('.spot-card').forEach(card => {
    card.addEventListener('click', () => selectSpot(Number(card.dataset.id)));
  });
}

// --- Actions ---

function selectSpot(spotId) {
  currentSpotId = spotId;
  const spot = currentProject.spots.find(s => s.id === spotId);
  if (!spot) return;

  document.querySelectorAll('.spot-card').forEach(c => c.classList.remove('active'));
  const activeCard = document.querySelector(`.spot-card[data-id="${spotId}"]`);
  if (activeCard) activeCard.classList.add('active');

  const payload = {
    spotId: spot.id,
    type: spot.type || 'image',
    title: spot.title,
    sub: spot.sub,
    project: currentProject.name
  };
  if (spot.type === 'youtube') {
    payload.youtubeId = spot.youtubeId;
    payload.youtubeStart = spot.youtubeStart || 0;
  } else if (spot.type === 'video') {
    payload.videoUrl = spot.videoUrl;
  } else {
    payload.imgUrl = spot.imgUrl;
  }
  socket.emit('spot:change', payload);

  showSyncFeedback();
}

function selectProject(projectId) {
  currentProject = PROJECTS.find(p => p.id === projectId);
  currentSpotId = 0;
  renderProjects();
  renderSpots();
  selectSpot(0);
}

function showSyncFeedback() {
  $syncBtn.textContent = 'Đã sync ✓';
  $syncBtn.classList.add('synced');
  setTimeout(() => {
    $syncBtn.textContent = 'Tap để chiếu lên LED ↑';
    $syncBtn.classList.remove('synced');
  }, 1500);
}

$syncBtn.addEventListener('click', () => {
  selectSpot(currentSpotId);
});

// --- Init ---
renderProjects();
renderSpots();
