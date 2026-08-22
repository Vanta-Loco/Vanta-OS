import { useEffect, useState } from "react";
import { Link } from "wouter";
import { getUserToken, useUser } from "@/hooks/use-user";

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

type PassportEvent = {
  id: string;
  app: string;
  event_type: string;
  title: string;
  detail: string;
  xp_awarded: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

type PassportAchievement = {
  id: string;
  slug: string;
  title: string;
  description: string;
  app: string;
  category: string;
  rarity: string;
  xp_reward: number;
  icon_key: string;
  unlocked: boolean;
  unlocked_at: string | null;
  progress: number;
};

export default function Passport() {
  const { user, isAuthenticated, isLoading } = useUser();

  const [passport, setPassport] = useState<PassportData | null>(null);
  const [passportLoading, setPassportLoading] = useState(true);
  const [passportError, setPassportError] = useState("");
  const [events, setEvents] = useState<PassportEvent[]>([]);
  const [achievements, setAchievements] = useState<PassportAchievement[]>([]);
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
     const token = getUserToken();

     const authHeaders: Record<string, string> = {};

if (token) {
  authHeaders["X-User-Token"] = token;
}
        const [passportRes, eventsRes, achievementsRes] = await Promise.all([
  fetch("/api/passport", {
  headers: authHeaders,
}),
fetch("/api/passport/events", {
  headers: authHeaders,
}),
fetch("/api/passport/achievements", {
  headers: authHeaders,
}),
]);

if (!passportRes.ok) {
  throw new Error("Could not load Passport");
}

const passportData: PassportData = await passportRes.json();
setPassport(passportData);

if (eventsRes.ok) {
  const eventsData: PassportEvent[] = await eventsRes.json();
  setEvents(eventsData);
}

if (achievementsRes.ok) {
  const achievementsData: PassportAchievement[] =
    await achievementsRes.json();

  setAchievements(achievementsData);
}
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
        </section>
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
        </section>

        {/* APP RECORDS */}

        <section className="mt-16">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            App Records
          </p>

          <h2 className="mt-3 text-3xl font-medium">
            Activity across Vanta
          </h2>

          {events.length === 0 ? (
    <div className="mt-7 rounded-xl border border-dashed border-border p-8">
      <h3 className="text-lg font-medium">
        No Passport activity yet
      </h3>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Explore Vanta, join a game, enter a World, contribute to Stonerism or
        unlock an achievement to begin your record.
      </p>
    </div>
  ) : (
    <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(
        events.reduce<Record<string, PassportEvent[]>>((groups, event) => {
          const key = event.app;

          if (!groups[key]) {
            groups[key] = [];
          }

          groups[key].push(event);
          return groups;
        }, {})
      ).map(([app, appEvents]) => {
        const totalXp = appEvents.reduce(
          (sum, event) => sum + Number(event.xp_awarded || 0),
          0
        );

        return (
          <article
            key={app}
            className="rounded-xl border border-border bg-card p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {app.split("_").join(" ")}
            </p>

            <p className="mt-4 text-2xl font-semibold">
              {appEvents.length}{" "}
              {appEvents.length === 1 ? "Activity" : "Activities"}
            </p>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {totalXp} Passport XP earned
            </p>
          </article>
        );
      })}
    </div>
  )}
</section>
    

{/* ACHIEVEMENT CABINET */}

<section className="mt-16">
  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
    Achievement Cabinet
  </p>

    
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
  <div>
    <h2 className="text-3xl font-medium">
      Your Collection
    </h2>

    <p className="mt-2 text-sm text-muted-foreground">
      Achievements earned across the Vanta ecosystem.
    </p>
  </div>

  <p className="text-sm text-muted-foreground">
    {achievements.filter((achievement) => achievement.unlocked).length} /{" "}
    {achievements.length} unlocked
  </p>
</div>

{achievements.length === 0 ? (
  <div className="mt-7 rounded-xl border border-dashed border-border p-8">
    <h3 className="text-lg font-medium">
      No achievements available yet
    </h3>

    <p className="mt-2 text-sm text-muted-foreground">
      Passport achievements will appear here as they become available.
    </p>
  </div>
) : (
  <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">
    {achievements.map((achievement) => (
      <article
        key={achievement.id}
        className={`rounded-xl border border-border bg-card p-4 ${
          achievement.unlocked ? "" : "opacity-50"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-sm font-semibold">
          {achievement.unlocked
            ? achievement.icon_key?.slice(0, 2).toUpperCase() || "VA"
            : "??"}
        </div>

        <h3 className="mt-5 font-medium">
          {achievement.unlocked ? achievement.title : "Locked"}
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          {achievement.app.split("_").join(" ")}
        </p>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {achievement.unlocked
            ? achievement.description
            : "Complete this achievement to reveal it."}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {achievement.rarity}
          </p>

          <p className="text-xs text-muted-foreground">
            +{achievement.xp_reward} XP
          </p>
        </div>
      </article>
    ))}
  </div>
)}
</section>

{/* RECENT ACTIVITY */}


        {/* ACHIEVEMENTS */}

        

            {/* JOURNEY / RECENT ACTIVITY */}
    

        {/* VANTA WORLD */}
        

        {/* STONERISM */}
        
        {/* VANTA GAMES */}
        

        <Link href="/">
          <a className="mt-12 inline-block text-sm underline underline-offset-4">
            Return to Vanta OS
          </a>
        </Link>


    </main>
  );
}