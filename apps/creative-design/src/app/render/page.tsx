"use client";

import { useSearchParams } from 'next/navigation';
import { TemplateSwitch } from '@/components/design-system/TemplateSwitch';
import { Suspense, useEffect, useState } from 'react';

function RenderContent() {
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [props, setProps] = useState<any>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const decoded = JSON.parse(atob(data));
        setProps(decoded);
        setKey(prev => prev + 1); // Força re-render completo do componente
        console.log("Rendering slide:", decoded.slideNumber || decoded.templateId);
      } catch (e) {
        console.error("Failed to parse render data", e);
      }
    }
  }, [searchParams]);

  if (!props) return <div className="bg-black text-white p-10">Waiting for data...</div>;

  return (
    <div id="render-target" key={key} className="bg-transparent">
      <TemplateSwitch {...props} />
    </div>
  );
}

export default function RenderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RenderContent />
    </Suspense>
  );
}
