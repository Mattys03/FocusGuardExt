let focusConfig = null;

// One-time reset for v1.3 update
chrome.storage.local.get(['v1_3_reset'], (res) => {
  if (!res.v1_3_reset) {
    chrome.storage.local.remove(['focusConfig']);
    chrome.storage.local.set({ v1_3_reset: true });
    focusConfig = null;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_FOCUS') {
    focusConfig = request.config;
    focusConfig.lastDate = new Date().toDateString();
    chrome.storage.local.set({ focusConfig });
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'ABORT_FOCUS') {
    if (focusConfig && focusConfig.lockedUntil && Date.now() < focusConfig.lockedUntil) {
      sendResponse({ success: false, error: 'LOCKED' });
      return true;
    }
    focusConfig = null;
    chrome.storage.local.remove('focusConfig');
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(t => {
        try { chrome.tabs.sendMessage(t.id, { action: 'UNBLOCK' }).catch(() => {}); } catch(e) {}
      });
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'GET_STATE') {
    if (!focusConfig) {
      chrome.storage.local.get(['focusConfig'], (result) => {
        if (result.focusConfig) {
          focusConfig = result.focusConfig;
          checkDailyReset();
        }
        sendResponse({ focusConfig });
      });
    } else {
      checkDailyReset();
      sendResponse({ focusConfig });
    }
    return true;
  }

  // Moderate Mode: ADD_TIME (non-focus content)
  if (request.action === 'ADD_TIME' && focusConfig) {
    checkDailyReset();
    let site = request.site;
    if (focusConfig.mode === 'moderate') {
      if (focusConfig.globalLimitMod) focusConfig.globalCurrent = (focusConfig.globalCurrent || 0) + 1;
      if (focusConfig.targets[site]) focusConfig.targets[site].current += 1;
      checkLimits(site, sender.tab.id);
    }
    chrome.storage.local.set({ focusConfig });
  }

  // ADD_REWARD_TIME: Accumulate study time (works in BOTH modes)
  if (request.action === 'ADD_REWARD_TIME' && focusConfig) {
    let site = request.site;
    if (focusConfig.targets[site]) {
      focusConfig.targets[site].focusTime = (focusConfig.targets[site].focusTime || 0) + 1;

      let req = focusConfig.rewardFocus || 3600;

      // Total focus across all sites
      let totalFocusTime = 0;
      for (let s in focusConfig.targets) totalFocusTime += (focusConfig.targets[s].focusTime || 0);

      if (totalFocusTime >= req) {
        // GOAL REACHED! Reset focus counters
        for (let s in focusConfig.targets) focusConfig.targets[s].focusTime = 0;

        // RESET the timer completely (the reward is getting all your time back)
        if (focusConfig.mode === 'moderate') {
          if (focusConfig.globalLimitMod) {
            focusConfig.globalCurrent = 0;
            focusConfig.globalWarnedHalf = false;
            focusConfig.globalWarnedEnd = false;
          }
          for (let s in focusConfig.targets) {
            focusConfig.targets[s].current = 0;
            focusConfig.targets[s].warnedHalf = false;
            focusConfig.targets[s].warnedEnd = false;
          }
        } else {
          // Extreme mode: reset item counters
          for (let s in focusConfig.targets) {
            focusConfig.targets[s].current = 0;
            focusConfig.targets[s].warnedHalf = false;
            focusConfig.targets[s].warnedEnd = false;
          }
        }

        let rewardMin = Math.floor(req / 60);
        try {
          chrome.tabs.sendMessage(sender.tab.id, { action: 'SHOW_REWARD', minutes: rewardMin }).catch(() => {});
        } catch(e) {}

        // Unblock all pages
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(t => {
            try { chrome.tabs.sendMessage(t.id, { action: 'UNBLOCK' }).catch(() => {}); } catch(e) {}
          });
        });
      }
      chrome.storage.local.set({ focusConfig });
    }
  }

  // Extreme Mode: ADD_ITEM
  if (request.action === 'ADD_ITEM' && focusConfig && focusConfig.mode === 'extreme') {
    checkDailyReset();
    let site = request.site;
    if (focusConfig.targets[site]) {
      focusConfig.targets[site].current += 1;
      checkLimits(site, sender.tab.id);
      chrome.storage.local.set({ focusConfig });
    }
  }

  // Toggle hideDistractions
  if (request.action === 'SET_HIDE_DISTRACTIONS' && focusConfig) {
    focusConfig.hideDistractions = request.value;
    chrome.storage.local.set({ focusConfig });
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(t => {
        try { chrome.tabs.sendMessage(t.id, { action: 'UPDATE_CONFIG', config: focusConfig }).catch(() => {}); } catch(e) {}
      });
    });
    sendResponse({ success: true });
    return true;
  }

  // Broadcast keyword updates
  if (request.action === 'UPDATE_KEYWORDS') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(t => {
        try { chrome.tabs.sendMessage(t.id, { action: 'UPDATE_KEYWORDS', keywords: request.keywords }).catch(() => {}); } catch(e) {}
      });
    });
    sendResponse({ success: true });
    return true;
  }
});

