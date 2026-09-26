import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
  </Icon>
);
export const LearnIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23zM20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z" />
  </Icon>
);
export const DiscussIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-7a4 4 0 0 1-1-2.6V7a4 4 0 0 1 4-4h11a4 4 0 0 1 4 4z" />
  </Icon>
);
export const MembersIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M18 15a6 6 0 0 1 4 6" />
  </Icon>
);
export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 2v6M16 2v6M3 11h18" />
  </Icon>
);
export const ChallengeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 3h10v4a5 5 0 0 1-10 0zM9 12v4M15 12v4M7 21h10M4 5H2v2a4 4 0 0 0 5 4M20 5h2v2a4 4 0 0 1-5 4" />
  </Icon>
);
