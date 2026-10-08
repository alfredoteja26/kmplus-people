export async function uploadWorkDeliveryFile(
  file: File,
  purpose: "deliverable" | "doctor-letter",
): Promise<{ storagePath: string; fileName: string; error?: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);
  const response = await fetch("/api/storage/upload", { method: "POST", body: form });
  const payload = (await response.json().catch(() => ({}))) as {
    storagePath?: string;
    fileName?: string;
    error?: string;
  };
  if (!response.ok) {
    return { storagePath: "", fileName: "", error: payload.error || "Upload failed" };
  }
  return {
    storagePath: payload.storagePath ?? "",
    fileName: payload.fileName ?? file.name,
  };
}
