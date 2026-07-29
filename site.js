(() => {
  "use strict";

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    touchStartY = event.changedTouches[0].clientY;
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  window.addEventListener("touchend", (event) => {
    if (!entered) return;
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
    };
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
      const px = cx + rx * base * pulse * perspective;
      const py = cy + point.y * base * pulse * perspective + Math.sin(time * 0.001 + point.drift) * 1.1;
      const depth = Math.max(0.2, Math.min(1, (rz + 13) / 26));
      ctx.beginPath();
      ctx.fillStyle = `rgba(${220 + depth * 35}, ${62 + depth * 78}, ${132 + depth * 82}, ${point.alpha * (0.4 + depth * 0.6)})`;
      ctx.shadowBlur = point.size * 5;
      ctx.shadowColor = "rgba(255, 70, 157, .72)";
      ctx.arc(px, py, point.size * (0.8 + depth), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
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

  const meteors = [
    { offset: 0.1, speed: 0.000045, y: 0.2 },
    { offset: 0.56, speed: 0.000035, y: 0.36 },
    { offset: 0.82, speed: 0.000052, y: 0.14 },
  ];

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

    if (!reducedMotion) {
      for (const meteor of meteors) {
        const progress = (time * meteor.speed + meteor.offset) % 1.35;
        if (progress > 1) continue;
        const x = width * (1.15 - progress * 1.25);
        const y = height * (meteor.y + progress * 0.48);
        const gradient = ctx.createLinearGradient(x, y, x + 90, y - 45);
        gradient.addColorStop(0, "rgba(255,255,255,.9)");
        gradient.addColorStop(1, "rgba(170,140,255,0)");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 90, y - 45);
        ctx.stroke();
      }
    }
  }

  function animate(time) {
    drawHeart(time);
    drawSnow(time);
    drawGalaxy(time);
    requestAnimationFrame(animate);
  }

  changePage(0, true);
  requestAnimationFrame(animate);
})();
