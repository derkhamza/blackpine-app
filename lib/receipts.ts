
import * as FileSystem from "expo-file-system/legacy";
const RECEIPTS_DIR = FileSystem.documentDirectory + "receipts/";

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(RECEIPTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
  }
}

export async function saveReceipt(tempUri: string): Promise<string> {
  console.log("[saveReceipt] tempUri:", tempUri);

  await ensureDir();
  console.log("[saveReceipt] dir ensured");

  const filename = "receipt_" + Date.now() + ".jpg";
  const dest = RECEIPTS_DIR + filename;
  console.log("[saveReceipt] dest:", dest);

  try {
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    console.log("[saveReceipt] copy succeeded");
    return dest;
  } catch (copyErr) {
    console.error("[saveReceipt] copyAsync failed:", copyErr);

    // Fallback: try moveAsync instead (some Android versions have issues with copy)
    try {
      await FileSystem.moveAsync({ from: tempUri, to: dest });
      console.log("[saveReceipt] moveAsync fallback succeeded");
      return dest;
    } catch (moveErr) {
      console.error("[saveReceipt] moveAsync also failed:", moveErr);
      throw moveErr;
    }
  }
}

export async function deleteReceipt(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri);
  } catch {
    // Already gone, fine
  }
}