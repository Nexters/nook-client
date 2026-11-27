const KEY = 'nook.prototype.reminder.hidden-until';
export const REMINDER_HIDE_MS = 24 * 60 * 60 * 1000;

export function readReminderHiddenUntil() {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isFinite(value) && value > Date.now() ? value : 0;
  } catch {
    return 0;
  }
}

export function setReminderHiddenUntil(until: number) {
  try {
    if (until) localStorage.setItem(KEY, String(until));
    else localStorage.removeItem(KEY);
  } catch {
    /* 현재 화면 상태는 저장소 없이도 유지된다. */
  }
}
