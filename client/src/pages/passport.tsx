import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";

type PassportData = {
  id: string;
  user_id: string;
  passport_id: string;
  passport_level: number;
  passport_xp: number;
  character_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export default function Passport() {
  const { user, isAuthenticated, isLoading } = useUser();

  const [passport, setPassport] = useState<PassportData | null>(null);
  const [passportLoading, setPassportLoading] = useState(true);
  const [passportError, setPassportError] = useState("");

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setPassportLoading(false);
      return;
    }

    const loadPassport = async () => {
      try {
        setPassportLoading(true);
        setPassportError("");

        const res = await fetch("/api/passport");

        if (!res.ok) {
          throw new Error("Could not load Passport");
        }

        const data: PassportData = await res.json();
        setPassport(data);
      } catch (error) {
        console.error(error);
        setPassportError("Passport unavailable");
      } finally {
        setPassportLoading(false);
      }
    };

    loadPassport();
  }, [isAuthenticated, isLoading]);

  if (!isLoading && !isAuthenticated) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-28">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Vanta Passport
        </p>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
          Identity not activated.
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          Sign in or become a Member to activate your Vanta Passport and carry
          your identity, progression, achievements and activity across Vanta.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login">
            <a className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
              Sign In
            </a>
          </Link>

          <Link href="/register">
            <a className="rounded-md border border-border px-5 py-3 text-sm font-medium">
              Become a Member
            </a>
          </Link>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Passport Status
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Passport ID</p>
              <p className="mt-2 text-xl font-semibold">Not issued</p>
            </div>

            <div className="rounded-xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="mt-2 text-xl font-semibold">Locked</p>
            </div>

            <div className="rounded-xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Character</p>
              <p className="mt-2 text-xl font-semibold">Not created</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

  return (
 
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Vanta Passport
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              One identity across the Vanta ecosystem.
            </p>
          </div>

          <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Passport Alpha · v0.1
          </div>
        </div>

        <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
          Your Vanta identity.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          Games. Music. Sport. Culture. Worlds. Community. Your activity,
          achievements and identity travel with you across Vanta.
        </p>

        {/* PASSPORT CARD */}

<section className="mt-14 rounded-2xl border border-border bg-card p-6 md:p-8">
  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
    Passport
  </p>

  <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
    <div>
      <div className="flex h-40 w-32 items-center justify-center rounded-2xl border border-border bg-background">
        <div className="text-center">
          <div className="text-5xl">🧍</div>

          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Vanta Character
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-medium"
      >
        Customize Character
      </button>

      <h2 className="mt-5 text-3xl font-semibold">
  {user?.display_name || "Vanta Member"}
</h2>

      <p className="mt-2 text-muted-foreground">
  {user?.creator_category
    ? `${user.creator_category} · Player · Explorer`
    : "Member · Player · Explorer"}
</p>

{user?.bio && (
  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
    {user.bio}
  </p>
)}

<Link href="/profile/edit"></Link>
      <p className="mt-4 text-sm text-muted-foreground">
        Passport ID · {passportLoading
  ? "Loading..."
  : passport?.passport_id ?? "Not issued"}
      </p>
    </div>

    <div className="min-w-[220px] rounded-xl border border-border p-5">
      <p className="text-sm text-muted-foreground">
        Passport Level
      </p>

      <p className="mt-2 text-4xl font-semibold">
        {passportLoading
  ? "--"
  : String(passport?.passport_level ?? 1).padStart(2, "0")}
      </p>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/4 bg-primary" />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {passportLoading
  ? "Loading XP..."
  : `${passport?.passport_xp ?? 0} XP`}
      </p>
    </div>
  </div>
</section>

        {/* ECOSYSTEM */}

        <section className="mt-16">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Ecosystem
          </p>

          <h2 className="mt-3 text-3xl font-medium">
            Your Vanta
          </h2>

{/* APP RECORDS */}

<section className="mt-16">
  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
    App Records
  </p>

  <h2 className="mt-3 text-3xl font-medium">
    Activity across Vanta
  </h2>

  <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[
      {
        title: "Vanta Play",
        stat: "12 Games",
        detail: "7 reputation · 3 current streak",
      },
      {
        title: "Vanta Games",
        stat: "23 Achievements",
        detail: "4 rare unlocks · 2 games completed",
      },
      {
        title: "Worlds",
        stat: "4 Zones",
        detail: "9 discoveries · 2 hidden locations",
      },
      {
        title: "Stonerism",
        stat: "7 Contributions",
        detail: "Reviews, articles and community activity",
      },
      {
        title: "Music",
        stat: "5 Milestones",
        detail: "Releases, listening and creator activity",
      },
      {
        title: "Wireline",
        stat: "3 Circles",
        detail: "Community participation and connections",
      },
    ].map((record) => (
      <article
        key={record.title}
        className="rounded-xl border border-border bg-card p-5"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {record.title}
        </p>

        <p className="mt-4 text-2xl font-semibold">
          {record.stat}
        </p>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {record.detail}
        </p>
      </article>
    ))}
  </div>
</section>

{/* ACHIEVEMENT CABINET */}

