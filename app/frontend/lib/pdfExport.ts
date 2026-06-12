import { Platform, Alert } from "react-native";
import { supabase } from "./supabase";
import { api } from "./api";

type ExportFormat = "pdf" | "docx";

const FORMAT = {
  pdf: {
    ext: "pdf",
    mime: "application/pdf",
    uti: "com.adobe.pdf",
    url: (id: string) => api.getPdfUrl(id),
    label: "PDF",
  },
  docx: {
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    uti: "org.openxmlformats.wordprocessingml.document",
    url: (id: string) => api.getDocxUrl(id),
    label: "Word document",
  },
} as const;

/**
 * Platform-aware quotation export (PDF or editable Word).
 * - Web: fetch as blob, trigger a download.
 * - Native: download to cache via expo-file-system, then share.
 */
async function exportQuoteFile(
  quoteId: string,
  format: ExportFormat,
  clientName?: string
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const cfg = FORMAT[format];
  const url = cfg.url(quoteId);
  const filename = `quote-${quoteId.slice(0, 8)}.${cfg.ext}`;

  if (Platform.OS === "web") {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`${cfg.label} download failed: HTTP ${res.status}`);

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } else {
    const { File, Paths } = await import("expo-file-system");
    const Sharing = await import("expo-sharing");

    const dest = new File(Paths.cache, filename);
    const downloaded = await File.downloadFileAsync(url, dest, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Sharing not available", "Your device doesn't support file sharing.");
      return;
    }

    await Sharing.shareAsync(downloaded.uri, {
      mimeType: cfg.mime,
      dialogTitle: clientName ? `Quote for ${clientName}` : `Share Quotation ${cfg.label}`,
      UTI: cfg.uti,
    });
  }
}

export function exportPdf(quoteId: string, clientName?: string): Promise<void> {
  return exportQuoteFile(quoteId, "pdf", clientName);
}

export function exportDocx(quoteId: string, clientName?: string): Promise<void> {
  return exportQuoteFile(quoteId, "docx", clientName);
}
