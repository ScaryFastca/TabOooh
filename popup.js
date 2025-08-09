let currentWindowId;
let wasRunning = false;

chrome.windows.getCurrent({ populate: false }, w => {
  currentWindowId = w.id;

  chrome.runtime.sendMessage({ type: "getSettings", windowId: currentWindowId }, settings => {
    document.getElementById("seconds").value = (settings.seconds != null) ? settings.seconds : 15;
    document.getElementById("tabCount").value = (settings.tabCount != null) ? settings.tabCount : 0;
    document.getElementById("groupOnly").checked = !!settings.groupOnly;
    wasRunning = settings.state === "running";

    if (wasRunning) {
      // Pause automatically but remember remaining time
      chrome.runtime.sendMessage({ type: "pause", windowId: currentWindowId });
    }
  });
});

function updateSettings() {
  const secVal = Math.max(5, parseInt(document.getElementById("seconds").value) || 15);
  const tabCountVal = Math.min(99, Math.max(0, parseInt(document.getElementById("tabCount").value) || 0));

  chrome.runtime.sendMessage({
    type: "updateSettings",
    windowId: currentWindowId,
    settings: {
      seconds: secVal,
      tabCount: tabCountVal,
      groupOnly: document.getElementById("groupOnly").checked
    }
  });
}


document.querySelectorAll("input").forEach(el => el.addEventListener("change", updateSettings));

document.getElementById("start").addEventListener("click", () => {
  updateSettings();
  chrome.runtime.sendMessage({ type: "start", windowId: currentWindowId, resume: false });
});
document.getElementById("pause").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "pause", windowId: currentWindowId });
});
document.getElementById("stop").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "stop", windowId: currentWindowId });
});

window.addEventListener("unload", () => {
  if (wasRunning) {
    // Resume from remaining time
    chrome.runtime.sendMessage({ type: "start", windowId: currentWindowId, resume: true });
  }
});
