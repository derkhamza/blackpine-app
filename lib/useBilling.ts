import { useCallback } from "react";
import { Appointment, BillingLine, PaymentMethod } from "./cabinetTypes";
import { paymentSummary } from "./billing";
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

  /**
   * Itemized billing: consultation base + acts − reduction. The patient may pay
   * all, part, or none now (the rest is deferred). The ledger is credited with
   * the cash actually collected.
   */
  const billAppointmentItemized = useCallback(
    (
      appt: Appointment,
      opts: { items: BillingLine[]; reduction: number; collected: number; method: PaymentMethod },
    ) => {
      const subtotal = opts.items.reduce((s, l) => s + l.qty * l.unitPrice, 0);
      const total = Math.max(0, subtotal - Math.max(0, opts.reduction));
      const collected = Math.min(total, Math.max(0, opts.collected));
      const now = new Date().toISOString();
      if (collected > 0) {
        addTransaction({
          type: "RECETTE", amount: collected, date: appt.date,
          category: "consultation", description: appt.patientName, patientId: appt.patientId,
          deductibilityStatus: "FULLY_DEDUCTIBLE", professionalUseRatio: 1,
        });
      }
      updateAppointment({
        ...appt,
        billedAt: now,
        billedAmount: total,
        billedItems: opts.items,
        billedReduction: opts.reduction > 0 ? opts.reduction : undefined,
        paidAmount: collected,
        payments: collected > 0 ? [{ amount: collected, date: now, method: opts.method }] : [],
      });
    },
    [addTransaction, updateAppointment],
  );

  /** Record a later instalment on an already-billed appointment (deferred/partial). */
  const recordPayment = useCallback(
    (appt: Appointment, amount: number, method: PaymentMethod) => {
      const { paid, balance } = paymentSummary(appt);
      const amt = Math.min(balance, Math.max(0, amount));
      if (amt <= 0) return;
      const now = new Date().toISOString();
      addTransaction({
        type: "RECETTE", amount: amt, date: appt.date,
        category: "consultation", description: appt.patientName, patientId: appt.patientId,
        deductibilityStatus: "FULLY_DEDUCTIBLE", professionalUseRatio: 1,
      });
      updateAppointment({
        ...appt,
        paidAmount: paid + amt,
        payments: [...(appt.payments ?? []), { amount: amt, date: now, method }],
      });
    },
    [addTransaction, updateAppointment],
  );

  return { billAppointment, bulkBillAppointments, lastBilledAmount, billAppointmentItemized, recordPayment };
}
