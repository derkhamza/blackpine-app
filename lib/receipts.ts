function getDir() {
  const FileSystem = require("expo-file-system/legacy");
  return FileSystem.documentDirectory + "receipts/";
}
async function ensureDir() {
  const FileSystem = require("expo-file-system/legacy");
  const dir = getDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}
export async function saveReceipt(tempUri: string): Promise<string> {
  const FileSystem = require("expo-file-system/legacy");
  await ensureDir();
  const filename = "receipt_" + Date.now() + ".jpg";
  const dest = getDir() + filename;
  try {
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
  } catch {
    try {
      await FileSystem.moveAsync({ from: tempUri, to: dest });
      return dest;
    } catch (err) {
      throw err;
    }
  }
}
export async function deleteReceipt(uri: string): Promise<void> {
  const FileSystem = require("expo-file-system/legacy");
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri);
  } catch {}
}
