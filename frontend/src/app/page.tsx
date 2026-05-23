import { CommandCenterView } from "@/components/command-center/CommandCenterView";
import { AppShell } from "@/components/layout/AppShell";

export default function Home() {
  return (
    <AppShell
      title="Analytics"
      subtitle="AI-powered operational intelligence for hotel ownership"
    >
      <CommandCenterView />
    </AppShell>
  );
}
