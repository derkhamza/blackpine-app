import { DoctorProfile, FullTaxComputation, Transaction } from "blackpine-engine";
import { generateLiasseFiscaleHtml } from "./taxFilings";

export async function exportLiasseFiscale(
  profile: DoctorProfile,
  result: FullTaxComputation,
  transactions: Transaction[],
  fiscalYear: number
): Promise<void> {
  const Print = require("expo-print");
  const Sharing = require("expo-sharing");
  const html = generateLiasseFiscaleHtml({ profile, result, transactions, fiscalYear });
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Liasse Fiscale ${fiscalYear}`,
      UTI: "com.adobe.pdf",
    });
  }
}