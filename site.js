(() => {
  "use strict";

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 760px)").matches;
  const pages = document.getElementById("pages");
  const dots = [...document.querySelectorAll(".page-dot")];
  const nextButton = document.getElementById("nextButton");
  const nextLabel = nextButton.querySelector(".next-label");
  const welcome = document.getElementById("welcome");
  const enterButton = document.getElementById("enterButton");
  const sceneCount = 3;

  let currentPage = 0;
  let wheelLocked = false;
  let touchStartY = 0;
  let touchStartX = 0;
  let entered = false;

  function clampPage(value) {
    return Math.max(0, Math.min(sceneCount - 1, value));
  }

  function changePage(next, force = false) {
    const target = clampPage(next);
    if (!force && target === currentPage) return;
    currentPage = target;
    pages.style.transform = `translate3d(0, -${currentPage * 100}%, 0)`;

    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentPage);
      dot.setAttribute("aria-current", index === currentPage ? "page" : "false");
    });

    const last = currentPage === sceneCount - 1;
    nextButton.classList.toggle("is-last", last);
    nextButton.setAttribute("aria-label", last ? "返回第一幕" : "前往下一幕");
    nextLabel.textContent = last ? "回到开场" : "下一幕";
  }

  enterButton.addEventListener("click", () => {
    entered = true;
    welcome.classList.add("is-hidden");
    changePage(0, true);
    setTimeout(() => welcome.setAttribute("aria-hidden", "true"), 900);
  });

  nextButton.addEventListener("click", () => {
    changePage(currentPage === sceneCount - 1 ? 0 : currentPage + 1);
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => changePage(Number(dot.dataset.page)));
  });
  document.querySelector(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    changePage(0);
  });

  window.addEventListener(
    "wheel",
    (event) => {
      if (!entered || wheelLocked || Math.abs(event.deltaY) < 18) return;
      wheelLocked = true;
      changePage(currentPage + Math.sign(event.deltaY));
      setTimeout(() => { wheelLocked = false; }, 900);
    },
    { passive: true },
  );

  window.addEventListener("touchstart", (event) => {
    if (event.target.closest?.(".tree-wrap")) {
      touchStartY = Number.NaN;
      touchStartX = Number.NaN;
      return;
    }
    touchStartY = event.changedTouches[0].clientY;
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (!entered || Number.isNaN(touchStartY)) return;
    const deltaY = touchStartY - event.changedTouches[0].clientY;
    const deltaX = touchStartX - event.changedTouches[0].clientX;
    if (Math.abs(deltaY) > 46 && Math.abs(deltaY) > Math.abs(deltaX)) {
      changePage(currentPage + Math.sign(deltaY));
    }
  }, { passive: true });

  window.addEventListener("keydown", (event) => {
    if (["ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      changePage(currentPage + 1);
    }
    if (["ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      changePage(currentPage - 1);
    }
  });

  function setupCanvas(id) {
    const canvas = document.getElementById(id);
    const context = canvas.getContext("2d");
    const state = { canvas, context, width: 0, height: 0, dpr: 1 };
    const resize = () => {
      state.dpr = Math.min(devicePixelRatio || 1, 1.75);
      state.width = canvas.clientWidth;
      state.height = canvas.clientHeight;
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return state;
  }

  const heart = setupCanvas("heartCanvas");
  const snow = setupCanvas("snowCanvas");
  const galaxy = setupCanvas("galaxyCanvas");
  const treeCanvas = setupCanvas("treeCanvas");

  const heartPoints = Array.from({ length: mobile ? 520 : 1050 }, () => {
    const t = Math.random() * Math.PI * 2;
    const fill = Math.sqrt(Math.random());
    return {
      x: 16 * Math.sin(t) ** 3 * fill,
      y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * fill,
      z: (Math.random() - 0.5) * 8 * (1 - fill * 0.45),
      size: 0.55 + Math.random() * 1.65,
      alpha: 0.3 + Math.random() * 0.7,
      drift: Math.random() * Math.PI * 2,
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
      velocityY: 0,
      screenX: 0,
      screenY: 0,
    };
  });

  const heartRipples = [];

  function disturbHeart(clientX, clientY) {
    const rect = heart.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let affected = 0;
    for (const point of heartPoints) {
      const dx = point.screenX - x;
      const dy = point.screenY - y;
      const distance = Math.hypot(dx, dy);
      const radius = mobile ? 78 : 105;
      if (distance > radius) continue;
      const force = (1 - distance / radius) * (mobile ? 5.8 : 8.4);
      const angle = distance > 1 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
      point.velocityX += Math.cos(angle) * force;
      point.velocityY += Math.sin(angle) * force;
      affected += 1;
    }
    if (affected > 0) heartRipples.push({ x, y, radius: 8, alpha: 0.7 });
  }

  let heartPointerStart = null;
  heart.canvas.addEventListener("pointerdown", (event) => {
    heartPointerStart = { x: event.clientX, y: event.clientY };
  });
  heart.canvas.addEventListener("pointerup", (event) => {
    if (!heartPointerStart) return;
    if (Math.hypot(event.clientX - heartPointerStart.x, event.clientY - heartPointerStart.y) < 12) {
      disturbHeart(event.clientX, event.clientY);
    }
    heartPointerStart = null;
  });
  heart.canvas.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const rect = heart.canvas.getBoundingClientRect();
    disturbHeart(rect.left + rect.width * (mobile ? 0.5 : 0.76), rect.top + rect.height * (mobile ? 0.67 : 0.5));
  });

  function drawHeart(time) {
    const { context: ctx, width, height } = heart;
    ctx.clearRect(0, 0, width, height);
    if (currentPage !== 0 && !reducedMotion) return;
    const cx = mobile ? width * 0.5 : width * 0.76;
    const cy = mobile ? height * 0.67 : height * 0.5;
    const base = Math.min(width, height) * (mobile ? 0.024 : 0.026);
    const angle = reducedMotion ? -0.25 : time * 0.00028;
    const pulse = 1 + Math.sin(time * 0.0018) * 0.035;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const point of heartPoints) {
      const rx = point.x * cos - point.z * sin;
      const rz = point.x * sin + point.z * cos;
      const perspective = 1 + rz * 0.023;
      point.velocityX += -point.offsetX * 0.018;
      point.velocityY += -point.offsetY * 0.018;
      point.velocityX *= 0.91;
      point.velocityY *= 0.91;
      point.offsetX += point.velocityX;
      point.offsetY += point.velocityY;
      const px = cx + rx * base * pulse * perspective + point.offsetX;
      const py = cy + point.y * base * pulse * perspective + Math.sin(time * 0.001 + point.drift) * 1.1 + point.offsetY;
      point.screenX = px;
      point.screenY = py;
      const depth = Math.max(0.2, Math.min(1, (rz + 13) / 26));
      ctx.beginPath();
      ctx.fillStyle = `rgba(${220 + depth * 35}, ${62 + depth * 78}, ${132 + depth * 82}, ${point.alpha * (0.4 + depth * 0.6)})`;
      ctx.shadowBlur = point.size * 5;
      ctx.shadowColor = "rgba(255, 70, 157, .72)";
      ctx.arc(px, py, point.size * (0.8 + depth), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (let index = heartRipples.length - 1; index >= 0; index -= 1) {
      const ripple = heartRipples[index];
      ripple.radius += 2.6;
      ripple.alpha *= 0.93;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 150, 205, ${ripple.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
      if (ripple.alpha < 0.035) heartRipples.splice(index, 1);
    }
  }

  const snowflakes = Array.from({ length: mobile ? 110 : 210 }, () => ({
    x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 2.4,
    speed: 0.000025 + Math.random() * 0.00007,
    sway: Math.random() * Math.PI * 2, depth: 0.35 + Math.random() * 0.65,
  }));

  function drawSnow(time) {
    const { context: ctx, width, height } = snow;
    ctx.clearRect(0, 0, width, height);
    if (currentPage !== 1 && !reducedMotion) return;
    for (const flake of snowflakes) {
      if (!reducedMotion) flake.y = (flake.y + flake.speed * 16) % 1.04;
      const x = flake.x * width + Math.sin(time * 0.0006 + flake.sway) * 16 * flake.depth;
      const y = flake.y * height;
      ctx.beginPath();
      ctx.fillStyle = `rgba(235, 249, 247, ${0.25 + flake.depth * 0.65})`;
      ctx.arc(x, y, flake.r * flake.depth, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const treePoints = [];
  const ornamentHues = [8, 42, 188, 318, 266];
  for (let layer = 0; layer < 5; layer += 1) {
    const top = -178 + layer * 54;
    const height = 104 + layer * 8;
    const maxRadius = 42 + layer * 28;
    const count = mobile ? 120 : 210;
    for (let index = 0; index < count; index += 1) {
      const progress = Math.pow(Math.random(), 0.78);
      const theta = Math.random() * Math.PI * 2;
      const radius = maxRadius * (0.18 + progress * 0.86) * (0.88 + Math.random() * 0.18);
      treePoints.push({
        type: "needle",
        x: Math.cos(theta) * radius,
        y: top + progress * height,
        z: Math.sin(theta) * radius,
        size: 0.8 + Math.random() * 1.9,
        shade: 0.35 + Math.random() * 0.65,
      });
    }
  }
  for (let index = 0; index < (mobile ? 25 : 40); index += 1) {
    const y = -132 + Math.random() * 275;
    const normalized = (y + 178) / 325;
    const radius = 28 + normalized * 128;
    const theta = Math.random() * Math.PI * 2;
    treePoints.push({
      type: "ornament",
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      size: 3.4 + Math.random() * 2.5,
      hue: ornamentHues[index % ornamentHues.length],
      phase: Math.random() * Math.PI * 2,
    });
  }
  const treeLightCount = mobile ? 90 : 150;
  for (let index = 0; index < treeLightCount; index += 1) {
    const progress = index / (treeLightCount - 1);
    const y = -138 + progress * 278;
    const radius = 34 + progress * 116;
    const theta = progress * Math.PI * 11;
    treePoints.push({
      type: "light",
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      size: 1.2 + (index % 5 === 0 ? 1.1 : 0),
      hue: index % 3 === 0 ? 44 : 168,
      phase: index * 0.37,
    });
  }
  for (let index = 0; index < 70; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const radius = 18 * Math.sqrt(Math.random());
    treePoints.push({
      type: "trunk",
      x: Math.cos(theta) * radius,
      y: 128 + Math.random() * 72,
      z: Math.sin(theta) * radius,
      size: 1.8 + Math.random() * 1.8,
    });
  }

  const treeRotation = {
    yaw: -0.35,
    pitch: 0.06,
    velocityYaw: 0,
    dragging: false,
    x: 0,
    y: 0,
  };

  treeCanvas.canvas.addEventListener("pointerdown", (event) => {
    treeRotation.dragging = true;
    treeRotation.x = event.clientX;
    treeRotation.y = event.clientY;
    treeRotation.velocityYaw = 0;
    treeCanvas.canvas.classList.add("is-dragging");
    treeCanvas.canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  treeCanvas.canvas.addEventListener("pointermove", (event) => {
    if (!treeRotation.dragging) return;
    const dx = event.clientX - treeRotation.x;
    const dy = event.clientY - treeRotation.y;
    treeRotation.yaw += dx * 0.012;
    treeRotation.pitch = Math.max(-0.22, Math.min(0.22, treeRotation.pitch + dy * 0.004));
    treeRotation.velocityYaw = dx * 0.0018;
    treeRotation.x = event.clientX;
    treeRotation.y = event.clientY;
    event.preventDefault();
  });
  const releaseTree = (event) => {
    treeRotation.dragging = false;
    treeCanvas.canvas.classList.remove("is-dragging");
    if (event?.pointerId !== undefined) treeCanvas.canvas.releasePointerCapture?.(event.pointerId);
  };
  treeCanvas.canvas.addEventListener("pointerup", releaseTree);
  treeCanvas.canvas.addEventListener("pointercancel", releaseTree);
  treeCanvas.canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") treeRotation.yaw -= 0.18;
    if (event.key === "ArrowRight") treeRotation.yaw += 0.18;
    if (event.key === "ArrowUp") treeRotation.pitch = Math.max(-0.22, treeRotation.pitch - 0.06);
    if (event.key === "ArrowDown") treeRotation.pitch = Math.min(0.22, treeRotation.pitch + 0.06);
  });

  function projectTreePoint(point, yaw, pitch, scale, centerX, centerY) {
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const x = point.x * cosYaw + point.z * sinYaw;
    const z = -point.x * sinYaw + point.z * cosYaw;
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const y = point.y * cosPitch - z * sinPitch;
    const depth = point.y * sinPitch + z * cosPitch;
    const perspective = 520 / (520 + depth);
    return {
      ...point,
      x2d: centerX + x * scale * perspective,
      y2d: centerY + y * scale * perspective,
      depth,
      perspective,
    };
  }

  function drawTree(time) {
    const { context: ctx, width, height } = treeCanvas;
    ctx.clearRect(0, 0, width, height);
    if (currentPage !== 1 && !reducedMotion) return;
    if (!treeRotation.dragging && !reducedMotion) {
      treeRotation.yaw += 0.0016 + treeRotation.velocityYaw;
      treeRotation.velocityYaw *= 0.94;
    }
    const scale = Math.min(width / 390, height / 500);
    const centerX = width * 0.5;
    const centerY = height * 0.48;
    const projected = treePoints
      .map((point) => projectTreePoint(point, treeRotation.yaw, treeRotation.pitch, scale, centerX, centerY))
      .sort((a, b) => b.depth - a.depth);

    for (const point of projected) {
      const depthLight = Math.max(0.25, Math.min(1, 0.72 - point.depth / 420));
      if (point.type === "needle") {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${25 + point.shade * 24}, ${104 + point.shade * 92}, ${70 + point.shade * 54}, ${0.42 + depthLight * 0.5})`;
        ctx.arc(point.x2d, point.y2d, point.size * point.perspective * scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (point.type === "trunk") {
        ctx.fillStyle = `rgba(112, 69, 44, ${0.45 + depthLight * 0.45})`;
        ctx.fillRect(point.x2d, point.y2d, point.size * scale, point.size * 2.2 * scale);
      } else {
        const pulse = 0.72 + Math.sin(time * 0.003 + point.phase) * 0.28;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${point.hue}, 92%, ${point.type === "light" ? 74 : 65}%, ${0.58 + pulse * 0.4})`;
        ctx.shadowColor = `hsla(${point.hue}, 95%, 70%, .9)`;
        ctx.shadowBlur = point.type === "light" ? 9 : 14;
        ctx.arc(point.x2d, point.y2d, point.size * point.perspective * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    const star = projectTreePoint({ x: 0, y: -218, z: 0 }, treeRotation.yaw, treeRotation.pitch, scale, centerX, centerY);
    const outer = 13 * scale;
    const inner = 5.6 * scale;
    ctx.save();
    ctx.translate(star.x2d, star.y2d);
    ctx.rotate(time * 0.00035);
    ctx.beginPath();
    for (let pointIndex = 0; pointIndex < 10; pointIndex += 1) {
      const angle = -Math.PI / 2 + pointIndex * Math.PI / 5;
      const radius = pointIndex % 2 === 0 ? outer : inner;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (pointIndex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffd86f";
    ctx.shadowColor = "#ffbd39";
    ctx.shadowBlur = 24;
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  const stars = Array.from({ length: mobile ? 180 : 360 }, () => ({
    x: Math.random(), y: Math.random(), r: 0.35 + Math.random() * 1.5,
    twinkle: Math.random() * Math.PI * 2, hue: Math.random() > 0.7 ? 42 : 250,
  }));

  const galaxyDust = Array.from({ length: mobile ? 180 : 420 }, () => {
    const arm = Math.floor(Math.random() * 4);
    const radius = Math.pow(Math.random(), 0.72);
    return {
      radius,
      theta: arm * (Math.PI / 2) + radius * 6.3 + (Math.random() - 0.5) * 0.62,
      alpha: 0.15 + Math.random() * 0.72,
      size: 0.4 + Math.random() * 1.25,
    };
  });

  const meteorHotspots = [
    { x: 0.62, y: 0.24, hue: 188, direction: 0.55, style: 0, phase: 0.2, cooldown: 0 },
    { x: 0.82, y: 0.34, hue: 318, direction: 2.38, style: 1, phase: 1.7, cooldown: 0 },
    { x: 0.72, y: 0.57, hue: 42, direction: 0.92, style: 2, phase: 3.1, cooldown: 0 },
    { x: 0.9, y: 0.68, hue: 154, direction: 2.62, style: 3, phase: 4.4, cooldown: 0 },
    { x: 0.53, y: 0.74, hue: 266, direction: 0.7, style: 4, phase: 5.5, cooldown: 0 },
  ];
  const interactiveMeteors = [];

  function spawnInteractiveMeteor(hotspot) {
    if (hotspot.cooldown > performance.now()) return;
    const speed = mobile ? 9.5 : 13;
    hotspot.cooldown = performance.now() + 2300;
    interactiveMeteors.push({
      x: hotspot.x * galaxy.width,
      y: hotspot.y * galaxy.height,
      vx: Math.cos(hotspot.direction) * speed,
      vy: -Math.sin(hotspot.direction) * speed,
      hue: hotspot.hue,
      style: hotspot.style,
      life: 1,
      trail: [],
      phase: Math.random() * Math.PI * 2,
    });
  }

  let galaxyPointerStart = null;
  galaxy.canvas.addEventListener("pointerdown", (event) => {
    galaxyPointerStart = { x: event.clientX, y: event.clientY };
  });
  galaxy.canvas.addEventListener("pointerup", (event) => {
    if (!galaxyPointerStart || Math.hypot(event.clientX - galaxyPointerStart.x, event.clientY - galaxyPointerStart.y) > 12) {
      galaxyPointerStart = null;
      return;
    }
    const rect = galaxy.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const nearest = meteorHotspots
      .map((hotspot) => ({ hotspot, distance: Math.hypot(hotspot.x * rect.width - x, hotspot.y * rect.height - y) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest?.distance < (mobile ? 38 : 32)) spawnInteractiveMeteor(nearest.hotspot);
    galaxyPointerStart = null;
  });
  galaxy.canvas.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const available = meteorHotspots.find((hotspot) => hotspot.cooldown <= performance.now());
    if (available) spawnInteractiveMeteor(available);
  });

  function drawMeteorTrail(ctx, meteor) {
    if (meteor.trail.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const widths = [10, 4.5, 1.4];
    const alphas = [0.08, 0.25, 0.9];
    widths.forEach((width, layer) => {
      ctx.beginPath();
      meteor.trail.forEach((point, index) => {
        const wave = meteor.style === 2 ? Math.sin(index * 0.58 + meteor.phase) * (layer + 1) * 1.2 : 0;
        if (index === 0) ctx.moveTo(point.x, point.y + wave);
        else ctx.lineTo(point.x, point.y + wave);
      });
      ctx.strokeStyle = `hsla(${meteor.hue}, 96%, ${layer === 2 ? 90 : 66}%, ${alphas[layer] * meteor.life})`;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.stroke();
    });
    if (meteor.style === 1 || meteor.style === 3) {
      meteor.trail.forEach((point, index) => {
        if (index % (meteor.style === 1 ? 4 : 6) !== 0) return;
        const scatter = Math.sin(index * 4.7 + meteor.phase) * (meteor.style === 3 ? 8 : 4);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${meteor.hue + index * 2}, 100%, 78%, ${(1 - index / meteor.trail.length) * meteor.life * 0.7})`;
        ctx.arc(point.x + scatter, point.y - scatter * 0.45, meteor.style === 3 ? 1.8 : 1.1, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (meteor.style === 4) {
      ctx.strokeStyle = `hsla(${meteor.hue + 55}, 100%, 78%, ${meteor.life * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      meteor.trail.forEach((point, index) => {
        const offset = Math.sin(index * 0.7 + meteor.phase) * 7;
        if (index === 0) ctx.moveTo(point.x, point.y + offset);
        else ctx.lineTo(point.x, point.y + offset);
      });
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = `hsl(${meteor.hue}, 100%, 70%)`;
    ctx.shadowBlur = meteor.style === 2 ? 28 : 18;
    ctx.arc(meteor.x, meteor.y, meteor.style === 2 ? 3.8 : 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGalaxy(time) {
    const { context: ctx, width, height } = galaxy;
    ctx.clearRect(0, 0, width, height);
    if (currentPage !== 2 && !reducedMotion) return;
    for (const star of stars) {
      const alpha = reducedMotion ? 0.65 : 0.3 + (Math.sin(time * 0.0018 + star.twinkle) + 1) * 0.28;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${star.hue}, 85%, 88%, ${alpha})`;
      ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const cx = mobile ? width * 0.53 : width * 0.73;
    const cy = mobile ? height * 0.66 : height * 0.51;
    const maxRadius = Math.min(width, height) * (mobile ? 0.42 : 0.36);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.22);
    ctx.scale(1, 0.35);
    for (const dust of galaxyDust) {
      const spin = reducedMotion ? 0 : time * 0.000035 * (1.15 - dust.radius);
      const radius = dust.radius * maxRadius;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${170 + dust.radius * 70}, ${135 + dust.radius * 85}, 255, ${dust.alpha})`;
      ctx.arc(
        Math.cos(dust.theta + spin) * radius,
        Math.sin(dust.theta + spin) * radius,
        dust.size * (1.3 - dust.radius * 0.45),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const hotspot of meteorHotspots) {
      if (hotspot.cooldown > time) continue;
      const x = hotspot.x * width;
      const y = hotspot.y * height;
      const pulse = reducedMotion ? 0.5 : (Math.sin(time * 0.003 + hotspot.phase) + 1) * 0.5;
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hotspot.hue}, 100%, 76%, ${0.18 + pulse * 0.34})`;
      ctx.lineWidth = 1;
      ctx.arc(x, y, 8 + pulse * 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = `hsla(${hotspot.hue}, 100%, 86%, .95)`;
      ctx.shadowColor = `hsl(${hotspot.hue}, 100%, 68%)`;
      ctx.shadowBlur = 17 + pulse * 9;
      ctx.arc(x, y, 2.5 + pulse * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (let index = interactiveMeteors.length - 1; index >= 0; index -= 1) {
      const meteor = interactiveMeteors[index];
      meteor.x += meteor.vx;
      meteor.y += meteor.vy;
      meteor.vx *= 1.006;
      meteor.vy *= 1.006;
      meteor.life *= 0.987;
      meteor.trail.unshift({ x: meteor.x, y: meteor.y });
      if (meteor.trail.length > (meteor.style === 2 ? 36 : 28)) meteor.trail.pop();
      drawMeteorTrail(ctx, meteor);
      const outside = meteor.x < -180 || meteor.x > width + 180 || meteor.y < -180 || meteor.y > height + 180;
      if (meteor.life < 0.08 || outside) interactiveMeteors.splice(index, 1);
    }
  }

  function animate(time) {
    drawHeart(time);
    drawSnow(time);
    drawTree(time);
    drawGalaxy(time);
    requestAnimationFrame(animate);
  }

  changePage(0, true);
  requestAnimationFrame(animate);
})();
