import type { Metadata } from 'next';
import { Gauge } from 'lucide-react';
import { SlabSimulatorCard } from '@/components/simulator/SlabSimulatorCard';

export const metadata: Metadata = {
  title: 'Slab Cliff Simulator | BijliTrack',
  description:
    'Project your end-of-month consumption and protect your NEPRA 200-unit protected slab before the cliff penalty applies.',
};

export default function SimulatorPage() {
  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-1000 pb-20">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground uppercase">
          Slab <span className="text-primary">Simulator</span>
        </h1>
        <div className="text-muted-foreground font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] flex items-center justify-center sm:justify-start gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]"></div>
          <Gauge className="h-3 w-3" aria-hidden="true" />
          Protected Slab Budget Forecaster
        </div>
      </div>

      <SlabSimulatorCard />
    </div>
  );
}