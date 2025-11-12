/* LyricFlow script
   - loads lyrics JSON from assets/lyrics/<name>.json
   - plays assets/audio/<file>.mp3
   - uses WebAudio Analyser to compute beat intensity
   - pulse + sparkles react to bass intensity
   - lyrics sync by timestamp (seconds)
*/

/* ---------------------------- Config ---------------------------- */
const SONG = {
  audio: 'assets/audio/perfect.mp3',
  lyrics: 'assets/lyrics/perfect.json',
  title: 'Ed Sheeran — Perfect',
  artist: 'Demo'
};
/* ---------------------------------------------------------------- */

const audioEl = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const speedEl = document.getElementById('speed');
const lyricEl = document.getElementById('lyric');
const songTitleEl = document.getElementById('songTitle');
const songArtistEl = document.getElementById('songArtist');
const pulseEl = document.getElementById('pulse');

songTitleEl.textContent = SONG.title;
songArtistEl.textContent = SONG.artist;
audioEl.src = SONG.audio;

// canvas for sparkles
const sparkleCanvas = document.getElementById('sparkleCanvas');
const sCtx = sparkleCanvas.getContext('2d');
const bgCanvas = document.getElementById('bgCanvas');
const bCtx = bgCanvas.getContext('2d');
resizeCanvases();

// handle resize
window.addEventListener('resize', resizeCanvases);
function resizeCanvases(){
  sparkleCanvas.width = bgCanvas.width = window.innerWidth;
  sparkleCanvas.height = bgCanvas.height = window.innerHeight;
}

// load lyrics
let lyrics = [];
fetch(SONG.lyrics).then(r=>r.json()).then(json=>{
  // expected json: [{ "time": 0, "line": "..." }, ...]
  lyrics = json;
}).catch(err=>{
  console.warn('Lyrics load failed', err);
});

// audio context & analyser
let audioCtx, analyser, sourceNode;
let dataArray, bufferLength;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048; // higher = better frequency resolution
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  sourceNode = audioCtx.createMediaElementSource(audioEl);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

// ensure resume on user gesture (autoplay restrictions)
function resumeAudioContext() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

document.body.addEventListener('click', () => {
  if (!audioCtx) initAudio();
  resumeAudioContext();
});

/* ---------------- Lyric sync ---------------- */
let lastShownIndex = -1;
audioEl.addEventListener('timeupdate', () => {
  const t = audioEl.currentTime;
  // find the index of the latest lyric whose time <= t
  if (!lyrics || lyrics.length === 0) return;
  // simple linear search (ok for <= few 100 lines)
  let idx = -1;
  for (let i = 0; i < lyrics.length; i++){
    if (t >= lyrics[i].time) idx = i;
    else break;
  }
  if (idx !== -1 && idx !== lastShownIndex){
    showLyric(lyrics[idx].line);
    lastShownIndex = idx;
  }
});

/* show lyric with animation */
let lyricTimeout = null;
function showLyric(text){
  lyricEl.classList.remove('show');
  // small delay for smoother crossfade
  setTimeout(()=>{
    lyricEl.textContent = text;
    lyricEl.classList.add('show');
  }, 40);

  // optionally clear after some time (keeps last line visible)
  clearTimeout(lyricTimeout);
  lyricTimeout = setTimeout(()=>{
    lyricEl.classList.remove('show');
  }, 7000);
}

/* ---------------- Controls ---------------- */
playBtn.addEventListener('click', async () => {
  if (!audioCtx) initAudio();
  await audioEl.play();
  resumeAudioContext();
});
pauseBtn.addEventListener('click', () => audioEl.pause());
speedEl.addEventListener('change', () => { audioEl.playbackRate = Number(speedEl.value); });

