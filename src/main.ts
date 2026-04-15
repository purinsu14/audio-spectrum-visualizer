const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const waveformCanvas = document.getElementById("waveform") as HTMLCanvasElement;
const frequencyCanvas = document.getElementById("frequency") as HTMLCanvasElement;
const waveCtx = waveformCanvas.getContext("2d")!;
const freqCtx = frequencyCanvas.getContext("2d")!;

startBtn.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();

  analyser.fftSize = 2048;
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const timeData = new Uint8Array(bufferLength);
  const freqData = new Uint8Array(bufferLength);

  const smoothedData = new Float32Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    // find highest value
    let maxVal = -1;
    let maxIndex = 1;
    for (let i = 0; i < bufferLength; i++) {
      const val = freqData[i] ?? 0;
      if (val > maxVal) {
        maxVal = val;
        maxIndex = i;
      }
    }

    // convert into Hz
    // Formula: frequency = index * (sampleRate / fftSize)
    const nyquist = audioCtx.sampleRate / 2;
    const peakHz = Math.round(maxIndex * (audioCtx.sampleRate / analyser.fftSize));

    // clear waveformCanvas and draw timeData as a wave
    // loop through timeData, each value is 0-255, 128 = silence
    waveCtx.fillStyle = "rgb(20, 20, 20)"; // dark bg
    waveCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

    waveCtx.lineWidth = 2;
    waveCtx.strokeStyle = "rgb(0, 255, 0)"; // Green wave
    waveCtx.beginPath();

    const sliceWidth = waveformCanvas.width / bufferLength;
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = (timeData[i] ?? 128) / 128.0;
      const y = (v * waveformCanvas.height) / 2;

      if (i === 0) {
        waveCtx.moveTo(x, y);
      } else {
        waveCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    waveCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
    waveCtx.stroke();

    waveCtx.fillStyle = "white";
    waveCtx.font = "12px monospace";
    waveCtx.fillText("TIME DOMAIN", 10, 20);
    waveCtx.fillText("silence = flat line", 10, 40);

    // clear frequencyCanvas and draw freqData as vertical bars
    // each bar's height = freqData[i], spread evenly across canvas width
    freqCtx.fillStyle = "rgb(20, 20, 20)"; // dark bg
    freqCtx.fillRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);

    // Draw only the first half of the data (the audible range)
    const drawCount = bufferLength * 0.5; 
    const barWidth = frequencyCanvas.width / drawCount;
    let barX = 0;

    for (let i = 0; i < drawCount; i++) {
      const target = freqData[i] ?? 0;
      const current = smoothedData[i] ?? 0;
      smoothedData[i] = current + (target - current) * 0.15; // Slightly faster smoothing
      const barHeight = (smoothedData[i]! / 255) * frequencyCanvas.height;

      // Color based on frequency (i)
      const hue = (i / drawCount) * 360;
      freqCtx.fillStyle = `hsl(${hue}, 80%, 50%)`; 
  
      freqCtx.fillRect(barX, frequencyCanvas.height - barHeight, barWidth, barHeight);
      barX += barWidth;
    }

    freqCtx.fillStyle = "white";
    freqCtx.font = "12px monospace";
    freqCtx.fillText("FREQUENCY DOMAIN (FFT)", 10, 20);
    freqCtx.fillText("BASS", 10, frequencyCanvas.height - 10);
    freqCtx.fillText("TREBLE", frequencyCanvas.width - 55, frequencyCanvas.height - 10);
    freqCtx.fillText(`MAX DETECTABLE: ${nyquist} Hz`, 10, 70);
    
    freqCtx.fillStyle = "white";
    freqCtx.font = "bold 16px monospace";
    if (maxVal > 30) {
      freqCtx.fillText(`PEAK: ${peakHz} Hz`, 10, 50);
    } else {
      freqCtx.fillText(`PEAK: -- Hz`, 10, 50);
      }
  }

  draw();
  startBtn.disabled = true;
  startBtn.textContent = "Listening...";
});
