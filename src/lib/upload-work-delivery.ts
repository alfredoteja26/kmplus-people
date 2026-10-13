export async function uploadWorkDeliveryFile(
  file: File,
  purpose: "deliverable" | "doctor-letter",
): Promise<{ storagePath: string; fileName: string; error?: string }> {
  const failed = (error: string) => ({ storagePath: "", fileName: "", error });

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, fileName: file.name, size: file.size }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    storagePath?: string;
    fileName?: string;
    uploadUrl?: string;
    error?: string;
  };
  if (!response.ok || !payload.storagePath) return failed(payload.error || "Upload failed");

  // The bytes go straight to Supabase Storage; the app only keeps the path.
  if (payload.uploadUrl) {
    const stored = await fetch(payload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
      body: file,
    }).catch(() => null);
    if (!stored?.ok) return failed("Upload failed. Check your connection and try again.");
  }

  return { storagePath: payload.storagePath, fileName: payload.fileName ?? file.name };
}
