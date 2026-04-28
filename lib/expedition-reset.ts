export const EXPEDITION_RESET_CYCLE_ID = "expedition-2026-05-11";

export const EXPEDITION_RESET_NOTICE_START_ISO = "2026-05-07T22:00:00.000Z";
export const EXPEDITION_RESET_NOTICE_END_ISO = "2026-05-21T22:00:00.000Z";

const getNow = () => {
  const force =
    process.env.EXPEDITION_RESET_FORCE?.trim().toLowerCase() ??
    process.env.EXPEDITION_RESET_NOW?.trim().toLowerCase() ??
    "";
  if (force === "true" || force === "1" || force === "yes") {
    return new Date(EXPEDITION_RESET_NOTICE_START_ISO);
  }

  const forced = process.env.EXPEDITION_RESET_NOW?.trim();
  if (forced) {
    const parsed = new Date(forced);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }
  return new Date();
};

export const isExpeditionResetNoticeActive = (now = getNow()) => {
  const start = new Date(EXPEDITION_RESET_NOTICE_START_ISO);
  const end = new Date(EXPEDITION_RESET_NOTICE_END_ISO);
  return now >= start && now < end;
};
