'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function MaintenanceBanner() {
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .getPlatformStatus()
      .then((s) => {
        if (mounted) setMaintenance(s.maintenanceMode);
      })
      .catch(() => {
        // Swallow — the banner is a courtesy, not critical.
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!maintenance) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-600 px-4 py-2.5 text-center text-sm font-medium text-white">
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Scheduled maintenance is underway — some services may be temporarily unavailable.
    </div>
  );
}
