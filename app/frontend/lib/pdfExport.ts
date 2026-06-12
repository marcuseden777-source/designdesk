import { Platform, Alert } from "react-native";
import { supabase } from "./supabase";
import { api } from "./api";

/**
 * Platform-aware PDF export.
 * - Web: fetch as blob, open in new tab (or trigger download)
 * - Native: use expo-file-system + expo-sharing
 */
export async function exportPdf(quoteId: string, clientName?: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const pdfUrl = api.getPdfUrl(quoteId);

  if (Platform.OS === "web") {
    // Fetch the PDF as a blob and open/download it
    const res = await fetch(pdfUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`PDF download failed: HTTP ${res.status}`);

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Create an invisible anchor to trigger download
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `quote-${quoteId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Cleanup after a short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } else {
    // Native: use expo-file-system and expo-sharing
    const { File, Paths } = await import("expo-file-system");
    const Sharing = await import("expo-sharing");

    const dest = new File(Paths.cache, `quote-${quoteId.slice(0, 8)}.pdf`);
    const downloaded = await File.downloadFileAsync(pdfUrl, dest, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Sharing not available", "Your device doesn't support file sharing.");
      return;
    }

    await Sharing.shareAsync(downloaded.uri, {
      mimeType: "application/pdf",
      dialogTitle: clientName ? `Quote for ${clientName}` : "Share Quotation PDF",
      UTI: "com.adobe.pdf",
    });
  }
}
