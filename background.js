const defaultSettings = { seconds: 15, tabCount: "", groupOnly: false, state: "stopped", remaining: null };
let windowSettings = {};
let intervals = {};
let countdowns = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ windowSettings: {} });
});

/**
 * Sets the badge for the active tab in the given window.
 */
function setBadgeForWindow(windowId, text, color = "#000") {
  chrome.tabs.query({ windowId, active: true }, tabs => {
    if (tabs[0]) {
      chrome.action.setBadgeText({ tabId: tabs[0].id, text });
      chrome.action.setBadgeBackgroundColor({ tabId: tabs[0].id, color });
    }
  });
}

/**
 * Cycles to the next eligible tab in the given window.
 */
function cycleTabs(windowId) {
  if (!windowSettings[windowId] || windowSettings[windowId].state !== "running") return;

  let { tabCount, groupOnly } = windowSettings[windowId];
  chrome.tabs.query({ windowId }, tabs => {
    let eligibleTabs = [];

    if (groupOnly) {
      let firstGroupId = tabs.find(t => t.groupId !== -1)?.groupId;
      eligibleTabs = tabs.filter(t => t.groupId === firstGroupId);
    } else {
      // Treat empty string or 0 as 'All'
      if (tabCount === "" || tabCount === 0) {
        eligibleTabs = tabs;
      } else {
        eligibleTabs = tabs.slice(0, tabCount);
      }
    }

    if (eligibleTabs.length === 0) return;

    chrome.tabs.query({ windowId, active: true }, activeTabs => {
      let activeIndex = eligibleTabs.findIndex(t => t.id === activeTabs[0]?.id);
      let nextIndex = (activeIndex + 1) % eligibleTabs.length;
      chrome.tabs.update(eligibleTabs[nextIndex].id, { active: true });
    });
  });
}

/**
 * Starts the tab cycling in the given window.
 */
function startCycle(windowId) {
  clearInterval(intervals[windowId]);
  let { seconds } = windowSettings[windowId];

  countdowns[windowId] = seconds;
  setBadgeForWindow(windowId, countdowns[windowId].toString(), "#0A0");

  intervals[windowId] = setInterval(() => {
    countdowns[windowId]--;
    if (countdowns[windowId] <= 0) {
      cycleTabs(windowId);
      countdowns[windowId] = windowSettings[windowId].seconds;
    }
    setBadgeForWindow(windowId, countdowns[windowId].toString(), "#0A0");
  }, 1000);
}

/**
 * Stops the tab cycling in the given window.
 */
function stopCycle(windowId) {
  clearInterval(intervals[windowId]);
  setBadgeForWindow(windowId, "■", "#A00");
}

/**
 * Pauses the tab cycling in the given window.
 */
function pauseCycle(windowId) {
  clearInterval(intervals[windowId]);
  setBadgeForWindow(windowId, "❚❚", "#AA0");
}

/**
 * Handles messages from popup.js
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "updateSettings") {
    // If tabCount is 0, set to empty string for 'All'
    let settings = { ...msg.settings };
    if (settings.tabCount === 0) settings.tabCount = "";
    windowSettings[msg.windowId] = { ...windowSettings[msg.windowId], ...settings };
    chrome.storage.local.set({ windowSettings });
  }
  else if (msg.type === "start") {
    windowSettings[msg.windowId].state = "running";
    chrome.storage.local.set({ windowSettings });
    startCycle(msg.windowId);
  }
  else if (msg.type === "pause") {
    windowSettings[msg.windowId].state = "paused";
    chrome.storage.local.set({ windowSettings });
    pauseCycle(msg.windowId);
  }
  else if (msg.type === "stop") {
    windowSettings[msg.windowId].state = "stopped";
    chrome.storage.local.set({ windowSettings });
    stopCycle(msg.windowId);
  }
  else if (msg.type === "getSettings") {
    sendResponse(windowSettings[msg.windowId] || defaultSettings);
  }
});
