'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ManualWorkspace } from '@/components/manual/ManualWorkspace';

export default function ManualArticlePage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : undefined;
  return <ManualWorkspace slug={slug} />;
}
