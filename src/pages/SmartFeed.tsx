import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Seo } from '@/components/seo/Seo';
import SmartFeedTab from '@/components/smart-feed/SmartFeedTab';

export default function SmartFeed() {
  return (
    <AppLayout>
      <Seo title="Smart Feed — PokeIQ" description="Personalized market insights based on your portfolio and preferences." />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SmartFeedTab />
      </div>
    </AppLayout>
  );
}
