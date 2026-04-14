const socket = io();
const ROOM = 'showroom_demo';

const $image = document.getElementById('displayImage');
const $video = document.getElementById('displayVideo');
const $youtube = document.getElementById('displayYoutube');
const $overlay = document.getElementById('overlay');
const $projectLabel = document.getElementById('projectLabel');
const $spotTitle = document.getElementById('spotTitle');
const $spotSub = document.getElementById('spotSub');
const $flashRing = document.getElementById('flashRing');
const $statusDot = document.getElementById('statusDot');
const $waiting = document.getElementById('waitingScreen');
const $container = document.getElementById('displayContainer');

let firstLoad = true;

function preloadMedia() {
  PROJECTS.forEach(project => {
    project.spots.forEach(spot => {
      if (spot.type === 'video') {
        const v = document.createElement('video');
        v.preload = 'auto';
        v.src = spot.videoUrl;
      } else if (spot.type !== 'youtube') {
        const img = new Image();
        img.src = spot.imgUrl;
      }
    });
  });
}

function hideAllMedia() {
  $image.style.opacity = '0';
  $video.style.opacity = '0';
  $youtube.style.opacity = '0';
}

function stopAllMedia() {
  $video.pause();
  $youtube.src = '';
}

function showImage(imgUrl, onReady) {
  stopAllMedia();
  $image.src = imgUrl;

  const reveal = () => {
    $image.style.opacity = '1';
    onReady();
  };

  if ($image.complete) {
    reveal();
  } else {
    $image.onload = reveal;
  }
}

function showVideo(videoUrl, onReady) {
  stopAllMedia();
  $video.src = videoUrl;
  $video.load();

  const reveal = () => {
    $video.style.opacity = '1';
    $video.play().catch(() => {});
    onReady();
  };

  if ($video.readyState >= 3) {
    reveal();
  } else {
    $video.oncanplay = () => {
      $video.oncanplay = null;
      reveal();
    };
  }
}

function showYoutube(youtubeId, startSeconds, onReady) {
  stopAllMedia();
  const params = [
    'autoplay=1',
    'mute=1',
    'controls=0',
    'showinfo=0',
    'rel=0',
    'modestbranding=1',
    'loop=1',
    `playlist=${youtubeId}`,
    `start=${startSeconds || 0}`
  ].join('&');
  $youtube.src = `https://www.youtube.com/embed/${youtubeId}?${params}`;
  $youtube.style.opacity = '1';
  onReady();
}

// --- Socket events ---

socket.on('connect', () => {
  socket.emit('join', { role: 'display', room: ROOM });
  $statusDot.classList.add('connected');
});

socket.on('disconnect', () => {
  $statusDot.classList.remove('connected');
});

socket.on('spot:change', (data) => {
  if (firstLoad) {
    $waiting.classList.add('hidden');
    firstLoad = false;
  }

  const { type, title, sub, project } = data;

  hideAllMedia();

  setTimeout(() => {
    $projectLabel.textContent = project;
    $spotTitle.textContent = title;
    $spotSub.textContent = sub;

    const onReady = () => {
      $overlay.style.opacity = '1';
      triggerFlash();
    };

    if (type === 'youtube') {
      showYoutube(data.youtubeId, data.youtubeStart, onReady);
    } else if (type === 'video') {
      showVideo(data.videoUrl, onReady);
    } else {
      showImage(data.imgUrl, onReady);
    }
  }, 200);
});

function triggerFlash() {
  $flashRing.classList.remove('animate');
  void $flashRing.offsetWidth;
  $flashRing.classList.add('animate');
}

// --- Auto fullscreen on first click ---
$container.addEventListener('click', () => {
  if (document.fullscreenElement) return;
  $container.requestFullscreen?.() ||
    $container.webkitRequestFullscreen?.() ||
    $container.msRequestFullscreen?.();
}, { once: true });

// --- Init ---
preloadMedia();
