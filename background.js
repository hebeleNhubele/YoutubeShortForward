// Service worker for reliable background scheduling (MV3).
// Content script sends "time left" updates; we set an alarm and,
// when it fires, inject a tiny "go to next short" snippet.

const NEXT_ALARM_PREFIX = 'ytshorts-next-';
const POLL_ALARM_PREFIX = 'ytshorts-poll-';
const POLL_INTERVAL_MS = 15_000;

// Keep last scheduled time per tab (best-effort; service worker can be restarted).
const scheduledWhenByTab = new Map();
const enabledTabs = new Set();

async function injectContentScriptIntoOpenYouTubeTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
    for (const tab of tabs) {
      if (!tab?.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
      } catch {
        // Ignore tabs where injection is not allowed.
      }
    }
  } catch {
    // Ignore query failures.
  }
}

chrome.runtime.onInstalled.addListener(() => {
  injectContentScriptIntoOpenYouTubeTabs();
});

chrome.runtime.onStartup.addListener(() => {
  injectContentScriptIntoOpenYouTubeTabs();
});

function clampNumber(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function getNextAlarmName(tabId) {
  return `${NEXT_ALARM_PREFIX}${tabId}`;
}

function getPollAlarmName(tabId) {
  return `${POLL_ALARM_PREFIX}${tabId}`;
}

function startPollLoop(tabId) {
  if (!enabledTabs.has(tabId)) return;
  chrome.alarms.create(getPollAlarmName(tabId), { when: Date.now() + POLL_INTERVAL_MS });
}

function clearAllForTab(tabId) {
  scheduledWhenByTab.delete(tabId);
  chrome.alarms.clear(getNextAlarmName(tabId));
  chrome.alarms.clear(getPollAlarmName(tabId));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender?.tab?.id;

  if (message?.action === 'setEnabled' && tabId != null) {
    const enabled = !!message.enabled;
    if (enabled) {
      enabledTabs.add(tabId);
      startPollLoop(tabId);
      sendResponse?.({ ok: true, enabled: true });
    } else {
      enabledTabs.delete(tabId);
      clearAllForTab(tabId);
      sendResponse?.({ ok: true, enabled: false });
    }
    return true;
  }

  if (message?.action === 'scheduleNext' && tabId != null) {
    // Schedule slightly early to compensate for timer/alarm jitter.
    const timeLeftMs = clampNumber(message.timeLeftMs, 0, 60 * 60 * 1000);
    const earlyMs = clampNumber(timeLeftMs - 600, 0, 60 * 60 * 1000);
    const when = Date.now() + earlyMs;

    scheduledWhenByTab.set(tabId, when);
    chrome.alarms.create(getNextAlarmName(tabId), { when });

    sendResponse?.({ ok: true, when });
    return true;
  }

  if (message?.action === 'clearSchedule' && tabId != null) {
    scheduledWhenByTab.delete(tabId);
    chrome.alarms.clear(getNextAlarmName(tabId), () => {
      sendResponse?.({ ok: true });
    });
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm?.name) return;

  const isNext = alarm.name.startsWith(NEXT_ALARM_PREFIX);
  const isPoll = alarm.name.startsWith(POLL_ALARM_PREFIX);
  if (!isNext && !isPoll) return;

  const tabId = Number(
    alarm.name.slice(isNext ? NEXT_ALARM_PREFIX.length : POLL_ALARM_PREFIX.length)
  );
  if (!Number.isFinite(tabId)) return;

  if (isNext) {
    // Best-effort: clear schedule; content script (or poll loop) will reschedule on the new short.
    scheduledWhenByTab.delete(tabId);
    chrome.alarms.clear(getNextAlarmName(tabId));
  }

  if (isPoll) {
    // Keep the poll loop going while enabled.
    if (!enabledTabs.has(tabId)) return;
    startPollLoop(tabId);
  }

  try {
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (mode) => {
        try {
          if (!location.pathname.startsWith('/shorts/')) return;

          const video = document.querySelector('ytd-reel-video-renderer video');
          const duration = video?.duration ?? 0;
          const currentTime = video?.currentTime ?? 0;
          const playbackRate = video?.playbackRate ?? 1;
          const paused = video?.paused ?? true;
          const ended = video?.ended ?? false;

          const selectors = [
            'button[aria-label*="Next"]',
            'button[aria-label*="Siguiente"]',
            'button[aria-label*="Próximo"]',
            'button[aria-label*="Sonraki"]',
            'button[aria-label*="Следующее"]',
            'button[aria-label*="Suivant"]',
            'button[aria-label*="Volgende"]',
            'button[aria-label*="Nächste"]',
            'button[aria-label*="次へ"]',
            'button[aria-label*="다음"]',
            'button[aria-label*="下一個"]',
            'button[aria-label*="下一步"]',
          ];

          let nextButton = null;
          for (const selector of selectors) {
            const btn = document.querySelector(selector);
            if (btn) {
              nextButton = btn;
              break;
            }
          }

          const remainingMs =
            duration > 0 && playbackRate > 0
              ? Math.max(0, Math.floor(((duration - currentTime) / playbackRate) * 1000))
              : null;

          // In poll mode: only advance when very near the end (or ended).
          if (mode === 'poll') {
            if (nextButton && (ended || (!paused && remainingMs != null && remainingMs < 800))) {
              nextButton.click();
              return { advanced: true, remainingMs };
            }
            return { advanced: false, remainingMs, paused, ended };
          }

          // Next-alarm mode: we assume we should advance now (we scheduled it).
          if (nextButton) {
            nextButton.click();
            return { advanced: true, remainingMs };
          }

          // Fallback to keyboard navigation used by the content script.
          if (video) video.focus();
          document.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'j',
              keyCode: 74,
              code: 'KeyJ',
              which: 74,
              bubbles: true,
              cancelable: true,
              composed: true,
            })
          );
          return { advanced: true, remainingMs };
        } catch {
          // Ignore.
        }
      },
      args: [isPoll ? 'poll' : 'next'],
    });

    // If poll observed a valid remaining time, schedule a more precise next alarm.
    if (isPoll && enabledTabs.has(tabId)) {
      const remainingMs = result?.remainingMs;
      if (Number.isFinite(remainingMs) && remainingMs > 0) {
        const earlyMs = clampNumber(remainingMs - 600, 0, 60 * 60 * 1000);
        const when = Date.now() + earlyMs;

        const prevWhen = scheduledWhenByTab.get(tabId);
        // Only update if it's meaningfully different (reduces alarm churn).
        if (!Number.isFinite(prevWhen) || Math.abs(prevWhen - when) > 2_000) {
          scheduledWhenByTab.set(tabId, when);
          chrome.alarms.create(getNextAlarmName(tabId), { when });
        }
      }
    }
  } catch {
    // The tab may be closed or YouTube not permitted; ignore.
  }
});