<section className="mt-16">
  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
    Achievement Cabinet
  </p>

  <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 className="text-3xl font-medium">
        Your collection
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Achievements earned across the Vanta ecosystem.
      </p>
    </div>

    <p className="text-sm text-muted-foreground">
      6 / 48 unlocked
    </p>
  </div>

  <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
    {[
      {
        mark: "01",
        title: "First Boot",
        source: "Vanta OS",
        rarity: "Common",
      },
      {
        mark: "VP",
        title: "Game On",
        source: "Vanta Play",
        rarity: "Common",
      },
      {
        mark: "VW",
        title: "Explorer",
        source: "Vanta World",
        rarity: "Uncommon",
      },
      {
        mark: "VG",
        title: "First Trophy",
        source: "Vanta Games",
        rarity: "Uncommon",
      },
      {
        mark: "ST",
        title: "Contributor",
        source: "Stonerism",
        rarity: "Rare",
      },
      {
        mark: "??",
        title: "Unknown",
        source: "Hidden",
        rarity: "Locked",
      },
    ].map((achievement) => (
      <article
        key={achievement.title}
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-sm font-semibold">
          {achievement.mark}
        </div>

        <h3 className="mt-5 font-medium">
          {achievement.title}
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          {achievement.source}
        </p>

        <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {achievement.rarity}
        </p>
      </article>
    ))}
  </div>
</section>

{/* RECENT ACTIVITY */}

<section className="mt-16">
  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
    Recent Activity
  </p>

  <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 className="text-3xl font-medium">
        Passport history
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Recent activity recorded across Vanta.
      </p>
    </div>

    <button
      type="button"
      className="rounded-md border border-border px-4 py-2 text-sm"
    >
      View Full History
    </button>
  </div>

  <div className="mt-7 overflow-hidden rounded-xl border border-border bg-card">
    {[
      {
        app: "Vanta Play",
        action: "Joined Friday Night Basketball",
        detail: "Wanderers Club · Johannesburg",
        time: "Today",
      },
      {
        app: "Vanta Games",
        action: "Unlocked First Trophy",
        detail: "Achievement added to Passport",
        time: "Yesterday",
      },
      {
        app: "Vanta World",
        action: "Entered District",
        detail: "New location added to exploration record",
        time: "2 days ago",
      },
      {
        app: "Stonerism",
        action: "Made a community contribution",
        detail: "Activity recorded in culture profile",
        time: "3 days ago",
      },
      {
        app: "Music",
        action: "Reached a new milestone",
        detail: "Creator activity added to Passport",
        time: "4 days ago",
      },
    ].map((activity, index) => (
      <div
        key={`${activity.app}-${activity.action}`}
        className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${
          index !== 4 ? "border-b border-border" : ""
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {activity.app}
          </p>

          <h3 className="mt-2 text-sm font-medium">
            {activity.action}
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            {activity.detail}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          {activity.time}
        </p>
      </div>
    ))}
  </div>
</section>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {[
              ["Gaming", "Achievements, games and discoveries"],
              ["Play", "Sport, matches and reputation"],
              ["Worlds", "Exploration and world achievements"],
              ["Stonerism", "Culture, reviews and contributions"],
              ["Music", "Releases, listening and creator activity"],
              ["Wireline", "Community and connections"],
            ].map(([title, description]) => (
              <article
                key={title}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="text-lg font-medium">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>

                <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Connected
                </p>
              </article>
            ))}

          </div>
        </section>

        {/* ACHIEVEMENTS */}

        <section className="mt-16">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Achievements
          </p>

          <h2 className="mt-3 text-3xl font-medium">
            Passport milestones
          </h2>

          <div className="mt-7 grid gap-4 md:grid-cols-3">

            <article className="rounded-xl border border-border p-5">
              <p className="text-2xl">🎮</p>
              <h3 className="mt-4 font-medium">First Boot</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter Vanta OS for the first time.
              </p>
            </article>

            <article className="rounded-xl border border-border p-5">
              <p className="text-2xl">🏀</p>
              <h3 className="mt-4 font-medium">Game On</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Join your first Vanta Play game.
              </p>
            </article>

            <article className="rounded-xl border border-border p-5">
              <p className="text-2xl">🌍</p>
              <h3 className="mt-4 font-medium">Explorer</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your first Vanta World.
              </p>
            </article>

          </div>
        </section>

            {/* JOURNEY / RECENT ACTIVITY */}
    <section className="mt-16">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Journey
      </p>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-medium">
            Recent activity
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Your activity across the Vanta ecosystem travels with your Passport.
          </p>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Passport Log
        </p>
      </div>

      <div className="mt-7 space-y-3">

        {/* VANTA PLAY */}
        <article className="flex gap-4 rounded-xl border border-border p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border">
            VP
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">
                Joined Friday Night Basketball
              </h3>

              <span className="text-xs text-muted-foreground">
                Vanta Play
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Wanderers Club · Johannesburg
            </p>

            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              +25 Passport XP
            </p>
          </div>
        </article>

        {/* VANTA WORLD */}
        <article className="flex gap-4 rounded-xl border border-border p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border">
            VW
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">
                Entered Vanta World
              </h3>

              <span className="text-xs text-muted-foreground">
                Worlds
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              First world session recorded.
            </p>

            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              +10 Passport XP
            </p>
          </div>
        </article>

        {/* STONERISM */}
        <article className="flex gap-4 rounded-xl border border-border p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border">
            ST
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">
                Explored Stonerism
              </h3>

              <span className="text-xs text-muted-foreground">
                Stonerism
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Discovered another corner of the Vanta ecosystem.
            </p>

            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              +5 Passport XP
            </p>
          </div>
        </article>

        {/* VANTA GAMES */}
        <article className="flex gap-4 rounded-xl border border-border p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border">
            VG
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">
                Achievement unlocked
              </h3>

              <span className="text-xs text-muted-foreground">
                Vanta Games
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              First Steps · Enter the city for the first time.
            </p>

            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              +15 Passport XP
            </p>
          </div>
        </article>

      </div>
    </section>

        <Link href="/">
          <a className="mt-12 inline-block text-sm underline underline-offset-4">
            Return to Vanta OS
          </a>
        </Link>

      </section>
    </main>
  );
}