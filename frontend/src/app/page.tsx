import { CommandCenter } from "@/components/CommandCenter";
import { AppHeader } from "@/components/layout/AppHeader";

export default function Home() {
  return (
    <div className="sh-page">
      <AppHeader title="Command Center" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <CommandCenter />
      </main>
    </div>
  );
}

