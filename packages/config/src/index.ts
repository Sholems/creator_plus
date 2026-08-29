// Environment configuration for CreatorPlus

export const config = {
  // Application
  app: {
    name: 'CreatorPlus',
    version: process.env.npm_package_version || '0.1.0',
    port: parseInt(process.env.PORT || '3001'),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/creatorplus',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT — secret has NO fallback on purpose. The API validates its presence at
  // boot (see apps/api validateEnv); a hardcoded default must never ship.
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Meilisearch
  meilisearch: {
    url: process.env.MEILISEARCH_URL || 'http://localhost:7700',
    key: process.env.MEILISEARCH_KEY || '',
  },

  // Cloudflare R2
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'creatorplus',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },

  // Payment Providers
  payment: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
    },
    flutterwave: {
      secretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
      webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || '',
    },
  },

  // Email
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    from: process.env.EMAIL_FROM || 'CreatorPlus <noreply@mycreatorplus.com>',
  },

  // AI
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
    },
  },

  // Platform Settings
  platform: {
    commissionRate: parseInt(process.env.COMMISSION_RATE || '10'),
    minPayoutAmount: parseInt(process.env.MIN_PAYOUT_AMOUNT || '50'),
    holdingPeriodDays: parseInt(process.env.HOLDING_PERIOD_DAYS || '14'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'zip,rar,7z,pdf,doc,docx,ppt,pptx,xls,xlsx,psd,ai,fig,sketch,blend,fbx,obj,stl,mp3,wav,mp4,mov,avi,jpg,jpeg,png,gif,webp').split(','),
  },
} as const;

export type Config = typeof config;
