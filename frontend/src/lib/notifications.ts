export type AppNotificationType = "food" | "exercise" | "reminder" | "system";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  createdAt: string;
  read: boolean;
};

type PushNotificationInput = {
  title: string;
  message: string;
  type?: AppNotificationType;
};

const STORAGE_KEY = "curasync_notifications_v1";
export const NOTIFICATIONS_UPDATED_EVENT = "curasync:notifications-updated";

const hasWindow = (): boolean => typeof window !== "undefined";

const sortByDateDesc = (items: AppNotification[]): AppNotification[] =>
  [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

const persistNotifications = (items: AppNotification[]) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortByDateDesc(items).slice(0, 50)));
};

export const readNotifications = (): AppNotification[] => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return [];
    return sortByDateDesc(parsed).slice(0, 50);
  } catch {
    return [];
  }
};

export const pushNotification = ({ title, message, type = "system" }: PushNotificationInput): AppNotification | null => {
  if (!hasWindow()) return null;
  const entry: AppNotification = {
    id: `n-${Date.now()}-${Math.floor(Math.random() * 100_000)}`,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const next = [entry, ...readNotifications()];
  persistNotifications(next);
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, { detail: entry }));
  return entry;
};

export const markNotificationRead = (id: string) => {
  if (!hasWindow()) return;
  const next = readNotifications().map((notification) =>
    notification.id === id ? { ...notification, read: true } : notification,
  );
  persistNotifications(next);
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
};

export const markAllNotificationsRead = () => {
  if (!hasWindow()) return;
  const next = readNotifications().map((notification) => ({ ...notification, read: true }));
  persistNotifications(next);
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
};

