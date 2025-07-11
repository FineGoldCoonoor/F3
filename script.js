<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Jewelry Try-On</title>
  <style>
    body { margin: 0; overflow: hidden; font-family: sans-serif; }
    video, canvas {
      position: absolute;
      top: 0;
      left: 0;
    }
    .options-group {
      position: fixed;
      bottom: 10px;
      left: 10px;
      display: flex;
      gap: 10px;
      background: rgba(255,255,255,0.9);
      padding: 10px;
      border-radius: 10px;
      z-index: 10;
    }
    .options-group img {
      width: 40px;
      height: 40px;
    }
  </style>
</head>
<body>

<video id="webcam" autoplay muted playsinline></video>
<canvas id="overlay"></canvas>

<div id="earring-options" class="options-group"></div>
<div id="necklace-options" class="options-group"></div>

<script type="module">
  import { FaceMesh } from 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';

  const video = document.getElementById('webcam');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');

  let currentMode = 'earring';
  let earringImg = null, necklaceImg = null;
  let lastLandmarks = null;
  let frameBuffer = 0, maxBuffer = 5;

  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function drawJewelry(landmarks) {
    if (!landmarks || (!earringImg && !necklaceImg)) return;
    const w = canvas.width, h = canvas.height;

    const leftEar = { x: landmarks[132].x * w, y: landmarks[132].y * h + 18 };
    const rightEar = { x: landmarks[361].x * w, y: landmarks[361].y * h + 18 };
    const neck = { x: landmarks[152].x * w, y: landmarks[152].y * h + 42 };

    if (currentMode === 'earring' && earringImg?.complete) {
      const scale = 0.04;
      const ew = earringImg.width * scale;
      const eh = earringImg.height * scale;
      ctx.drawImage(earringImg, leftEar.x - ew / 2, leftEar.y, ew, eh);
      ctx.drawImage(earringImg, rightEar.x - ew / 2, rightEar.y, ew, eh);
    }

    if (currentMode === 'necklace' && necklaceImg?.complete) {
      const scale = 0.1;
      const nw = necklaceImg.width * scale;
      const nh = necklaceImg.height * scale;
      ctx.drawImage(necklaceImg, neck.x - nw / 2, neck.y, nw, nh);
    }
  }

  function areLandmarksStable(newL, oldL, threshold = 0.004) {
    if (!newL || !oldL) return false;
    let totalDiff = 0;
    for (let i = 0; i < newL.length; i++) {
      totalDiff += Math.abs(newL[i].x - oldL[i].x);
      totalDiff += Math.abs(newL[i].y - oldL[i].y);
    }
    return totalDiff / newL.length < threshold;
  }

  const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  faceMesh.onResults(results => {
    const detected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
    if (detected) {
      const newLandmarks = results.multiFaceLandmarks[0];
      if (!lastLandmarks || areLandmarksStable(newLandmarks, lastLandmarks)) {
        lastLandmarks = newLandmarks;
        frameBuffer = maxBuffer;
      } else {
        frameBuffer = Math.max(0, frameBuffer - 1);
      }
    } else {
      frameBuffer = Math.max(0, frameBuffer - 1);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (frameBuffer > 0 && lastLandmarks) {
      drawJewelry(lastLandmarks);
    }
  });

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      video.onloadedmetadata = () => {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const render = async () => {
          await faceMesh.send({ image: video });
          requestAnimationFrame(render);
        };
        render();
      };
    } catch (err) {
      alert("Camera access denied or unavailable.");
      console.error(err);
    }
  }

  function setupJewelryUI() {
    const earringOptions = document.getElementById('earring-options');
    const necklaceOptions = document.getElementById('necklace-options');

    for (let i = 1; i <= 5; i++) {
      const eBtn = document.createElement('button');
      const eImg = document.createElement('img');
      eImg.src = `earrings/earring${i}.png`;
      eBtn.appendChild(eImg);
      eBtn.onclick = () => {
        currentMode = 'earring';
        loadImage(eImg.src).then(img => earringImg = img);
      };
      earringOptions.appendChild(eBtn);
    }

    for (let i = 1; i <= 5; i++) {
      const nBtn = document.createElement('button');
      const nImg = document.createElement('img');
      nImg.src = `necklaces/necklace${i}.png`;
      nBtn.appendChild(nImg);
      nBtn.onclick = () => {
        currentMode = 'necklace';
        loadImage(nImg.src).then(img => necklaceImg = img);
      };
      neckla