function checkLimits(site, tabId) {
  let remaining, halfLimit, endLimit, warnedEnd, warnedHalf;
  let target = focusConfig.targets[site];

  if (focusConfig.mode === 'moderate' && focusConfig.globalLimitMod) {
    remaining = focusConfig.globalLimitTime - (focusConfig.globalCurrent || 0);
    halfLimit = focusConfig.globalLimitTime / 2;
    endLimit = 300;
    warnedEnd = focusConfig.globalWarnedEnd;
    warnedHalf = focusConfig.globalWarnedHalf;
  } else {
    if (!target) return;
    remaining = target.limit - target.current;
    halfLimit = target.limit / 2;
    endLimit = focusConfig.mode === 'moderate' ? 300 : 2;
    warnedEnd = target.warnedEnd;
    warnedHalf = target.warnedHalf;
  }

  if (remaining <= 0) {
    if (focusConfig.mode === 'moderate' && focusConfig.globalLimitMod) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(t => {
          try { chrome.tabs.sendMessage(t.id, { action: 'BLOCK_PAGE' }).catch(() => {}); } catch(e) {}
        });
      });
    } else {
      chrome.tabs.sendMessage(tabId, { action: 'BLOCK_PAGE' }).catch(() => {});
    }
  } else if (remaining <= endLimit && !warnedEnd) {
    if (focusConfig.mode === 'moderate' && focusConfig.globalLimitMod) focusConfig.globalWarnedEnd = true;
    else if (target) target.warnedEnd = true;
    let msg = focusConfig.mode === 'moderate'
      ? `Atenção! Restam apenas ${Math.ceil(remaining/60)} minutos!`
      : `Atenção! Restam apenas ${remaining} itens!`;
    chrome.tabs.sendMessage(tabId, { action: 'SHOW_WARNING', message: msg }).catch(() => {});
  } else if (!warnedHalf) {
    let currentVal = (focusConfig.mode === 'moderate' && focusConfig.globalLimitMod) ? (focusConfig.globalCurrent || 0) : target.current;
    if (currentVal >= halfLimit) {
      if (focusConfig.mode === 'moderate' && focusConfig.globalLimitMod) focusConfig.globalWarnedHalf = true;
      else if (target) target.warnedHalf = true;
      let msg = focusConfig.globalLimitMod ? 'Metade do tempo global atingida.' : `Metade do limite no ${site} atingida.`;
      chrome.tabs.sendMessage(tabId, { action: 'SHOW_WARNING', message: msg }).catch(() => {});
    }
  }
}

function checkDailyReset() {
  if (!focusConfig) return;
  const today = new Date().toDateString();
  if (focusConfig.lastDate && focusConfig.lastDate !== today) {
    focusConfig.lastDate = today;
    focusConfig.globalCurrent = 0;
    focusConfig.globalWarnedHalf = false;
    focusConfig.globalWarnedEnd = false;
    for (let site in focusConfig.targets) {
      focusConfig.targets[site].current = 0;
      focusConfig.targets[site].warnedHalf = false;
      focusConfig.targets[site].warnedEnd = false;
      focusConfig.targets[site].focusTime = 0;
    }
    chrome.storage.local.set({ focusConfig });
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(t => {
        try { chrome.tabs.sendMessage(t.id, { action: 'UNBLOCK' }).catch(() => {}); } catch(e) {}
      });
    });
  }
}

chrome.storage.local.get(['focusConfig'], (result) => {
  if (result.focusConfig) {
    focusConfig = result.focusConfig;
    checkDailyReset();
  }
});
