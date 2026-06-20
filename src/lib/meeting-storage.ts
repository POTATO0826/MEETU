import type { Meeting } from "./meetings";

const STORAGE_KEY = "meetu-created-meetings";
const CHANGE_EVENT = "meetu-meetings-change";
const EMPTY_MEETINGS: Meeting[] = [];

let cachedRaw: string | null | undefined;
let cachedMeetings: Meeting[] = EMPTY_MEETINGS;

export function loadCreatedMeetings(): Meeting[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedMeetings;

  try {
    const value = JSON.parse(raw ?? "[]");
    cachedRaw = raw;
    cachedMeetings = Array.isArray(value) ? (value as Meeting[]) : EMPTY_MEETINGS;
    return cachedMeetings;
  } catch {
    cachedRaw = raw;
    cachedMeetings = EMPTY_MEETINGS;
    return cachedMeetings;
  }
}

export function saveCreatedMeeting(meeting: Meeting): void {
  const meetings = loadCreatedMeetings();
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([meeting, ...meetings.filter((item) => item.id !== meeting.id)])
  );
  cachedRaw = undefined;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToCreatedMeetings(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedRaw = undefined;
      onStoreChange();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function getCreatedMeetingsServerSnapshot(): Meeting[] {
  return EMPTY_MEETINGS;
}
