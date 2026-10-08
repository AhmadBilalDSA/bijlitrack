import { z } from 'zod';

export const DisputeRequestSchema = z.object({
  billData: z.object({
    consumerName: z.string().min(1, 'consumerName is required'),
    referenceNo: z.string().min(1, 'referenceNo is required'),
    disco: z.string().min(1, 'disco is required'),
    billingMonth: z.string().min(1, 'billingMonth is required'),
    totalAmount: z.number().nonnegative(),
  }),
  auditFindings: z.object({
    discrepancyAmount: z.number(),
    issuesDetected: z.array(z.string()),
    recommendedAction: z.string(),
  }),
});

export type DisputeRequest = z.infer<typeof DisputeRequestSchema>;

/**
 * Canonical DISCO names used in petition addressing. Bills print abbreviated
 * forms, so the petition header should use the legal entity name.
 */
export const DISCO_LEGAL_NAMES: Record<string, string> = {
  lesco: 'Lahore Electric Supply Company (LESCO)',
  kelectric: 'K-Electric',
  gepco: 'Gujranwala Electric Power Company (GEPCO)',
  fesco: 'Faisalabad Electric Supply Company (FESCO)',
  iesco: 'Islamabad Electric Supply Company (IESCO)',
  mepco: 'Multan Electric Power Company (MEPCO)',
  pesco: 'Peshawar Electric Supply Company (PESCO)',
  hazeco: 'Hazara Electric Supply Company (HAZECO)',
  hesco: 'Hyderabad Electric Supply Company (HESCO)',
  sepco: 'Sukkur Electric Supply Company (SEPCO)',
  qesco: 'Quetta Electric Supply Company (QESCO)',
  tesco: 'Tribal Electric Supply Company (TESCO)',
};

export function resolveDiscoLegalName(disco: string): string {
  const key = disco.trim().toLowerCase();
  return DISCO_LEGAL_NAMES[key] ?? disco.trim().toUpperCase();
}