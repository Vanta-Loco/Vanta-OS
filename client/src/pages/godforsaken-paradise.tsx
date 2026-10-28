import { Link } from "wouter";
import GodforsakenParadiseGame from "@/games/godforsaken-paradise";

export default function GodforsakenParadisePage() {
  return (
    <main className="min-h-screen bg-[#07080e] px-3 py-4 text-foreground sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <Link
            href="/worlds"
            className="min-h-11 inline-flex items-center text-amber-200/80 transition-colors hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
          >
            ← Vanta Worlds
          </Link>
          <span>Fractured Godhead universe · standalone minigame</span>
        </div>
        <GodforsakenParadiseGame />
      </div>
    </main>
  );
}
