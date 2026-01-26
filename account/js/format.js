export function fmtDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function fmtShortDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * ✅ 絕對不顯示 payload/token
 * 只顯示 display_token
 */
export function displayNameFromActivation(item) {
  const t = (item?.display_token ?? "").toString().trim();
  if (t) return `Sleep Aid Lamp ${t}`;
  return "Registered";
}
