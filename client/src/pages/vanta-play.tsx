import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, ArrowRight, CalendarDays, Check, Clock3, MapPin, Plus, Trophy, Users } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { getUserToken, useUser } from "@/hooks/use-user";
import playEnvironmentImage from "@assets/generated_images/play_pickup_court_environment.png";

type Game = {
  id: string;
  sport: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  skill: string;
  players: number;
  capacity: number;
  status?: string;
  host_user_id?: string | null;
  created_at?: string;
  joined?: boolean;
};

const sports = [
  "All Sports",
  "Football",
  "Basketball",
  "Rugby",
  "Cricket",
  "Tennis",
  "Padel",
  "Running",
  "Cycling",
  "Volleyball",
];

const cities = [
  "All Cities",
  "Johannesburg",
  "Pretoria",
  "Cape Town",
  "Durban",
  "Gqeberha",
  "Bloemfontein",
];

export default function VantaPlay() {
  const [, navigate] = useLocation();
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [gameScope, setGameScope] = useState<"all" | "joined">("all");
  const [games, setGames] = useState<Game[]>([]);
  const [joinedGames, setJoinedGames] = useState<string[]>([]);
  const [showHostForm, setShowHostForm] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(true);

  const { toast } = useToast();
  const { isAuthenticated } = useUser();
  useEffect(() => {
  async function loadGames() {
    try {
      const token = getUserToken();
      const response = await fetch("/api/play/games", {
        headers: token ? { "X-User-Token": token } : {},
      });

      if (!response.ok) {
        console.error("Unable to load Vanta Play games");
        return;
      }

      const data: Game[] = await response.json();
      setGames(data);
      setJoinedGames(data.filter((game) => game.joined).map((game) => game.id));
    } catch (error) {
      console.error("Vanta Play load error:", error);
    } finally {
      setGamesLoading(false);
    }
  }

  loadGames();
}, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const cityMatches = game.city === selectedCity;
      const sportMatches =
        selectedSport === "All Sports" || game.sport === selectedSport;
      const scopeMatches = gameScope === "all" || Boolean(game.joined) || joinedGames.includes(game.id);

      return (selectedCity === "All Cities" || cityMatches) && sportMatches && scopeMatches;
    });
  }, [games, joinedGames, selectedCity, selectedSport, gameScope]);

  const featuredGame = games[0];
  const joinedGameRecords = games.filter(game => game.joined || joinedGames.includes(game.id));

  async function joinGame(gameId: string) {
  if (!isAuthenticated) {
    navigate("/login");
    return;
  }

  const selectedGame = games.find((game) => game.id === gameId);

  if (!selectedGame) return;

  // LEAVE GAME
  if (joinedGames.includes(gameId)) {
    try {
      const token = getUserToken();

const response = await fetch(`/api/play/games/${gameId}/join`, {
  method: "DELETE",
  headers: token ? { "X-User-Token": token } : {},
});

      if (!response.ok) {
        console.error("Unable to leave game");
        return;
      }

      setJoinedGames((current) =>
        current.filter((joinedId) => joinedId !== gameId),
      );

      setGames((current) =>
        current.map((game) =>
          game.id === gameId
            ? { ...game, players: Math.max(0, game.players - 1) }
            : game,
        ),
      );
    } catch (error) {
      console.error("Vanta Play leave error:", error);
    }

    return;
  }

  if (selectedGame.players >= selectedGame.capacity) {
    return;
  }

  // JOIN GAME
  try {
    const token = getUserToken();

const response = await fetch(`/api/play/games/${gameId}/join`, {
  method: "POST",
  headers: token ? { "X-User-Token": token } : {},
});

    const data = await response.json();

    if (!response.ok) {
      toast({
        title: "Unable to join game",
        description: data.error || "Try again.",
      });
      return;
    }

    setJoinedGames((current) => [...current, gameId]);

    if (data.newlyJoined) {
      setGames((current) =>
        current.map((game) =>
          game.id === gameId
            ? { ...game, players: game.players + 1 }
            : game,
        ),
      );
    }

    const passport = data.passport;

    if (passport?.achievement) {
      toast({
        title: "ACHIEVEMENT UNLOCKED",
        description: `${passport.achievement.title} · +${passport.xpAdded} Passport XP`,
      });
    }

    if (passport?.leveledUp) {
      toast({
        title: "PASSPORT LEVEL UP",
        description: `Level ${String(passport.newLevel).padStart(2, "0")} reached`,
      });
    }
  } catch (error) {
    console.error("Vanta Play join error:", error);
  }
}
  async function hostGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const sport = String(form.get("sport"));
    const city = String(form.get("city"));
    const venue = String(form.get("venue"));
    const date = String(form.get("date"));
    const time = String(form.get("time"));
    const skill = String(form.get("skill"));
    const capacity = Number(form.get("capacity"));

    try {
  const response = await fetch("/api/play/games", {
    method: "POST",
    headers: {
  "Content-Type": "application/json",
  ...(getUserToken() ? { "X-User-Token": getUserToken()! } : {}),
},
    body: JSON.stringify({
      sport,
      city,
      venue,
      date,
      time,
      skill,
      capacity,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    toast({
      title: "Unable to host game",
      description: data.error || "Try again.",
    });
    return;
  }

  setGames((current) => [data, ...current]);
  setSelectedCity(city);
  setSelectedSport("All Sports");
  setShowHostForm(false);
  event.currentTarget.reset();

  toast({
    title: "GAME CREATED",
    description: `${sport} · ${venue}`,
  });
} catch (error) {
  console.error("Vanta Play host error:", error);
}
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080e] text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <img src={playEnvironmentImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-45" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,14,.92)_0%,rgba(7,8,14,.55)_28%,rgba(7,8,14,.78)_72%,rgba(7,8,14,.97)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_28%,rgba(125,85,185,.18),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 md:py-20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-primary/80">VANTA PLAY // PICKUP NETWORK</p>
                <p className="mt-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/60">Passport-connected activity layer</p>
              </div>
              <div className="border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">South Africa Alpha · v0.2</div>
            </div>

            <div className="mt-12 max-w-4xl">
              <h1 className="font-display text-5xl font-bold tracking-tight md:text-8xl">VANTA PLAY<span className="text-primary">.</span></h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">Find a game. Show up. Play.</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground/70">Real pickup sessions, neighborhood courts, and a sporting identity that moves with your Passport.</p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#games" className="inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"><Trophy className="h-4 w-4" /> Find a Game</a>
              <button type="button" onClick={() => setShowHostForm(current => !current)} className="inline-flex items-center gap-2 border border-white/20 bg-black/25 px-5 py-3 text-sm font-medium transition-colors hover:border-primary/60"><Plus className="h-4 w-4" /> {showHostForm ? "Close Form" : "Host Game"}</button>
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
              <PlayMetric label="Open games" value={String(games.length)} />
              <PlayMetric label="Cities" value={String(new Set(games.map(game => game.city)).size)} />
              <PlayMetric label="Sports" value={String(new Set(games.map(game => game.sport)).size)} />
              <PlayMetric label="Your games" value={isAuthenticated ? String(joinedGameRecords.length) : "—"} />
            </div>

            {gamesLoading ? (
              <PlayPanel className="mt-12">
                <PlayEyebrow>Signal scan</PlayEyebrow>
                <p className="mt-4 text-sm text-muted-foreground">Loading live games…</p>
              </PlayPanel>
            ) : featuredGame ? (
              <section className="mt-12 border border-primary/35 bg-black/45 p-5 shadow-[0_18px_70px_rgba(0,0,0,.28)] backdrop-blur-md md:p-8">
                <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em]">
                      <span className="flex items-center gap-1.5 text-primary"><Activity className="h-3.5 w-3.5" /> Featured pickup</span>
                      <span className="text-muted-foreground/45">//</span>
                      <span className="text-emerald-300/75">{gameStatus(featuredGame, joinedGames.includes(featuredGame.id))}</span>
                    </div>
                    <h2 className="mt-4 truncate font-display text-3xl font-semibold md:text-4xl">{featuredGame.venue}<span className="text-primary">.</span></h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 text-primary/75" />{featuredGame.city} · {featuredGame.sport}</p>
                    <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                      <span className="border border-white/15 px-2.5 py-1.5">{featuredGame.date}</span>
                      <span className="border border-white/15 px-2.5 py-1.5">{featuredGame.time}</span>
                      <span className="border border-white/15 px-2.5 py-1.5">{featuredGame.players}/{featuredGame.capacity} Players</span>
                      <span className="border border-white/15 px-2.5 py-1.5">{featuredGame.skill}</span>
                    </div>
                  </div>
                  <PlayGameAction game={featuredGame} joined={joinedGames.includes(featuredGame.id)} isAuthenticated={isAuthenticated} onAction={joinGame} featured />
                </div>
              </section>
            ) : null}

            {isAuthenticated && (
              <section className="mt-6 border border-white/10 bg-black/30 p-5 backdrop-blur-md">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <PlayEyebrow>Your games</PlayEyebrow>
                    <h2 className="mt-2 font-display text-2xl font-semibold">YOUR GAMES<span className="text-primary">.</span></h2>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">{joinedGameRecords.length} joined</span>
                </div>
                {joinedGameRecords.length ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {joinedGameRecords.slice(0, 4).map(game => <div key={game.id} className="flex min-w-0 items-center justify-between gap-4 border border-white/10 bg-white/[0.03] px-3 py-3"><div className="min-w-0"><p className="truncate text-sm">{game.sport} · {game.venue}</p><p className="mt-1 truncate text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">{game.city} · {game.date} · {game.time}</p></div><span className="shrink-0 text-[9px] font-mono uppercase tracking-widest text-emerald-300/75">You&apos;re in</span></div>)}
                  </div>
                ) : <p className="mt-4 text-sm text-muted-foreground">You haven&apos;t joined a game yet.</p>}
              </section>
            )}

            {showHostForm && (
              <section className="mt-8 border border-white/15 bg-black/55 p-5 backdrop-blur-md md:p-8">
                <PlayEyebrow>New signal // host a session</PlayEyebrow>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold">HOST GAME<span className="text-primary">.</span></h2>
                  <p className="text-xs text-muted-foreground">Can&apos;t find a game? Host one.</p>
                </div>
                <form onSubmit={hostGame} className="mt-7 grid gap-4 md:grid-cols-2">
                  <PlayField label="Sport"><select name="sport" required className="play-input">{sports.filter(sport => sport !== "All Sports").map(sport => <option key={sport}>{sport}</option>)}</select></PlayField>
                  <PlayField label="City"><select name="city" required className="play-input">{cities.filter(city => city !== "All Cities").map(city => <option key={city}>{city}</option>)}</select></PlayField>
                  <PlayField label="Venue" wide><input name="venue" required placeholder="Park, school, university or sports facility" className="play-input" /></PlayField>
                  <PlayField label="Date"><input name="date" type="date" required className="play-input" /></PlayField>
                  <PlayField label="Time"><input name="time" type="time" required className="play-input" /></PlayField>
                  <PlayField label="Skill level"><select name="skill" className="play-input"><option>All levels</option><option>Casual</option><option>Intermediate</option><option>Competitive</option></select></PlayField>
                  <PlayField label="Maximum players"><input name="capacity" type="number" min="2" max="100" defaultValue="10" required className="play-input" /></PlayField>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:col-span-2"><Plus className="h-4 w-4" /> Create Game</button>
                </form>
              </section>
            )}

            <section id="games" className="mt-16 scroll-mt-24">
              <div className="flex flex-col gap-5 border-b border-white/15 pb-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <PlayEyebrow>Local activity // discovery</PlayEyebrow>
                  <h2 className="mt-3 font-display text-3xl font-semibold">FIND A GAME<span className="text-primary">.</span></h2>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <PlaySelect ariaLabel="Filter by city" value={selectedCity} onChange={setSelectedCity}>{cities.map(city => <option key={city}>{city}</option>)}</PlaySelect>
                  <PlaySelect ariaLabel="Filter by sport" value={selectedSport} onChange={setSelectedSport}>{sports.map(sport => <option key={sport}>{sport}</option>)}</PlaySelect>
                  {isAuthenticated && <div className="flex border border-white/15 bg-black/35 p-1"><button type="button" onClick={() => setGameScope("all")} className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest ${gameScope === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>All</button><button type="button" onClick={() => setGameScope("joined")} className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest ${gameScope === "joined" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>My Games</button></div>}
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {gamesLoading ? <PlayPanel><p className="text-sm text-muted-foreground">Loading live games…</p></PlayPanel> : filteredGames.length === 0 ? <PlayEmpty genuine={games.length === 0} city={selectedCity} sport={selectedSport} onHost={() => setShowHostForm(true)} /> : filteredGames.map(game => {
                  const joined = joinedGames.includes(game.id);
                  const full = game.players >= game.capacity && !joined;
                  return (
                    <article key={game.id} className={`border bg-black/45 p-5 backdrop-blur-md transition-colors md:p-6 ${joined ? "border-primary/55 shadow-[0_0_28px_rgba(150,100,220,.1)]" : "border-white/10 hover:border-primary/40"}`}>
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em]">
                            <span className="text-primary/80">{game.sport}</span><span className="text-muted-foreground/35">//</span><span className="text-muted-foreground/60">{gameStatus(game, joined)}</span>{game.skill && <><span className="text-muted-foreground/35">//</span><span className="text-muted-foreground/60">{game.skill}</span></>}
                          </div>
                          <h3 className="mt-3 truncate font-display text-2xl font-semibold">{game.venue}<span className="text-primary">.</span></h3>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary/75" />{game.city}</span>
                            <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary/75" />{game.date}</span>
                            <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-primary/75" />{game.time}</span>
                            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary/75" />{game.players}/{game.capacity} players</span>
                          </div>
                        </div>
                        <PlayGameAction game={game} joined={joined} isAuthenticated={isAuthenticated} onAction={joinGame} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-12 grid gap-4 md:grid-cols-2">
              <PlayPanel><PlayEyebrow>Passport connection</PlayEyebrow><h2 className="mt-3 font-display text-2xl font-semibold">GAME ON<span className="text-primary">.</span></h2><p className="mt-3 text-sm leading-6 text-muted-foreground">A successful join is recorded through Vanta Passport. Your Game On achievement stays backend-driven.</p><Link href="/passport" className="mt-5 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary/80 hover:text-primary">Open Passport <ArrowRight className="h-3 w-3" /></Link></PlayPanel>
              <PlayPanel><PlayEyebrow>On the court</PlayEyebrow><h2 className="mt-3 font-display text-2xl font-semibold">SHOW UP<span className="text-primary">.</span></h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Check the venue, arrive ready, and keep the pickup network moving through real sessions.</p><p className="mt-5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">Pickup network // member activity</p></PlayPanel>
            </section>

            <Link href="/" className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"><ArrowRight className="h-3 w-3 rotate-180" /> Return to Vanta OS</Link>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function gameStatus(game: Game, joined: boolean) {
  if (joined) return "YOU'RE IN";
  if (game.players >= game.capacity) return "FULL";
  return "OPEN";
}

function PlayMetric({ label, value }: { label: string; value: string }) {
  return <div className="bg-black/45 px-4 py-3 backdrop-blur-md"><p className="text-lg font-display text-foreground">{value}</p><p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/55">{label}</p></div>;
}

function PlayEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary/75">{children}</p>;
}

function PlayPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border border-white/10 bg-black/45 p-5 backdrop-blur-md md:p-6 ${className}`}>{children}</div>;
}

function PlaySelect({ ariaLabel, value, onChange, children }: { ariaLabel: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select aria-label={ariaLabel} value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full max-w-full border border-white/15 bg-black/55 px-3 text-sm text-foreground sm:w-auto">{children}</select>;
}

function PlayField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`grid gap-2 text-xs text-muted-foreground ${wide ? "md:col-span-2" : ""}`}>{label}{children}</label>;
}

function PlayGameAction({ game, joined, isAuthenticated, onAction, featured = false }: { game: Game; joined: boolean; isAuthenticated: boolean; onAction: (id: string) => void; featured?: boolean }) {
  const full = game.players >= game.capacity && !joined;
  return <div className={`flex shrink-0 flex-col gap-2 ${featured ? "w-full md:w-48" : "w-full lg:w-40"}`}>
    <div className={`flex items-center justify-center gap-2 border px-3 py-2 text-[10px] font-mono uppercase tracking-widest ${joined ? "border-primary/50 bg-primary/10 text-primary" : full ? "border-white/15 text-muted-foreground/60" : "border-emerald-300/30 bg-emerald-300/5 text-emerald-300/80"}`}><span className={`h-1.5 w-1.5 rounded-full ${joined ? "bg-primary" : full ? "bg-muted-foreground/50" : "bg-emerald-300"}`} /> {gameStatus(game, joined)}</div>
    <button type="button" disabled={full} onClick={() => onAction(game.id)} className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${joined ? "border border-primary/45 text-primary hover:bg-primary/10" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
      {isAuthenticated ? joined ? <><Check className="h-4 w-4" /> Leave Game</> : full ? "Full" : "Join Game" : full ? "Full" : "Sign In to Join"}
    </button>
  </div>;
}

function PlayEmpty({ genuine, city, sport, onHost }: { genuine: boolean; city: string; sport: string; onHost: () => void }) {
  return <div className="border border-dashed border-white/20 bg-black/35 px-6 py-16 text-center backdrop-blur-md"><p className="font-display text-2xl">{genuine ? "THE COURT IS QUIET" : "NO GAMES FOUND"}</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{genuine ? "No games are active yet. Host the first session." : `No ${sport === "All Sports" ? "games" : sport.toLowerCase()} sessions found${city === "All Cities" ? "" : ` in ${city}`}.`}</p><button type="button" onClick={onHost} className="mt-6 inline-flex items-center gap-2 border border-white/20 px-4 py-2.5 text-xs font-mono uppercase tracking-widest hover:border-primary/60"><Plus className="h-3.5 w-3.5" /> Host Game</button></div>;
}