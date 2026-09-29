import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Genera de forma atómica un número de pedido secuencial mensual en Firestore:
 * Formato: FIX-YYMM-#### (ej. para septiembre 2026: FIX-2609-0001, FIX-2609-0002...)
 * 
 * Utiliza runTransaction sobre el documento `counters/orders_YYYY_MM`
 * garantizando cero duplicados incluso en alta concurrencia.
 */
export async function getNextMonthlyOrderNumber(date: Date = new Date()): Promise<string> {
  const fullYear = date.getFullYear(); // ej. 2026
  const yy = String(fullYear).slice(-2); // "26"
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // "09"
  const counterDocId = `orders_${fullYear}_${mm}`;
  const counterDocRef = doc(db, 'counters', counterDocId);

  try {
    const nextSeq = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterDocRef);
      let currentCount = 0;
      if (snap.exists()) {
        const data = snap.data();
        currentCount = typeof data.currentCount === 'number' 
          ? data.currentCount 
          : typeof data.count === 'number' 
          ? data.count 
          : 0;
      }

      const newCount = currentCount + 1;
      transaction.set(
        counterDocRef,
        {
          currentCount: newCount,
          count: newCount,
          prefix: `FIX-${yy}${mm}`,
          year: fullYear,
          month: date.getMonth() + 1,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return newCount;
    });

    const seqFormatted = String(nextSeq).padStart(4, '0');
    return `FIX-${yy}${mm}-${seqFormatted}`;
  } catch (err) {
    console.warn('[Counters] runTransaction order sequence error, using timestamp fallback:', err);
    const fallbackSeq = String(Date.now()).slice(-4);
    return `FIX-${yy}${mm}-${fallbackSeq}`;
  }
}
