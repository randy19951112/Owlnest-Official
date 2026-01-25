export function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function displayNameFromActivation(item) {
  if (item?.display_token) return `Sleep Aid Lamp ${item.display_token}`;
  return "Registered";
}
