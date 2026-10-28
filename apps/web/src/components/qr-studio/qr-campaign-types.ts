import type { QrDesign } from './qr-designer';

export type QrPlacementVariant = {
  id: string;
  publicCode: string;
  publicUrl: string;
  name: string;
  active: boolean;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  scanCount: number;
  lastScannedAt?: string | null;
};

export type QrCampaign = {
  id: string;
  publicCode: string;
  publicUrl: string;
  title: string;
  description?: string | null;
  folder?: string | null;
  tags?: string[];
  contentType: string;
  destinationUrl?: string | null;
  destinationData?: Record<string, any> | null;
  brandName?: string | null;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
  status: string;
  scanMode: string;
  designSettings?: { qrDesign?: Partial<QrDesign>; preset?: string } | null;
  assets?: { id: string; fileName: string; safetyStatus: string }[];
  scanCount?: number;
  lastScannedAt?: string | null;
  updatedAt?: string;
  placementVariants?: QrPlacementVariant[];
};