/* ---------------- Visualizer: beat detection + particles ---------------- */
const particles = [];
function spawnParticle(x,y,intensity){
  const p = {
    x, y,
    vx: (Math.random()-0.5) * intensity * 0.8,
    vy: (Math.random()-0.9) * intensity * 0.8,
    life: 0,
    maxLife: 60 + Math.random()*30,
    size: 2 + Math.random()*5,
    hue: Math.floor(Math.random()*360)
  };
  particles.push(p);
}

function drawBackground(time){
  // animated gradient background (slowly changing)
  const t = time * 0.00008;
  const h1 = Math.floor((t*40) % 360);
  const h2 = (h1 + 80) % 360;
  const g = bCtx.createLinearGradient(0,0, bgCanvas.width, bgCanvas.height);
  g.addColorStop(0, `hsl(${h1} 80% 20% / 0.95)`);
  g.addColorStop(1, `hsl(${h2} 70% 30% / 0.95)`);
  bCtx.fillStyle = g;
  bCtx.fillRect(0,0, bgCanvas.width, bgCanvas.height);

  // subtle radial glow center
  const cx = bgCanvas.width/2, cy = bgCanvas.height/2;
  const rg = bCtx.createRadialGradient(cx,cy,10, cx,cy, Math.max(bgCanvas.width,bgCanvas.height)/1.8);
  rg.addColorStop(0, `rgba(255,255,255,0.02)`);
  rg.addColorStop(1, `rgba(0,0,0,0.0)`);
  bCtx.fillStyle = rg;
  bCtx.fillRect(0,0, bgCanvas.width, bgCanvas.height);
}

function updateParticles(){
  sCtx.clearRect(0,0, sparkleCanvas.width, sparkleCanvas.height);
  for (let i = particles.length-1; i >= 0; i--){
    const p = particles[i];
    p.life++;
    p.x += p.vx;
    p.y += p.vy;
    const alpha = 1 - (p.life / p.maxLife);
    sCtx.beginPath();
    sCtx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${alpha})`;
    sCtx.arc(p.x, p.y, p.size * (0.6 + alpha*0.6), 0, Math.PI*2);
    sCtx.fill();

    // small trail
    sCtx.beginPath();
    sCtx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${alpha*0.25})`;
    sCtx.ellipse(p.x - p.vx*2, p.y - p.vy*2, p.size*1.6, p.size*0.8, 0, 0, Math.PI*2);
    sCtx.fill();

    if (p.life > p.maxLife) particles.splice(i,1);
  }
}

/* main animate loop */
function animate(time){
  requestAnimationFrame(animate);
  drawBackground(time);

  // if analyser ready, compute intensity
  let level = 0;
  if (analyser){
    analyser.getByteFrequencyData(dataArray);
    // compute bass average (lower bins)
    const bassCount = Math.floor(bufferLength * 0.12); // lower ~12% bins
    let bassSum = 0;
    for (let i = 0; i < bassCount; i++){
      bassSum += dataArray[i];
    }
    const bassAvg = bassSum / Math.max(1,bassCount); // 0..255
    level = bassAvg / 255; // 0..1

    // create particles proportional to energy
    if (level > 0.15){
      const spawnCount = Math.floor(level * 6);
      for (let i=0;i<spawnCount;i++){
        const x = (window.innerWidth/2) + (Math.random()-0.5) * 240;
        const y = (window.innerHeight/2) + (Math.random()-0.5) * 40;
        spawnParticle(x, y, 5 + level*12);
      }
    }
    // pulse scale using level
    const scale = 1 + level * 0.9;
    pulseEl.style.background = `radial-gradient(circle at 50% 50%, rgba(255,80,160,${0.28 + level*0.45}), rgba(107,156,255,${0.06 + level*0.25}))`;
    pulseEl.style.transform = `translate(-50%,-50%) scale(${scale})`;
  }

  // update and draw particles
  updateParticles();
}
requestAnimationFrame(animate);

/* helpful: warm-up audio context on first user gesture */
window.addEventListener('pointerdown', () => {
  if (!audioCtx) initAudio();
});

/* small polyfill: ensure audio gains if needed in future */
