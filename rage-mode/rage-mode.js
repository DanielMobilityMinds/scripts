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
    @keyframes rage-brawl-punch-left { 50% { transform: translateX(58px) rotate(10deg); } }
    @keyframes rage-brawl-punch-right { 50% { transform: translateX(-58px) rotate(-10deg); } }
    @keyframes rage-brawl-hit { 25% { transform: translateX(16px) rotate(12deg); filter: brightness(2); } 65% { transform: translateX(-12px) rotate(-8deg); } }
    @keyframes rage-brawl-win { 50% { transform: translateY(-24px) rotate(-8deg); } }
    @keyframes rage-brawl-impact { to { opacity: 0; transform: translate(-50%, -90%) scale(2); } }
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
      overflow: hidden !important; background: transparent !important;
      color: white !important; font-family: system-ui,sans-serif !important; pointer-events: none !important;
    }
    #${prefix}arena * { box-sizing: border-box !important; }
    #${prefix}arena .${prefix}battle-head { position: absolute !important; top: 78px !important; right: 18px !important; max-width: 360px !important; padding: 11px 15px !important; border: 1px solid #ff8855 !important; border-radius: 12px !important; background: #171316ed !important; text-align: center !important; z-index: 3 !important; }
    #${prefix}arena .${prefix}battle-title { margin: 0 0 5px !important; font: 900 20px/1 system-ui,sans-serif !important; color: #ffae72 !important; }
    #${prefix}arena .${prefix}battle-status { margin: 0 !important; font: 700 13px/1.3 system-ui,sans-serif !important; }
    #${prefix}arena .${prefix}person {
      position: absolute !important; z-index: 2 !important; background: var(--rage-bar-color) !important;
      transition: left 850ms cubic-bezier(.2,.8,.2,1), top 850ms cubic-bezier(.2,.8,.2,1),
        width 850ms, height 850ms, border-radius 850ms !important;
      box-shadow: 0 0 0 2px #ffffff50 !important;
    }
    #${prefix}arena .${prefix}person.human { width: 29px !important; height: 66px !important; border-radius: 9px !important; }
    #${prefix}arena .${prefix}person.team-0.human { box-shadow: 0 0 0 3px #ffab65, 0 0 20px #ff7045aa !important; }
    #${prefix}arena .${prefix}person.team-1.human { box-shadow: 0 0 0 3px #83ddff, 0 0 20px #46c2ffaa !important; }
    #${prefix}arena .${prefix}person span { position: absolute !important; opacity: 0 !important; transition: opacity 300ms 560ms !important; }
    #${prefix}arena .${prefix}person.human span { opacity: 1 !important; }
    #${prefix}arena .${prefix}head { left: 1px !important; top: -27px !important; width: 27px !important; height: 27px !important; border-radius: 50% !important; background: #ffd1a1 !important; text-align: center !important; font: 15px/26px system-ui,sans-serif !important; color: #2b1a1b !important; }
    #${prefix}arena .${prefix}arm { top: 9px !important; width: 27px !important; height: 8px !important; background: var(--rage-bar-color) !important; border-radius: 99px !important; }
    #${prefix}arena .${prefix}arm.left { left: -23px !important; transform: rotate(28deg) !important; }
    #${prefix}arena .${prefix}arm.right { right: -23px !important; transform: rotate(-28deg) !important; }
    #${prefix}arena .${prefix}arm::after { content: '🥊' !important; position: absolute !important; top: -11px !important; font-size: 19px !important; }
    #${prefix}arena .${prefix}arm.left::after { left: -9px !important; }
    #${prefix}arena .${prefix}arm.right::after { right: -9px !important; }
    #${prefix}arena .${prefix}leg { bottom: -24px !important; width: 9px !important; height: 30px !important; background: #242128 !important; border-radius: 0 0 6px 6px !important; }
    #${prefix}arena .${prefix}leg.left { left: 2px !important; transform: rotate(12deg) !important; }
    #${prefix}arena .${prefix}leg.right { right: 2px !important; transform: rotate(-12deg) !important; }
    #${prefix}arena .${prefix}person.punch.team-0 { animation: rage-brawl-punch-left 440ms ease-in-out !important; }
    #${prefix}arena .${prefix}person.punch.team-1 { animation: rage-brawl-punch-right 440ms ease-in-out !important; }
    #${prefix}arena .${prefix}person.hit { animation: rage-brawl-hit 440ms ease-in-out !important; }
    #${prefix}arena .${prefix}person.ko { transform: rotate(83deg) translateY(40px) !important; opacity: .35 !important; }
    #${prefix}arena .${prefix}person.win { animation: rage-brawl-win 650ms ease-in-out infinite !important; }
    #${prefix}arena .${prefix}battle-impact { position: absolute !important; z-index: 4 !important; font-size: 48px !important; transform: translate(-50%,-50%) !important; animation: rage-brawl-impact 550ms ease-out forwards !important; }
    #${prefix}arena .${prefix}battle-controls { position: absolute !important; bottom: 18px !important; right: 18px !important; display: flex !important; gap: 10px !important; z-index: 4 !important; pointer-events: auto !important; }
    #${prefix}arena button { cursor: pointer !important; border: 1px solid #ffb083 !important; border-radius: 9px !important; background: #3b2727 !important; color: white !important; padding: 10px 16px !important; font: 700 14px system-ui,sans-serif !important; }
    #${prefix}arena button:hover { background: #744033 !important; }
  `;
  document.head.append(style);

  const hud = document.createElement('div');
  hud.id = prefix + 'hud';
  hud.innerHTML = `
    <span>💥 RAGE MODE</span>
    <button type="button" data-weapon="pistol" aria-pressed="true">🔫 Pistole · 1</button>
    <button type="button" data-weapon="bazooka" aria-pressed="false">🚀 Bazooka · 2</button>
    <button type="button" data-weapon="battle" aria-pressed="false">🥊 Balken-Brawl · 3</button>
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

  function extractBars(source) {
    const chartRect = source.getBoundingClientRect();
    const nodes = Array.from(source.querySelectorAll('rect,div,span')).slice(0, 1400);
    const candidates = [];
    for (const element of nodes) {
      const rect = element.getBoundingClientRect();
      if (rect.width < 5 || rect.width > 95 || rect.height < 18 ||
          rect.height > Math.min(500, chartRect.height) || rect.height < rect.width * 1.15 ||
          rect.right < 0 || rect.left > innerWidth || rect.bottom < 0 || rect.top > innerHeight) continue;
      const computed = getComputedStyle(element);
      if (computed.visibility === 'hidden' || computed.opacity === '0') continue;
      const svg = element.localName === 'rect';
      const color = svg ? computed.fill : computed.backgroundColor;
      if (!color || color === 'none' || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') continue;
      candidates.push({element, rect, color});
    }
    candidates.sort((a, b) => b.rect.height - a.rect.height);
    const bars = [];
    for (const candidate of candidates) {
      const center = candidate.rect.left + candidate.rect.width / 2;
      if (bars.some(bar => Math.abs(center - bar.rect.left - bar.rect.width / 2) < 14)) continue;
      bars.push(candidate);
      if (bars.length === 3) break;
    }
    if (bars.length) return bars.sort((a, b) => a.rect.left - b.rect.left);
    // Canvas charts do not expose individual bars, so place stand-ins over the plotted area.
    const graphic = source.matches('canvas,svg') ? source : source.querySelector('canvas,svg');
    const rect = graphic?.getBoundingClientRect() || chartRect;
    const height = Math.min(130, rect.height * .55);
    return [0, 1, 2].map((i) => ({
      element: null,
      rect: {left: rect.left + rect.width * (.25 + i * .24), top: rect.bottom - height * (1 + i * .12),
        width: Math.min(27, rect.width * .055), height: height * (1 + i * .12)},
      color: '#ff754c'
    }));
  }

  function closeBattle() {
    battleToken++;
    arena?.remove();
    arena = null;
    for (const chart of selectedCharts) {
      chart.element.classList.remove(prefix + 'selected');
      for (const bar of chart.bars) {
        if (bar.originalOpacity) putStyleBack(bar.element, 'opacity', bar.originalOpacity);
        bar.originalOpacity = null;
      }
    }
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
      bars: extractBars(element)
    };
    selectedCharts.push(chart);
    element.classList.add(prefix + 'selected');
    hint.textContent = selectedCharts.length === 1 ? 'Jetzt den Gegner anklicken' : 'Kampf!';
    if (selectedCharts.length === 2) openBattle();
  }

  function barPerson(bar, team) {
    const node = document.createElement('div');
    node.className = prefix + 'person team-' + team;
    node.style.setProperty('--rage-bar-color', bar.color);
    node.style.left = bar.rect.left + 'px';
    node.style.top = bar.rect.top + 'px';
    node.style.width = bar.rect.width + 'px';
    node.style.height = bar.rect.height + 'px';
    node.innerHTML = `<span class="${prefix}head">${team ? '😠' : '😎'}</span>
      <span class="${prefix}arm left"></span><span class="${prefix}arm right"></span>
      <span class="${prefix}leg left"></span><span class="${prefix}leg right"></span>`;
    return node;
  }

  function openBattle() {
    arena = document.createElement('div');
    arena.id = prefix + 'arena';
    arena.setAttribute('aria-label', 'Balken-Kampf auf der Seite');
    arena.innerHTML = `<div class="${prefix}battle-head">
      <h2 class="${prefix}battle-title">🥊 BALKEN-BRAWL</h2>
      <p class="${prefix}battle-status">Die Balken verwandeln sich …</p>
    </div>
      <div class="${prefix}battle-controls">
        <button type="button" data-battle="again">Nochmal kämpfen</button>
        <button type="button" data-battle="close">Balken zurücksetzen</button>
      </div>`;
    const chartRects = selectedCharts.map(chart => chart.element.getBoundingClientRect());
    const midpoint = Math.max(125, Math.min(innerWidth - 125,
      (chartRects[0].left + chartRects[0].width / 2 + chartRects[1].left + chartRects[1].width / 2) / 2));
    const fightY = Math.max(185, Math.min(innerHeight - 105,
      (chartRects[0].top + chartRects[0].height / 2 + chartRects[1].top + chartRects[1].height / 2) / 2));
    const teams = selectedCharts.map((chart, team) => chart.bars.map((bar, index) => {
      const node = barPerson(bar, team);
      arena.append(node);
      return {node, targetX: midpoint + (team ? 54 : -83) + (team ? 1 : -1) * index * 36,
        targetY: fightY - 45 + (index % 2) * 52};
    }));
    arena.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.battle;
      if (action === 'close') closeBattle();
      else if (action === 'again') runBattle(teams, true);
    });
    document.body.append(arena);
    for (const chart of selectedCharts) for (const bar of chart.bars) {
      if (bar.element) {
        bar.originalOpacity = rememberStyle(bar.element, 'opacity');
        bar.element.style.setProperty('opacity', '0', 'important');
      }
    }
    const battleArena = arena;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (arena !== battleArena) return;
      for (const team of teams) for (const fighter of team) {
        fighter.node.classList.add('human');
        fighter.node.style.left = fighter.targetX + 'px';
        fighter.node.style.top = fighter.targetY + 'px';
      }
      later(() => { if (arena === battleArena) runBattle(teams); }, 1050);
    }));
  }

  function runBattle(teams, replay = false) {
    if (!arena) return;
    const token = ++battleToken;
    const status = arena.querySelector('.' + prefix + 'battle-status');
    const health = [4, 4];
    let turn = 0;
    for (const team of teams) for (const fighter of team) {
      fighter.node.classList.remove('win', 'ko', 'punch', 'hit');
      fighter.node.style.left = fighter.targetX + 'px';
      fighter.node.style.top = fighter.targetY + 'px';
    }
    status.textContent = replay ? 'Revanche! 🥊' : 'Die Balken kämpfen direkt im Diagramm!';
    function step() {
      if (!arena || token !== battleToken) return;
      if (turn >= 7 || health[0] <= 0 || health[1] <= 0) {
        const winner = health[0] === health[1] ? Math.floor(Math.random() * 2) :
          (health[0] > health[1] ? 0 : 1);
        teams[winner].forEach(fighter => fighter.node.classList.add('win'));
        teams[1 - winner].forEach(fighter => fighter.node.classList.add('ko'));
        status.textContent = '🏆 ' + selectedCharts[winner].label + ' gewinnt!';
        return;
      }
      const attacker = turn % 2;
      const defender = 1 - attacker;
      health[defender] -= 1;
      const striker = teams[attacker][turn % teams[attacker].length].node;
      const victim = teams[defender][turn % teams[defender].length].node;
      for (const team of teams) for (const fighter of team) fighter.node.classList.remove('punch', 'hit');
      void striker.offsetWidth;
      striker.classList.add('punch');
      victim.classList.add('hit');
      const impact = document.createElement('span');
      impact.className = prefix + 'battle-impact';
      impact.textContent = '💥';
      impact.style.left = (parseFloat(victim.style.left) + 15) + 'px';
      impact.style.top = (parseFloat(victim.style.top) + 15) + 'px';
      arena.append(impact);
      status.textContent = selectedCharts[attacker].label + ' landet einen Treffer!';
      later(() => impact.remove(), 550);
      turn++;
      later(step, 730);
    }
    later(step, replay ? 450 : 300);
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
