const audio = document.getElementById('audio');
const lyricsEl = document.getElementById('lyrics');
const pulse = document.querySelector('.pulse');
const canvas = document.getElementById('sparkleCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas to full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ✨ Example lyrics (you can replace with your own song lyrics)
const lyrics = [
  { time: 5, text: "I found a love for me" },
  { time: 12, text: "Darling, just dive right in" },
  { time: 18, text: "And follow my lead" },
  { time: 25, text: "Well, I found a girl, beautiful and sweet" },
  { time: 33, text: "I never knew you were the someone waiting for me" }
];

// 🌈 Beat visualizer setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const source = audioContext.createMediaElementSource(audio);
const analyser = audioContext.createAnalyser();
source.connect(analyser);
analyser.connect(audioContext.destination);

const dataArray = new Uint8Array(analyser.frequencyBinCount);

// ✨ Sparkle effect setup
let sparkles = [];
function createSparkle() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2,
    speed: Math.random() * 1 + 0.5,
    alpha: Math.random()
  };
}
for (let i = 0; i < 100; i++) sparkles.push(createSparkle());

function drawSparkles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  sparkles.forEach(s => {
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    s.y -= s.speed;
    if (s.y < 0) {
      s.y = canvas.height;
      s.x = Math.random() * canvas.width;
    }
  });
}

// 🎶 Beat detection + lyric sync
let currentLine = 0;

function animate() {
  requestAnimationFrame(animate);
  analyser.getByteFrequencyData(dataArray);
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const beat = average / 150;

  pulse.style.transform = `translate(-50%, -50%) scale(${1 + beat * 0.4})`;
  drawSparkles();

  const currentTime = audio.currentTime;
  if (currentLine < lyrics.length && currentTime >= lyrics[currentLine].time) {
    lyricsEl.style.opacity = 0;
    setTimeout(() => {
      lyricsEl.textContent = lyrics[currentLine].text;
      lyricsEl.style.opacity = 1;
    }, 300);
    currentLine++;
  }
}

animate();

// Resume AudioContext after user interaction
document.body.addEventListener('click', () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
});
