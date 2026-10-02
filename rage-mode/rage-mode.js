/*
 * Rage Mode — paste this whole file into the browser developer console.
 * 1 = pistol, 2 = bazooka, 3 = chart battle, R = restore, Esc = exit.
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
  const selectedCharts = [];
  let weapon = 'pistol';
  let active = true;
  let arena = null;
  let battleToken = 0;

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
    @keyframes rage-duel-left { 50% { transform: translateX(34px) rotate(4deg) scale(1.05); } }
    @keyframes rage-duel-right { 50% { transform: translateX(-34px) rotate(-4deg) scale(1.05); } }
    @keyframes rage-duel-hit { 35% { transform: translateX(16px) rotate(8deg); filter: brightness(1.8); } }
    @keyframes rage-duel-impact { to { opacity: 0; transform: translate(-50%, -85%) scale(2.1) rotate(25deg); } }
    .${prefix}damaged {
      animation: rage-fall 520ms cubic-bezier(.15,.7,.3,1) forwards !important;
      pointer-events: none !important;
    }
    #${prefix}hud {
      position: fixed !important; top: 18px !important; left: 18px !important;
      z-index: 2147483647 !important; display: flex !important; flex-wrap: wrap !important;
      max-width: calc(100vw - 36px) !important; align-items: center !important;
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
    .${prefix}selected { outline: 4px solid #ff914d !important; outline-offset: 5px !important; }
    #${prefix}arena {
      position: fixed !important; inset: 0 !important; z-index: 2147483647 !important;
      display: grid !important; place-items: center !important; padding: 20px !important;
      background: radial-gradient(circle at center, #49201bf5, #100d12f8 75%) !important;
      color: white !important; font-family: system-ui,sans-serif !important;
    }
    #${prefix}arena * { box-sizing: border-box !important; }
    #${prefix}arena .${prefix}battle-box { width: min(900px, 100%) !important; text-align: center !important; }
    #${prefix}arena .${prefix}battle-title { margin: 0 0 12px !important; font: 900 clamp(32px,6vw,60px)/1 system-ui,sans-serif !important; color: #ffae72 !important; }
    #${prefix}arena .${prefix}battle-status { min-height: 34px !important; margin: 0 0 22px !important; font: 700 20px system-ui,sans-serif !important; }
    #${prefix}arena .${prefix}battle-stage { display: flex !important; justify-content: center !important; align-items: center !important; gap: 20px !important; }
    #${prefix}arena .${prefix}fighter {
      position: relative !important; width: min(39vw,340px) !important; min-width: 180px !important;
      padding: 14px !important; border: 3px solid #ff8553 !important; border-radius: 19px !important;
      background: #fff !important; color: #1c1520 !important; box-shadow: 0 20px 50px #0009 !important;
    }
    #${prefix}arena .${prefix}fighter.right { border-color: #7bd5ff !important; }
    #${prefix}arena .${prefix}fighter.attack.left { animation: rage-duel-left 480ms ease-in-out !important; }
    #${prefix}arena .${prefix}fighter.attack.right { animation: rage-duel-right 480ms ease-in-out !important; }
    #${prefix}arena .${prefix}fighter.hit { animation: rage-duel-hit 480ms ease-in-out !important; }
    #${prefix}arena .${prefix}fighter.knockout { opacity: .35 !important; transform: rotate(12deg) translateY(35px) !important; }
    #${prefix}arena .${prefix}fighter.winner { box-shadow: 0 0 0 5px #ffd068, 0 20px 50px #0009 !important; }
    #${prefix}arena .${prefix}fighter-name { min-height: 46px !important; font: 800 17px/1.2 system-ui,sans-serif !important; overflow: hidden !important; }
    #${prefix}arena .${prefix}health { height: 11px !important; overflow: hidden !important; border-radius: 99px !important; background: #ddd !important; margin: 8px 0 14px !important; }
    #${prefix}arena .${prefix}health > span { display: block !important; width: 100%; height: 100%; background: #ff7446 !important; transition: width 360ms !important; }
    #${prefix}arena .${prefix}fighter.right .${prefix}health > span { background: #3fb9eb !important; }
    #${prefix}arena .${prefix}preview { position: relative !important; display: grid !important; place-items: center !important; height: 160px !important; overflow: hidden !important; background: #fff !important; }
    #${prefix}arena .${prefix}preview > svg, #${prefix}arena .${prefix}preview > canvas { max-width: 100% !important; max-height: 100% !important; }
    #${prefix}arena .${prefix}preview-bars { display: flex !important; align-items: end !important; gap: 8px !important; width: 100% !important; height: 100% !important; padding: 15px !important; }
    #${prefix}arena .${prefix}preview-bars > i { flex: 1 !important; height: var(--rage-bar-height) !important; background: linear-gradient(#ffb36b,#ff623e) !important; border-radius: 5px 5px 0 0 !important; }
    #${prefix}arena .${prefix}fighter.right .${prefix}preview-bars > i { background: linear-gradient(#9ae1ff,#419de0) !important; }
    #${prefix}arena .${prefix}fists { margin-top: 8px !important; font-size: 32px !important; }
    #${prefix}arena .${prefix}versus { font: 900 clamp(30px,5vw,56px) system-ui,sans-serif !important; color: #ffda8f !important; }
    #${prefix}arena .${prefix}battle-impact { position: absolute !important; top: 35% !important; left: 50% !important; z-index: 1 !important; font-size: 50px !important; transform: translate(-50%,-50%) !important; animation: rage-duel-impact 500ms ease-out forwards !important; }
    #${prefix}arena .${prefix}battle-controls { display: flex !important; justify-content: center !important; gap: 10px !important; margin-top: 26px !important; }
    #${prefix}arena button { cursor: pointer !important; border: 1px solid #ffb083 !important; border-radius: 9px !important; background: #3b2727 !important; color: white !important; padding: 10px 16px !important; font: 700 14px system-ui,sans-serif !important; }
    #${prefix}arena button:hover { background: #744033 !important; }
    @media (max-width: 560px) {
      #${prefix}arena .${prefix}battle-stage { gap: 6px !important; }
      #${prefix}arena .${prefix}fighter { min-width: 0 !important; width: 44vw !important; padding: 7px !important; }
      #${prefix}arena .${prefix}preview { height: 110px !important; }
    }
  `;
  document.head.append(style);

  const hud = document.createElement('div');
  hud.id = prefix + 'hud';
  hud.innerHTML = `
    <span>💥 RAGE MODE</span>
    <button type="button" data-weapon="pistol" aria-pressed="true">🔫 Pistole · 1</button>
    <button type="button" data-weapon="bazooka" aria-pressed="false">🚀 Bazooka · 2</button>
    <button type="button" data-weapon="battle" aria-pressed="false">📊 Graph-Fight · 3</button>
    <button type="button" data-action="restore">↶ Reset · R</button>
    <button type="button" data-action="exit">×</button>
    <small id="${prefix}hint">Esc beendet</small>
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
    if (weapon === 'battle' && next !== 'battle') closeBattle();
    weapon = next;
    for (const button of hud.querySelectorAll('[data-weapon]')) {
      button.setAttribute('aria-pressed', String(button.dataset.weapon === weapon));
    }
    crosshair.style.width = weapon === 'bazooka' ? '44px' : '28px';
    crosshair.style.height = weapon === 'bazooka' ? '44px' : '28px';
    hud.querySelector('#' + prefix + 'hint').textContent =
      weapon === 'battle' ? 'Zwei Graphen anklicken' : 'Esc beendet';
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

  function pickChart(x, y) {
    let element = document.elementFromPoint(x, y);
    let fallback = null;
    while (element && element !== document.body && element !== document.documentElement) {
      if (hud.contains(element) || arena?.contains(element)) return null;
      const rect = element.getBoundingClientRect();
      if (rect.width >= 150 && rect.height >= 90 &&
          rect.width < window.innerWidth * .9 && rect.height < window.innerHeight * .85) {
        fallback ||= element;
        const graphics = element.matches('svg,canvas') ? [element] :
          Array.from(element.querySelectorAll('svg,canvas'));
        if (graphics.some(graphic => {
          const size = graphic.getBoundingClientRect();
          return size.width >= 120 && size.height >= 70;
        })) return element;
      }
      element = element.parentElement;
    }
    return fallback;
  }

  function chartLabel(element, number) {
    for (let current = element, depth = 0; current && depth < 4; current = current.parentElement, depth++) {
      const heading = current.querySelector?.('h1,h2,h3,h4,h5,h6,[role="heading"]');
      const label = heading?.textContent?.trim() || current.getAttribute?.('aria-label');
      if (label && label.length < 90) return label.slice(0, 44);
    }
    return 'Graph ' + number;
  }

  function chartPreview(source) {
    const preview = document.createElement('div');
    preview.className = prefix + 'preview';
    const graphics = source.matches('svg,canvas') ? [source] :
      Array.from(source.querySelectorAll('svg,canvas'));
    const graphic = graphics
      .filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.width >= 120 && rect.height >= 70;
      })
      .sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return bRect.width * bRect.height - aRect.width * aRect.height;
      })[0];
    if (graphic?.tagName.toLowerCase() === 'svg') {
      const copy = graphic.cloneNode(true);
      copy.style.width = '100%';
      copy.style.height = '100%';
      preview.append(copy);
    } else if (graphic?.tagName.toLowerCase() === 'canvas') {
      const copy = document.createElement('canvas');
      copy.width = 480;
      copy.height = 220;
      try { copy.getContext('2d').drawImage(graphic, 0, 0, copy.width, copy.height); }
      catch { /* Some embedded charts prohibit pixel copying. */ }
      preview.append(copy);
    } else if (source.textContent.length < 2500) {
      const rect = source.getBoundingClientRect();
      const copy = source.cloneNode(true);
      const scale = Math.min(320 / rect.width, 160 / rect.height, 1);
      copy.style.position = 'absolute';
      copy.style.left = '0';
      copy.style.top = '0';
      copy.style.width = rect.width + 'px';
      copy.style.height = rect.height + 'px';
      copy.style.transformOrigin = 'top left';
      copy.style.transform = 'scale(' + scale + ')';
      copy.style.pointerEvents = 'none';
      preview.append(copy);
    } else {
      const bars = document.createElement('div');
      bars.className = prefix + 'preview-bars';
      for (let i = 0; i < 7; i++) {
        const bar = document.createElement('i');
        bar.style.setProperty('--rage-bar-height', (25 + Math.random() * 70) + '%');
        bars.append(bar);
      }
      preview.append(bars);
    }
    return preview;
  }

  function closeBattle() {
    battleToken++;
    arena?.remove();
    arena = null;
    for (const chart of selectedCharts) chart.element.classList.remove(prefix + 'selected');
    selectedCharts.length = 0;
    if (active && weapon === 'battle') {
      hud.querySelector('#' + prefix + 'hint').textContent = 'Zwei Graphen anklicken';
    }
  }

  function selectChart(x, y) {
    const element = pickChart(x, y);
    const hint = hud.querySelector('#' + prefix + 'hint');
    if (!element) { hint.textContent = 'Direkt auf ein Diagramm klicken'; return; }
    if (selectedCharts.some(chart => chart.element === element ||
        chart.element.contains(element) || element.contains(chart.element))) {
      hint.textContent = 'Einen anderen Graphen wählen';
      return;
    }
    const chart = {
      element,
      label: chartLabel(element, selectedCharts.length + 1),
      preview: chartPreview(element)
    };
    selectedCharts.push(chart);
    element.classList.add(prefix + 'selected');
    hint.textContent = selectedCharts.length === 1 ? 'Jetzt den Gegner anklicken' : 'Kampf!';
    if (selectedCharts.length === 2) openBattle();
  }

  function fighter(chart, side) {
    const card = document.createElement('div');
    card.className = prefix + 'fighter ' + side;
    card.innerHTML = `<div class="${prefix}fighter-name"></div><div class="${prefix}health"><span></span></div><div class="${prefix}fists">🥊</div>`;
    card.querySelector('.' + prefix + 'fighter-name').textContent = chart.label;
    card.insertBefore(chart.preview, card.querySelector('.' + prefix + 'fists'));
    return card;
  }

  function openBattle() {
    arena = document.createElement('div');
    arena.id = prefix + 'arena';
    arena.setAttribute('role', 'dialog');
    arena.setAttribute('aria-modal', 'true');
    arena.setAttribute('aria-label', 'Graphen-Kampf');
    arena.innerHTML = `<div class="${prefix}battle-box">
      <h2 class="${prefix}battle-title">📊 GRAPH-FIGHT</h2>
      <p class="${prefix}battle-status">Die Graphen betreten die Arena …</p>
      <div class="${prefix}battle-stage"><span class="${prefix}versus">VS</span></div>
      <div class="${prefix}battle-controls">
        <button type="button" data-battle="again">Nochmal kämpfen</button>
        <button type="button" data-battle="close">Zurück zur Seite</button>
      </div>
    </div>`;
    const stage = arena.querySelector('.' + prefix + 'battle-stage');
    stage.prepend(fighter(selectedCharts[0], 'left'));
    stage.append(fighter(selectedCharts[1], 'right'));
    arena.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.battle;
      if (action === 'close') closeBattle();
      else if (action === 'again') runBattle();
    });
    document.body.append(arena);
    runBattle();
  }

  function runBattle() {
    if (!arena) return;
    const token = ++battleToken;
    const cards = Array.from(arena.querySelectorAll('.' + prefix + 'fighter'));
    const bars = cards.map(card => card.querySelector('.' + prefix + 'health > span'));
    const status = arena.querySelector('.' + prefix + 'battle-status');
    const health = [100, 100];
    let turn = 0;
    cards.forEach(card => card.classList.remove('winner', 'knockout', 'attack', 'hit'));
    bars.forEach(bar => { bar.style.width = '100%'; });
    status.textContent = '3 … 2 … 1 … KAMPF!';
    function step() {
      if (!arena || token !== battleToken) return;
      if (turn >= 8 || health[0] <= 0 || health[1] <= 0) {
        const winner = health[0] === health[1] ? Math.floor(Math.random() * 2) :
          (health[0] > health[1] ? 0 : 1);
        cards[winner].classList.add('winner');
        cards[1 - winner].classList.add('knockout');
        status.textContent = '🏆 ' + selectedCharts[winner].label + ' gewinnt!';
        return;
      }
      const attacker = turn % 2;
      const defender = 1 - attacker;
      health[defender] = Math.max(0, health[defender] - 14 - Math.floor(Math.random() * 18));
      bars[defender].style.width = health[defender] + '%';
      cards.forEach(card => card.classList.remove('attack', 'hit'));
      void cards[attacker].offsetWidth;
      cards[attacker].classList.add('attack');
      cards[defender].classList.add('hit');
      const impact = document.createElement('span');
      impact.className = prefix + 'battle-impact';
      impact.textContent = '💥';
      cards[defender].append(impact);
      status.textContent = selectedCharts[attacker].label + ' landet einen Treffer!';
      later(() => impact.remove(), 550);
      turn++;
      later(step, 650);
    }
    later(step, 700);
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
    closeBattle();
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

  function isUi(event) { return hud.contains(event.target) || !!arena?.contains(event.target); }
  function block(event) {
    if (isUi(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function move(event) {
    crosshair.style.left = event.clientX + 'px';
    crosshair.style.top = event.clientY + 'px';
    crosshair.style.display = isUi(event) ? 'none' : 'block';
  }
  function shoot(event) {
    if (isUi(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const x = event.clientX;
    const y = event.clientY;
    if (weapon === 'battle') {
      selectChart(x, y);
      return;
    }
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
    else if (event.key === '3') { event.preventDefault(); setWeapon('battle'); }
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
