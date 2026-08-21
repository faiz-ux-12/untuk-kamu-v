/* =========================================================
   BAGIAN 1 — CANVAS 2D: dunia pantai (Babak 1 & 3)
   Semua digambar tiap frame lewat requestAnimationFrame.
   Transisi hitam-putih <-> berwarna tetap dikerjakan CSS
   filter di #world (efisien, dan otomatis ikut mewarnai
   apa pun yang digambar di canvas ini).
   ========================================================= */
(function(){
  const canvas = document.getElementById('beachCanvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize(){
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const HIM_X = 0.47;   // posisi laki-laki, tetap di tempat
  const HER_SEATED_X = 0.56;
  const SIT_Y = 0.80;   // garis tempat mereka duduk (relatif tinggi canvas)

  const scene = {
    herState: 'offscreen', // offscreen | entering | seated | leaving | gone
    herX: -0.08,
    herStartTime: null,
    particles: []
  };

  function easeInOutCubic(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2; }
  function easeInCubic(t){ return t*t*t; }

  function drawSky(){
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f6b99a');
    grad.addColorStop(0.45, '#e88b8f');
    grad.addColorStop(0.68, '#b6667b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.68);

    const sea = ctx.createLinearGradient(0, H * 0.68, 0, H);
    sea.addColorStop(0, '#3c6e71');
    sea.addColorStop(1, '#274a4d');
    ctx.fillStyle = sea;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);
  }

  function drawSun(){
    const sx = W * 0.5, sy = H * 0.34, r = Math.min(W, H) * 0.11;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, 'rgba(251,221,155,0.9)');
    g.addColorStop(1, 'rgba(251,221,155,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  }

  function drawWaves(t){
    ctx.lineWidth = 2;
    [
      { y: 0.795, amp: 3, speed: 1.0, phase: 0,   alpha: 1 },
      { y: 0.78,  amp: 2, speed: 1.3, phase: 1.3, alpha: 0.6 }
    ].forEach(w => {
      ctx.globalAlpha = w.alpha;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      const y = H * w.y;
      for (let x = 0; x <= W; x += 8) {
        const yy = y + Math.sin(x * 0.02 + t * 0.0016 * w.speed + w.phase) * w.amp;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function drawSand(){
    const sandTop = H * 0.8;
    const grad = ctx.createLinearGradient(0, sandTop, 0, H);
    grad.addColorStop(0, '#e3c9a3');
    grad.addColorStop(1, '#c7a97a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, sandTop, W, H - sandTop);
  }

  // Menggambar satu figur. seatedAmount 0 = berdiri/berjalan, 1 = duduk penuh.
  function drawFigure(xFrac, seatedAmount, color){
    const x = W * xFrac;
    const baseY = H * SIT_Y;
    const scale = Math.min(W, H) * 0.0026;
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;

    // kepala
    ctx.beginPath();
    ctx.arc(0, -70, 9, 0, Math.PI * 2);
    ctx.fill();

    // badan: interpolasi halus dari pose berjalan ke pose duduk
    const k = Math.max(0, Math.min(1, seatedAmount));
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.bezierCurveTo(-9 - k * 3, -53, -12 + k * 1, -33 + k * 19, -9 - k * 0, -9 - k * 5);
    if (k > 0.05) {
      ctx.quadraticCurveTo(0, -4 - k * 10, 9, -14 - k * -5);
    } else {
      ctx.lineTo(-3, -9); ctx.lineTo(-1, -39); ctx.lineTo(1, -39); ctx.lineTo(3, -9); ctx.lineTo(9, -9);
    }
    ctx.bezierCurveTo(12 - k * 1, -33 + k * 19, 9 + k * 3, -53, 0, -58);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function spawnParticles(xFrac, count){
    for (let i = 0; i < count; i++) {
      scene.particles.push({
        x: W * xFrac + (Math.random() - 0.5) * 18,
        y: H * SIT_Y - 45 + (Math.random() - 0.5) * 20,
        vx: Math.random() * 0.5 + 0.15,
        vy: -(Math.random() * 0.25),
        life: 1,
        hue: 335 + Math.random() * 45,
        r: 2 + Math.random() * 3
      });
    }
  }

  function updateParticles(dt){
    scene.particles.forEach(p => {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.life -= dt * 0.0006;
    });
    scene.particles = scene.particles.filter(p => p.life > 0);
  }

  function drawParticles(){
    scene.particles.forEach(p => {
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = `hsl(${p.hue}, 70%, 65%)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  let lastT = null;
  function frame(t){
    if (lastT === null) lastT = t;
    const dt = t - lastT;
    lastT = t;

    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawSun();
    drawWaves(t);
    drawSand();

    // laki-laki: selalu duduk di tempatnya
    drawFigure(HIM_X, 1, '#2c2420');

    // perempuan: tergantung state babak saat ini
    if (scene.herState === 'entering') {
      const p = Math.min((t - scene.herStartTime) / 3500, 1);
      const eased = easeInOutCubic(p);
      scene.herX = -0.08 + (HER_SEATED_X - (-0.08)) * eased;
      const seated = Math.max(0, (p - 0.72) / 0.28);
      drawFigure(scene.herX, seated, '#2c2420');
      if (p >= 1) { scene.herState = 'seated'; scene.herX = HER_SEATED_X; }
    } else if (scene.herState === 'seated') {
      drawFigure(scene.herX, 1, '#2c2420');
    } else if (scene.herState === 'leaving') {
      const p = Math.min((t - scene.herStartTime) / 3000, 1);
      const eased = easeInCubic(p);
      scene.herX = HER_SEATED_X + (1.1 - HER_SEATED_X) * eased;
      const seated = Math.max(0, 1 - p * 1.5);
      drawFigure(scene.herX, seated, '#2c2420');
      if (Math.random() < 0.55) spawnParticles(scene.herX, 1);
      if (p >= 1) scene.herState = 'gone';
    }

    updateParticles(dt);
    drawParticles();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // API kecil supaya kode di bawah (state machine babak) bisa mengontrol si perempuan
  window.__beachScene = {
    herEnter(){ scene.herState = 'entering'; scene.herStartTime = performance.now(); },
    herShowSeatedInstant(){ scene.herState = 'seated'; scene.herX = HER_SEATED_X; },
    herLeave(){ scene.herState = 'leaving'; scene.herStartTime = performance.now(); }
  };
})();


/* =========================================================
   BAGIAN 2 — Galeri foto (dari foto.json)
   ========================================================= */
fetch('foto.json')
  .then(r => r.json())
  .then(photos => {
    const gallery = document.getElementById('photoGallery');
    gallery.innerHTML = photos.map(p => `
      <div class="polaroid">
        <div class="frame"><img src="${p.src}" alt="${p.caption || ''}" onerror="this.parentElement.innerHTML='';"></div>
        <span class="cap">${p.caption || ''}</span>
      </div>`).join('');
  })
  .catch(() => { /* foto.json belum ada / gagal dimuat — galeri dibiarkan kosong */ });


/* =========================================================
   BAGIAN 3 — Spotify (iFrame Playback API)
   Dipakai supaya lagu bisa di-play() persis saat tombol
   "Satu Cerita Tentang Kita" diklik (gesture klik asli dari
   pengguna, jadi browser lebih mengizinkan audio jalan).
   Kalau API gagal dimuat, otomatis jatuh ke player biasa.
   ========================================================= */
const SPOTIFY_TRACK_URI = 'spotify:track:2rbDhOo9Fh61Bbu23T2qCK';
const SPOTIFY_TRACK_ID = '2rbDhOo9Fh61Bbu23T2qCK';
let spotifyController = null;

window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const el = document.getElementById('spotify-embed');
  IFrameAPI.createController(el, { uri: SPOTIFY_TRACK_URI, width: '100%', height: '152' }, (EmbedController) => {
    spotifyController = EmbedController;
  });
};
setTimeout(() => {
  const el = document.getElementById('spotify-embed');
  if (el && !spotifyController && !el.querySelector('iframe')) {
    el.innerHTML = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${SPOTIFY_TRACK_ID}?utm_source=generator&theme=0" width="100%" height="152" frameborder="0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  }
}, 3000);


/* =========================================================
   BAGIAN 4 — Alur 3 babak (intro -> pesan -> perpisahan)
   ========================================================= */
const world = document.getElementById('world');
const revealBtn = document.getElementById('revealBtn');
const introLayer = document.getElementById('introLayer');
const memoriesScene = document.getElementById('memoriesScene');
const continueBtn = document.getElementById('continueBtn');
const farewellLayer = document.getElementById('farewellLayer');
const skipBtn = document.getElementById('skipBtn');

function playIntro(){
  setTimeout(() => {
    window.__beachScene.herEnter();
    world.classList.add('colorful'); // tepat saat ia mulai berjalan mendekat & duduk
  }, 900);
  setTimeout(() => { revealBtn.classList.add('show'); }, 900 + 3700);
}

function goToMemories(){
  introLayer.style.transition = 'opacity .8s ease';
  introLayer.style.opacity = '0';
  setTimeout(() => { memoriesScene.classList.add('show'); }, 500);

  if (spotifyController) {
    try { spotifyController.play(); } catch (e) { /* biarkan, pengguna masih bisa klik player manual */ }
  }
}

function goToFarewell(){
  memoriesScene.classList.remove('show');
  setTimeout(() => {
    window.__beachScene.herLeave();
    world.classList.remove('colorful');
    world.classList.add('faded');
    farewellLayer.classList.add('show');
  }, 400);
}

revealBtn.addEventListener('click', goToMemories);
continueBtn.addEventListener('click', goToFarewell);

skipBtn.addEventListener('click', () => {
  window.__beachScene.herEnter();
  world.classList.add('colorful');
  revealBtn.classList.add('show');
  skipBtn.style.display = 'none';
});

playIntro();

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
if (mq.matches) {
  window.__beachScene.herShowSeatedInstant();
  world.classList.add('colorful');
  revealBtn.classList.add('show');
}

document.getElementById('reset-btn').addEventListener('click', () => {
  window.location.reload();
});
