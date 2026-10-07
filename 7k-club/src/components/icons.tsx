import { Gamepad2 } from 'lucide-react';
import type { ResourceType } from '../lib/types';

type IconProps = { className?: string };

export function BilliardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <text x="12" y="14.2" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">
        8
      </text>
    </svg>
  );
}

export function PingPongIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <circle cx="9.5" cy="9.5" r="6" />
      <path d="m13.8 13.8 5.7 5.7" />
      <circle cx="19" cy="5" r="1.8" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9Z" />
    </svg>
  );
}

export function ResourceIcon({ type, className }: { type: ResourceType; className?: string }) {
  if (type === 'billiards') return <BilliardIcon className={className} />;
  if (type === 'ping_pong') return <PingPongIcon className={className} />;
  return <Gamepad2 className={className} />;
}

export const resourceGradient: Record<ResourceType, string> = {
  ps5: 'from-blue-600/40 via-indigo-700/20 to-transparent',
  ps4: 'from-sky-600/30 via-blue-800/20 to-transparent',
  billiards: 'from-emerald-600/40 via-emerald-800/20 to-transparent',
  ping_pong: 'from-orange-500/40 via-red-700/20 to-transparent',
};
