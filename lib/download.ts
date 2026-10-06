// 브라우저에서 파일 내려받기 (.md 하나 또는 zip)

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string) {
  downloadBlob(filename, new Blob([text], { type: "text/markdown;charset=utf-8" }));
}

export async function downloadZip(filename: string, files: { path: string; content: string }[]) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const f of files) zip.file(f.path, f.content);
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(filename, blob);
}

export function slugify(text: string) {
  const slug = text
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "project";
}
