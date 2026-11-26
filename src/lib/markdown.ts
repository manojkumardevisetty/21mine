// Minimal, safe Markdown renderer for policy pages (HTML is escaped; links limited to / and https).
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s: string) {
  let out = esc(s);
  out = out.replace(/\[([^\]]+)\]\(((?:\/|https:\/\/|mailto:)[^)\s]*)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])_([^_]+)_(?=$|[\s.,)])/g, "$1<em>$2</em>");
  return out;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("### ")) { html.push(`<h3>${inline(line.slice(4))}</h3>`); i++; continue; }
    if (line.startsWith("## ")) { html.push(`<h2>${inline(line.slice(3))}</h2>`); i++; continue; }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      html.push(`<div style="overflow-x:auto"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) { items.push(`<li>${inline(lines[i].slice(2))}</li>`); i++; }
      html.push(`<ul>${items.join("")}</ul>`); continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\d+\. /, ""))}</li>`); i++; }
      html.push(`<ol>${items.join("")}</ol>`); continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3} |\||- |\d+\. )/.test(lines[i])) { para.push(lines[i]); i++; }
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return html.join("\n");
}
