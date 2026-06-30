const DEFAULT_KEYWORDS = {
  music: ["lofi", "lo-fi", "music", "música", "chill", "radio", "soundtrack", "ost", "mix", "playlist", "beat", "beats", "álbum", "album", "lyrics", "cover"],
  study: ["sql", "mysql", "postgresql", "banco de dados", "tj ce", "tjce", "fcc", "concurso", "estudo", "aula", "curso", "tutorial", "resolução", "prova", "questões"],
  custom: []
};

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const startBtn = document.getElementById('start-btn');
  const setupView = document.getElementById('setup-view');
  const activeView = document.getElementById('active-view');
  const activeModeLabel = document.getElementById('active-mode-label');
  const hideDistractionsCheckbox = document.getElementById('hide-distractions-checkbox');
  const hideDistractionsActive = document.getElementById('hide-distractions-active');
  const lockCheckbox = document.getElementById('lock-checkbox');
  const lockDaysContainer = document.getElementById('lock-days-container');
  const soundCheckbox = document.getElementById('sound-notification-checkbox');
  const abortBtn = document.getElementById('abort-btn');

  let focusKeywords = null;
  let dynamicSites = ["youtube.com", "twitter.com", "instagram.com"];
  let statsInterval = null;

  // ---- Abort ----
  if (abortBtn) {
    abortBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'ABORT_FOCUS' }, (response) => {
        if (response && response.success) {
          showSetupView();
        } else if (response && response.error === 'LOCKED') {
          alert('Configurações estão travadas!');
        }
      });
    });
  }

  // ---- Load Storage ----
  chrome.storage.local.get(['focusKeywords', 'focusLimits'], (result) => {
    focusKeywords = result.focusKeywords || JSON.parse(JSON.stringify(DEFAULT_KEYWORDS));
    renderAllTags();

    if (result.focusLimits) {
      let fl = result.focusLimits;
      if (fl.dynamicSites) dynamicSites = fl.dynamicSites;
      if (fl.globalLimitMod !== undefined) document.getElementById('global-limit-mod').checked = fl.globalLimitMod;
      if (fl.modGlobalTime) document.getElementById('mod-global-time').value = fl.modGlobalTime;
      if (fl.rewardFocus) document.getElementById('reward-focus').value = fl.rewardFocus;
      if (fl.rewardFocusExt) document.getElementById('reward-focus-ext').value = fl.rewardFocusExt;
      if (fl.lockDays) document.getElementById('lock-days').value = fl.lockDays;
      if (fl.lockChecked !== undefined) { lockCheckbox.checked = fl.lockChecked; lockDaysContainer.classList.toggle('hidden', !fl.lockChecked); }
      if (fl.soundChecked !== undefined) soundCheckbox.checked = fl.soundChecked;
      if (fl.hideDistractionsChecked !== undefined) hideDistractionsCheckbox.checked = fl.hideDistractionsChecked;
    }

    document.getElementById('mod-global-container').classList.toggle('hidden', !document.getElementById('global-limit-mod').checked);
    document.getElementById('mod-sites-container').classList.toggle('hidden', document.getElementById('global-limit-mod').checked);
    renderSites();
  });

  // ---- Global Limit Toggle ----
  document.getElementById('global-limit-mod').addEventListener('change', (e) => {
    document.getElementById('mod-global-container').classList.toggle('hidden', !e.target.checked);
    document.getElementById('mod-sites-container').classList.toggle('hidden', e.target.checked);
    saveCurrentLimits();
  });

  // ---- Add Site ----
  document.getElementById('btn-add-site').addEventListener('click', () => {
    let input = document.getElementById('new-site-input');
    let val = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (val && !dynamicSites.includes(val)) {
      dynamicSites.push(val);
      input.value = '';
      renderSites();
      saveCurrentLimits();
    }
  });

  document.getElementById('new-site-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-add-site').click();
  });

  // ---- Render Sites ----
  function renderSites() {
    const modContainer = document.getElementById('mod-sites-container');
    const extContainer = document.getElementById('ext-sites-container');
    if (!modContainer || !extContainer) return;
    modContainer.innerHTML = '';
    extContainer.innerHTML = '';

    chrome.storage.local.get(['focusLimits'], (res) => {
      let limits = res.focusLimits || {};

      dynamicSites.forEach((site) => {
        let modVal = limits[`mod_${site}`] || 60;
        let modRow = document.createElement('div');
        modRow.className = 'site-row';
        modRow.innerHTML = `
          <span>${site}</span>
          <div class="site-row-controls">
            <input type="number" class="site-mod-input" data-site="${site}" value="${modVal}" min="1">
            <span class="unit">min</span>
            <button class="btn-remove-site" data-site="${site}">✕</button>
          </div>
        `;
        modContainer.appendChild(modRow);

        let extVal = limits[`ext_${site}`] || 20;
        let extRow = document.createElement('div');
        extRow.className = 'site-row';
        extRow.innerHTML = `
          <span>${site}</span>
          <div class="site-row-controls">
            <input type="number" class="site-ext-input" data-site="${site}" value="${extVal}" min="1">
            <span class="unit">itens</span>
          </div>
        `;
        extContainer.appendChild(extRow);
      });

      document.querySelectorAll('.site-mod-input, .site-ext-input').forEach(inp => inp.addEventListener('input', saveCurrentLimits));
      document.querySelectorAll('.btn-remove-site').forEach(btn => {
        btn.addEventListener('click', (e) => {
          dynamicSites = dynamicSites.filter(x => x !== e.target.dataset.site);
          renderSites();
          saveCurrentLimits();
        });
      });
    });
  }

  // ---- Save ----
  function saveCurrentLimits() {
    let limitsToSave = {
      dynamicSites,
      globalLimitMod: document.getElementById('global-limit-mod').checked,
      modGlobalTime: document.getElementById('mod-global-time').value,
      rewardFocus: document.getElementById('reward-focus').value,
      rewardFocusExt: document.getElementById('reward-focus-ext').value,
      lockDays: document.getElementById('lock-days').value,
      lockChecked: lockCheckbox.checked,
      soundChecked: soundCheckbox.checked,
      hideDistractionsChecked: hideDistractionsCheckbox.checked
    };
    document.querySelectorAll('.site-mod-input').forEach(inp => { limitsToSave[`mod_${inp.dataset.site}`] = inp.value; });
    document.querySelectorAll('.site-ext-input').forEach(inp => { limitsToSave[`ext_${inp.dataset.site}`] = inp.value; });
    chrome.storage.local.set({ focusLimits: limitsToSave });
  }

  document.getElementById('setup-view').querySelectorAll('input[type="number"]:not(.site-mod-input):not(.site-ext-input), input[type="checkbox"]').forEach(input => {
    input.addEventListener('input', saveCurrentLimits);
    input.addEventListener('change', saveCurrentLimits);
  });

  // ---- Tabs ----
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  lockCheckbox.addEventListener('change', () => {
    lockDaysContainer.classList.toggle('hidden', !lockCheckbox.checked);
  });

  hideDistractionsActive.addEventListener('change', () => {
    chrome.runtime.sendMessage({ action: 'SET_HIDE_DISTRACTIONS', value: hideDistractionsActive.checked });
  });

  // ---- Tag System ----
  function renderAllTags() { renderTags('music'); renderTags('study'); renderTags('custom'); }

  function renderTags(category) {
    let container = document.getElementById(`tags-${category}`);
    container.innerHTML = '';
    (focusKeywords[category] || []).forEach((kw, index) => {
      let tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `${kw} <span class="tag-remove" data-category="${category}" data-index="${index}">×</span>`;
      container.appendChild(tag);
    });
  }

  document.querySelectorAll('.btn-add[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      let category = btn.dataset.category;
      let input = document.getElementById(`new-tag-${category}`);
      let value = input.value.trim().toLowerCase();
      if (!value) return;
      if (!focusKeywords[category]) focusKeywords[category] = [];
      if (focusKeywords[category].includes(value)) { input.value = ''; return; }
      focusKeywords[category].push(value);
      chrome.storage.local.set({ focusKeywords });
      chrome.runtime.sendMessage({ action: 'UPDATE_KEYWORDS', keywords: focusKeywords });
      input.value = '';
      renderTags(category);
    });
  });

  document.querySelectorAll('.add-tag-row input').forEach(input => {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.nextElementSibling.click(); });
  });

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tag-remove')) {
      let category = e.target.dataset.category;
      let index = parseInt(e.target.dataset.index);
      focusKeywords[category].splice(index, 1);
      chrome.storage.local.set({ focusKeywords });
      chrome.runtime.sendMessage({ action: 'UPDATE_KEYWORDS', keywords: focusKeywords });
      renderTags(category);
    }
  });

  // ---- State Management ----
  chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
    if (response && response.focusConfig) {
      showActiveView(response.focusConfig);
    } else {
      showSetupView();
    }
  });

  function showActiveView(config) {
    setupView.classList.add('hidden');
    activeView.classList.remove('hidden');
    activeModeLabel.innerText = `Modo: ${config.mode === 'moderate' ? 'Moderado' : 'Extremo'}`;
    hideDistractionsActive.checked = config.hideDistractions !== false;

    if (abortBtn) {
      if (config.lockedUntil && Date.now() < config.lockedUntil) {
        abortBtn.disabled = true;
        let daysLeft = Math.ceil((config.lockedUntil - Date.now()) / (1000 * 60 * 60 * 24));
        abortBtn.innerText = `Bloqueado por ${daysLeft} dias`;
      } else {
        abortBtn.disabled = false;
        abortBtn.innerText = "Abortar (Encerrar Foco)";
      }
    }

    updateStats(config);
    if (statsInterval) clearInterval(statsInterval);
    statsInterval = setInterval(() => {
      chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
        if (response && response.focusConfig) {
          let c = response.focusConfig;
          updateStats(c);
          if (abortBtn) {
            if (c.lockedUntil && Date.now() < c.lockedUntil) {
              abortBtn.disabled = true;
              let daysLeft = Math.ceil((c.lockedUntil - Date.now()) / (1000 * 60 * 60 * 24));
              abortBtn.innerText = `Bloqueado por ${daysLeft} dias`;
            } else {
              abortBtn.disabled = false;
              abortBtn.innerText = "Abortar (Encerrar Foco)";
            }
          }
        } else {
          showSetupView();
        }
      });
    }, 1000);
  }

  function showSetupView() {
    if (statsInterval) clearInterval(statsInterval);
    activeView.classList.add('hidden');
    setupView.classList.remove('hidden');
  }

  function formatTime(totalSeconds) {
    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;
    return `${h > 0 ? h + ':' : ''}${h > 0 && m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateStats(config) {
    let statsHtml = '';

    // Determine if user is blocked (time expired)
    let isBlocked = false;
    if (config.mode === 'moderate' && config.globalLimitMod) {
      let remaining = config.globalLimitTime - (config.globalCurrent || 0);
      if (remaining <= 0) isBlocked = true;
    } else {
      let allExpired = true;
      for (let site in config.targets) {
        if (config.targets[site].limit - config.targets[site].current > 0) allExpired = false;
      }
      if (allExpired && Object.keys(config.targets).length > 0) isBlocked = true;
    }

    if (!isBlocked) {
      // ---- PHASE 1: Free time still available ----
      if (config.mode === 'moderate' && config.globalLimitMod) {
        let remaining = config.globalLimitTime - (config.globalCurrent || 0);
        if (remaining < 0) remaining = 0;
        statsHtml += `<div class="stat-row"><span class="stat-label">🌐 Pote Global</span><span class="stat-value">${formatTime(remaining)}</span></div>`;
      } else {
        for (let site in config.targets) {
          let t = config.targets[site];
          let remaining = t.limit - t.current;
          if (remaining < 0) remaining = 0;
          let displayValue = config.mode === 'moderate' ? formatTime(remaining) : `${remaining} restantes`;
          statsHtml += `<div class="stat-row"><span class="stat-label">${site}</span><span class="stat-value">${displayValue}</span></div>`;
        }
      }
    } else {
      // ---- PHASE 2: Blocked — show expired state + study progress ----
      statsHtml += `
        <div class="stat-row" style="color: #ff4757;">
          <span class="stat-label">⛔ Acesso</span>
          <span class="stat-value" style="color: #ff4757;">Esgotado</span>
        </div>
      `;

      let totalFocusTime = 0;
      for (let site in config.targets) totalFocusTime += (config.targets[site].focusTime || 0);
      let focusReq = config.rewardFocus || 3600;
      let prog = Math.min(100, (totalFocusTime / focusReq) * 100);
      let studyRemaining = Math.max(0, focusReq - totalFocusTime);

      statsHtml += `
        <div class="study-progress-card">
          <div class="study-progress-header">
            <span>📚 Estude para desbloquear</span>
            <span class="study-timer">${formatTime(totalFocusTime)} / ${formatTime(focusReq)}</span>
          </div>
          <div class="study-bar-bg">
            <div class="study-bar-fill" style="width: ${prog}%;"></div>
          </div>
          <div class="study-remaining">Falta ${formatTime(studyRemaining)} de estudo para resetar os timers</div>
        </div>
      `;
    }

    let statsDiv = document.getElementById('active-stats');
    if (statsDiv) statsDiv.innerHTML = statsHtml;
  }

  // ---- Start ----
  startBtn.addEventListener('click', () => {
    const activeTab = document.querySelector('.tab.active').dataset.target;
    let mode = 'moderate';
    if (activeTab === 'extreme-mode') mode = 'extreme';
    if (activeTab === 'focus-list-mode') mode = 'moderate';

    let config = {
      mode,
      targets: {},
      hideDistractions: hideDistractionsCheckbox.checked,
      muteNotifications: !soundCheckbox.checked,
      globalLimitMod: document.getElementById('global-limit-mod').checked,
      globalLimitTime: parseInt(document.getElementById('mod-global-time').value) * 60,
      rewardFocus: parseInt(document.getElementById(mode === 'extreme' ? 'reward-focus-ext' : 'reward-focus').value) * 60,
      globalCurrent: 0,
      globalWarnedHalf: false,
      globalWarnedEnd: false
    };

    if (lockCheckbox.checked) {
      config.lockedUntil = Date.now() + parseInt(document.getElementById('lock-days').value) * 24 * 60 * 60 * 1000;
    }

    dynamicSites.forEach(site => {
      let modInp = document.querySelector(`.site-mod-input[data-site="${site}"]`);
      let extInp = document.querySelector(`.site-ext-input[data-site="${site}"]`);
      config.targets[site] = {
        limit: mode === 'moderate' ? (modInp ? parseInt(modInp.value) * 60 : 3600) : (extInp ? parseInt(extInp.value) : 20),
        current: 0, warnedHalf: false, warnedEnd: false, focusTime: 0
      };
    });

    chrome.runtime.sendMessage({ action: 'START_FOCUS', config }, (response) => {
      if (response && response.success) {
        showActiveView(config);
        // Staggered reload of monitored tabs to avoid lag
        chrome.tabs.query({}, (allTabs) => {
          let monitoredTabs = allTabs.filter(tab => {
            if (!tab.url) return false;
            try {
              let host = new URL(tab.url).hostname.replace(/^www\./, '');
              return dynamicSites.some(s => host.includes(s));
            } catch(e) { return false; }
          });
          monitoredTabs.forEach((tab, i) => {
            setTimeout(() => chrome.tabs.reload(tab.id), i * 400);
          });
        });
      }
    });
  });
});
