import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateTrackingSettingsDto {
  /** Facebook Pixel ID (e.g. "123456789012345") */
  @IsOptional()
  @IsString()
  facebookPixelId?: string;

  /** Google Analytics 4 Measurement ID (e.g. "G-XXXXXXXXXX") */
  @IsOptional()
  @IsString()
  ga4MeasurementId?: string;

  /** Google Tag Manager Container ID (e.g. "GTM-XXXXXXX") */
  @IsOptional()
  @IsString()
  gtmContainerId?: string;

  /** TikTok Pixel ID */
  @IsOptional()
  @IsString()
  tiktokPixelId?: string;

  /** Twitter/X Pixel ID */
  @IsOptional()
  @IsString()
  twitterPixelId?: string;

  /** Hotjar Site ID */
  @IsOptional()
  @IsString()
  hotjarId?: string;

  /** Custom <head> script tag content (raw HTML, will be injected as-is) */
  @IsOptional()
  @IsString()
  customHeadScript?: string;

  /** Enable/disable all tracking at once */
  @IsOptional()
  @IsBoolean()
  trackingEnabled?: boolean;
}
