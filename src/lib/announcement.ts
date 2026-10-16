import { SETTINGS } from "@/lib/constants";
import { istDayKey } from "@/lib/dates";

export type Announcement = {
  /** Changes whenever the content does, so a dismissed notice reappears when edited */
  id: string;
  title: string;
  body: string;
  image: string;
};

/**
 * The landing pop-up (Admin → Settings → Landing announcement), or null when
 * it has no text or today (IST) is outside its date window. Dates are
 * inclusive calendar days; either may be blank.
 */
export function getAnnouncement(
  settings: Record<string, string>,
  today = istDayKey()
): Announcement | null {
  const title = (settings[SETTINGS.ANNOUNCEMENT_TITLE] ?? "").trim();
  const body = (settings[SETTINGS.ANNOUNCEMENT_BODY] ?? "").trim();
  const image = (settings[SETTINGS.ANNOUNCEMENT_IMAGE] ?? "").trim();
  const from = (settings[SETTINGS.ANNOUNCEMENT_FROM] ?? "").trim();
  const until = (settings[SETTINGS.ANNOUNCEMENT_UNTIL] ?? "").trim();
  if (!title && !body) return null;
  if (from && today < from) return null;
  if (until && today > until) return null;
  return { id: hash(`${title}\n${body}\n${image}\n${from}\n${until}`), title, body, image };
}

// Short, stable string hash (djb2) — only has to tell one notice from another
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
