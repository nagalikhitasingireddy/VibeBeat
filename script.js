const audio = document.getElementById("audio");
const lyricsDiv = document.getElementById("lyrics");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

// Resize canvas
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Load lyrics JSON
fetch("assets/lyrics/perfect.json")
  .then(res => res.json())
  .then(lyrics => {
    audio.ontimeupdate = () => {
      const current = audio.currentTime;
      const line = lyrics.find(l => current >= l.time && current < l.time + 5);
      if (line) lyricsDiv.innerText = line.line;

      // 🎨 Dynamic background based on time
      const hue = (current * 20) % 360;
      document.body.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 40%), hsl(${(hue + 100) % 360}, 70%, 50%))`;
    };
  });

// 🎵 Audio Visualizer
const audioCtx = new AudioContext();
const src = audioCtx.createMediaElementSource(audio);
const analyser = audioCtx.createAnalyser();

src.connect(analyser);
analyser.connect(audioCtx.destination);
analyser.fftSize = 256;

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

function animate() {
  requestAnimationFrame(animate);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = dataArray[i] * 1.5;
    const hue = i * 3;
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
    x += barWidth + 1;
  }
}

animate();

// Resume audio context when user interacts
document.body.addEventListener("click", () => {
  if (audioCtx.state === "suspended") audioCtx.resume();
});
