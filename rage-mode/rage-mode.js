/*
 * Rage Mode — paste this whole file into the browser developer console.
 * 1 = pistol, 2 = bazooka, R = restore, Esc = exit.
 * Visual effect only: it changes the current browser tab, not the website.
 */
(() => {
  if (window.__rageMode?.destroy) {
    window.__rageMode.destroy();
    return;
  }

  const prefix = '__rage_mode_';
  const damaged = new Map();
  const timers = new Set();
  let weapon = 'pistol';
  let active = true;

  const style = document.createElement('style');
  style.id = prefix + 'style';
  style.textContent = `
    @keyframes rage-fall {
      0% { opacity: 1; transform: translate(0, 0) rotate(0); filter: brightness(1); }
      18% { filter: brightness(2.3); }
      100% { opacity: 0; transform: translate(var(--rage-dx), var(--rage-dy)) rotate(var(--rage-rot)); filter: brightness(.4); }
    }
    @keyframes rage-spark {
      to { opacity: 0; transform: translate(var(--rage-x), var(--rage-y)) rotate(var(--rage-spin)) scale(.25); }
    }
    @keyframes rage-ring {
      to { opacity: 0; transform: translate(-50%, -50%) scale(2.8); }
    }
    @keyframes rage-flash { to { opacity: 0; } }
    .${prefix}damaged {
      animation: rage-fall 520ms cubic-bezier(.15,.7,.3,1) forwards !important;
      pointer-events: none !important;
    }
    #${prefix}hud {
      position: fixed !important; top: 18px !important; left: 18px !important;
      z-index: 2147483647 !important; display: flex !important; align-items: center !important;
      gap: 7px !important; padding: 10px 12px !important; border: 1px solid #ff694d !important;
      border-radius: 12px !important; background: #181717f2 !important; color: white !important;
      box-shadow: 0 8px 28px #0008 !important; font: 600 13px/1.2 system-ui,sans-serif !important;
      user-select: none !important;
    }
    #${prefix}hud button {
      all: unset !important; box-sizing: border-box !important; cursor: pointer !important;
      border-radius: 7px !important; padding: 7px 9px !important;
      background: #343030 !important; color: white !important;
      font: 600 12px system-ui,sans-serif !important;
    }
    #${prefix}hud button[aria-pressed="true"] { background: #ff5d3f !important; color: #1b0d09 !important; }
    #${prefix}hud button:hover { filter: brightness(1.2) !important; }
    #${prefix}hud small { color: #c9c1be !important; font: 11px system-ui,sans-serif !important; }
    #${prefix}crosshair {
      position: fixed !important; z-index: 2147483646 !important; pointer-events: none !important;
      width: 28px !important; height: 28px !important; border: 2px solid #ff5d3f !important;
      border-radius: 50% !important; box-shadow: 0 0 0 1px #220a06, 0 0 18px #ff5d3faa !important;
      transform: translate(-50%, -50%) !important; left: -50px; top: -50px;
    }
    #${prefix}crosshair::before, #${prefix}crosshair::after {
      content: "" !important; position: absolute !important; background: #ff5d3f !important;
    }
    #${prefix}crosshair::before { width: 2px !important; height: 42px !important; left: 11px !important; top: -9px !important; }
    #${prefix}crosshair::after { width: 42px !important; height: 2px !important; left: -9px !important; top: 11px !important; }
    .${prefix}particle, .${prefix}ring, .${prefix}flash {
      position: fixed !important; z-index: 2147483645 !important; pointer-events: none !important;
    }
    .${prefix}particle { width: 7px; height: 7px; background: #ffb24b; animation: rage-spark 550ms ease-out forwards; }
    .${prefix}ring { width: 50px; height: 50px; border: 3px solid #ff6c3d; border-radius: 50%; animation: rage-ring 450ms ease-out forwards; }
    .${prefix}flash { inset: 0; background: radial-gradient(circle at var(--rage-fx) var(--rage-fy), #fff9 0, #ff724466 15%, transparent 45%); animation: rage-flash 380ms ease-out forwards; }
  `;
  document.head.append(style);

  const hud = document.createElement('div');
  hud.id = prefix + 'hud';
  hud.innerHTML = `
    <span>💥 RAGE MODE</span>
    <button type="button" data-weapon="pistol" aria-pressed="true">🔫 Pistole · 1</button>
    <button type="button" data-weapon="bazooka" aria-pressed="false">🚀 Bazooka · 2</button>
    <button type="button" data-action="restore">↶ Reset · R</button>
    <button type="button" data-action="exit">×</button>
    <small>Esc beendet</small>
  `;
  document.body.append(hud);

  const crosshair = document.createElement('div');
  crosshair.id = prefix + 'crosshair';
  document.body.append(crosshair);

  function later(fn, ms) {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms);
    timers.add(timer);
  }

  function setWeapon(next) {
    weapon = next;
    for (const button of hud.querySelectorAll('[data-weapon]')) {
      button.setAttribute('aria-pressed', String(button.dataset.weapon === weapon));
    }
    crosshair.style.width = weapon === 'bazooka' ? '44px' : '28px';
    crosshair.style.height = weapon === 'bazooka' ? '44px' : '28px';
  }

  function spawnEffect(x, y, big) {
    const ring = document.createElement('div');
    ring.className = prefix + 'ring';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    ring.style.width = ring.style.height = (big ? 108 : 48) + 'px';
    ring.style.transform = 'translate(-50%, -50%)';
    document.body.append(ring);
    later(() => ring.remove(), 650);

    const amount = big ? 34 : 12;
    for (let i = 0; i < amount; i++) {
      const particle = document.createElement('div');
      particle.className = prefix + 'particle';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.background = ['#ffdf83', '#ff8d43', '#f34a2e', '#555'][i % 4];
      const angle = Math.random() * Math.PI * 2;
      const distance = (big ? 55 : 20) + Math.random() * (big ? 175 : 80);
      particle.style.setProperty('--rage-x', Math.cos(angle) * distance + 'px');
      particle.style.setProperty('--rage-y', Math.sin(angle) * distance + 'px');
      particle.style.setProperty('--rage-spin', (Math.random() * 720 - 360) + 'deg');
      document.body.append(particle);
      later(() => particle.remove(), 700);
    }

    if (big) {
      const flash = document.createElement('div');
      flash.className = prefix + 'flash';
      flash.style.setProperty('--rage-fx', x + 'px');
      flash.style.setProperty('--rage-fy', y + 'px');
      document.body.append(flash);
      later(() => flash.remove(), 450);
    }
  }

  function pickElement(x, y) {
    let element = document.elementFromPoint(x, y);
    while (element && element !== document.body && element !== document.documentElement) {
      if (element === hud || hud.contains(element) || element === crosshair) return null;
      const rect = element.getBoundingClientRect();
      if (rect.width >= 24 && rect.height >= 18 &&
          rect.width < window.innerWidth * .86 &&
          rect.height < window.innerHeight * .75) return element;
      element = element.parentElement;
    }
    return null;
  }

  function rememberStyle(element, name) {
    return {
      value: element.style.getPropertyValue(name),
      priority: element.style.getPropertyPriority(name)
    };
  }
  function putStyleBack(element, name, original) {
    if (original.value) element.style.setProperty(name, original.value, original.priority);
    else element.style.removeProperty(name);
  }

  function damage(element) {
    if (!element || damaged.has(element)) return;
    const original = {
      dx: rememberStyle(element, '--rage-dx'),
      dy: rememberStyle(element, '--rage-dy'),
      rot: rememberStyle(element, '--rage-rot'),
      visibility: rememberStyle(element, 'visibility')
    };
    damaged.set(element, original);
    element.style.setProperty('--rage-dx', ((Math.random() - .5) * 180) + 'px');
    element.style.setProperty('--rage-dy', (70 + Math.random() * 160) + 'px');
    element.style.setProperty('--rage-rot', ((Math.random() - .5) * 55) + 'deg');
    element.classList.add(prefix + 'damaged');
    later(() => { if (damaged.get(element) === original) element.style.visibility = 'hidden'; }, 520);
  }

  function restore() {
    for (const [element, original] of damaged) {
      element.classList.remove(prefix + 'damaged');
      putStyleBack(element, '--rage-dx', original.dx);
      putStyleBack(element, '--rage-dy', original.dy);
      putStyleBack(element, '--rage-rot', original.rot);
      putStyleBack(element, 'visibility', original.visibility);
    }
    damaged.clear();
  }

  function destroy() {
    if (!active) return;
    active = false;
    restore();
    window.removeEventListener('pointerdown', block, true);
    window.removeEventListener('pointerup', block, true);
    window.removeEventListener('click', shoot, true);
    window.removeEventListener('contextmenu', block, true);
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('keydown', keydown, true);
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    document.querySelectorAll('.' + prefix + 'particle, .' + prefix + 'ring, .' + prefix + 'flash').forEach(el => el.remove());
    hud.remove();
    crosshair.remove();
    style.remove();
    delete window.__rageMode;
  }

  function isHud(event) { return hud.contains(event.target); }
  function block(event) {
    if (isHud(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function move(event) {
    crosshair.style.left = event.clientX + 'px';
    crosshair.style.top = event.clientY + 'px';
    crosshair.style.display = isHud(event) ? 'none' : 'block';
  }
  function shoot(event) {
    if (isHud(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const x = event.clientX;
    const y = event.clientY;
    const big = weapon === 'bazooka';
    spawnEffect(x, y, big);
    if (!big) {
      damage(pickElement(x, y));
      return;
    }
    const points = [[0, 0]];
    for (const radius of [42, 88, 132]) {
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
      }
    }
    const targets = new Set();
    for (const [dx, dy] of points) {
      const target = pickElement(x + dx, y + dy);
      if (target) targets.add(target);
    }
    for (const target of targets) damage(target);
  }
  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); destroy(); }
    else if (event.key.toLowerCase() === 'r') { event.preventDefault(); restore(); }
    else if (event.key === '1') { event.preventDefault(); setWeapon('pistol'); }
    else if (event.key === '2') { event.preventDefault(); setWeapon('bazooka'); }
  }

  hud.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.weapon) setWeapon(button.dataset.weapon);
    else if (button.dataset.action === 'restore') restore();
    else if (button.dataset.action === 'exit') destroy();
  });
  window.addEventListener('pointerdown', block, true);
  window.addEventListener('pointerup', block, true);
  window.addEventListener('click', shoot, true);
  window.addEventListener('contextmenu', block, true);
  window.addEventListener('pointermove', move, true);
  window.addEventListener('keydown', keydown, true);
  window.__rageMode = { destroy, restore, setWeapon };
})();
