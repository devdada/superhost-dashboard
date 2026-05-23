import { CommandCenterView } from "@/components/command-center/CommandCenterView";
import { AppShell } from "@/components/layout/AppShell";

export default function Home() {
  return (
    <AppShell
      title="Command Center"
      subtitle="AI-powered operational intelligence for hospitality ownership — prioritize action, detect anomalies, and move faster."
    >
      <CommandCenterView />
    </AppShell>
  );
}
