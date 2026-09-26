import { CommunityShell } from '@/components/community/community-shell';

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <CommunityShell>{children}</CommunityShell>;
}
