import { useCallback } from "react";
import { Appointment } from "./cabinetTypes";
import { useApp } from "./AppContext";
import { useCabinet } from "./CabinetContext";

/**
 * useBilling — encapsulates the cross-context billing operation.
 *
 * Billing an appointment writes a RECETTE transaction (AppContext) and stamps
 * billedAt on the appointment (CabinetContext).  Before this hook, every
 * screen that handled payment had to import both contexts and bridge the seam
 * itself.  Now they import only this hook.
 */
export function useBilling() {
  const { addTransaction, transactions } = useApp();
  const { updateAppointment } = useCabinet();

  /**
   * Record payment for a single appointment.
   * Creates the transaction and marks the appointment as billed.
   */
  const billAppointment = useCallback(
    (appt: Appointment, amount: number) => {
      addTransaction({
        type: "RECETTE",
        amount,
        date: appt.date,
        category: "consultation",
        description: appt.patientName,
        patientId: appt.patientId,
        deductibilityStatus: "FULLY_DEDUCTIBLE",
        professionalUseRatio: 1,
      });
      updateAppointment({ ...appt, billedAt: new Date().toISOString() });
    },
    [addTransaction, updateAppointment],
  );

  /**
   * Bill multiple appointments at the same rate (end-of-day bulk billing).
   * All appointments share the same timestamp so the batch looks atomic.
   */
  const bulkBillAppointments = useCallback(
    (appts: Appointment[], amountPerConsult: number) => {
      const now = new Date().toISOString();
      appts.forEach((appt) => {
        addTransaction({
          type: "RECETTE",
          amount: amountPerConsult,
          date: appt.date,
          category: "consultation",
          description: appt.patientName,
          patientId: appt.patientId,
          deductibilityStatus: "FULLY_DEDUCTIBLE",
          professionalUseRatio: 1,
        });
        updateAppointment({ ...appt, billedAt: now });
      });
    },
    [addTransaction, updateAppointment],
  );

  /**
   * Most-recent billed amount for a patient — used to pre-fill the payment
   * sheet with a sensible default.
   *
   * Prefers patientId FK match (reliable); falls back to description equality
   * for transactions created before patientId was stored.
   */
  const lastBilledAmount = useCallback(
    (patientId: string | undefined, patientName: string): string => {
      const recent = transactions
        .filter((tx) => {
          if (tx.type !== "RECETTE") return false;
          if (patientId && tx.patientId) return tx.patientId === patientId;
          return tx.description === patientName;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
      return recent[0]?.amount ? String(Math.round(recent[0].amount)) : "200";
    },
    [transactions],
  );

  return { billAppointment, bulkBillAppointments, lastBilledAmount };
}
