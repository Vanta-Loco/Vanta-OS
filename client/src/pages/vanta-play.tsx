import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";

type Game = {
  id: number;
  sport: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  skill: string;
  players: number;
  capacity: number;
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
  "Johannesburg",
  "Pretoria",
  "Cape Town",
  "Durban",
  "Gqeberha",
  "Bloemfontein",
];

const starterGames: Game[] = [
  {
    id: 1,
    sport: "Football",
    city: "Johannesburg",
    venue: "Zoo Lake Sports Club",
    date: "Saturday",
    time: "16:00",
    skill: "Casual",
    players: 8,
    capacity: 12,
  },
  {
    id: 2,
    sport: "Basketball",
    city: "Johannesburg",
    venue: "Wits Basketball Courts",
    date: "Friday",
    time: "18:30",
    skill: "Competitive",
    players: 5,
    capacity: 6,
  },
  {
    id: 3,
    sport: "Padel",
    city: "Pretoria",
    venue: "Pretoria East Padel",
    date: "Sunday",
    time: "10:00",
    skill: "Intermediate",
    players: 3,
    capacity: 4,
  },
  {
    id: 4,
    sport: "Running",
    city: "Cape Town",
    venue: "Sea Point Promenade",
    date: "Saturday",
    time: "07:00",
    skill: "All levels",
    players: 14,
    capacity: 25,
  },
];

export default function VantaPlay() {
  const [selectedCity, setSelectedCity] = useState("Johannesburg");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [games, setGames] = useState<Game[]>(starterGames);
  const [joinedGames, setJoinedGames] = useState<number[]>([]);
  const [showHostForm, setShowHostForm] = useState(false);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const cityMatches = game.city === selectedCity;
      const sportMatches =
        selectedSport === "All Sports" || game.sport === selectedSport;

      return cityMatches && sportMatches;
    });
  }, [games, selectedCity, selectedSport]);

  function joinGame(gameId: number) {
    if (joinedGames.includes(gameId)) {
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

      return;
    }

    const selectedGame = games.find((game) => game.id === gameId);

    if (!selectedGame || selectedGame.players >= selectedGame.capacity) {
      return;
    }

    setJoinedGames((current) => [...current, gameId]);

    setGames((current) =>
      current.map((game) =>
        game.id === gameId
          ? { ...game, players: game.players + 1 }
          : game,
      ),
    );
  }

  function hostGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const sport = String(form.get("sport"));
    const city = String(form.get("city"));
    const venue = String(form.get("venue"));
    const date = String(form.get("date"));
    const time = String(form.get("time"));
    const skill = String(form.get("skill"));
    const capacity = Number(form.get("capacity"));

    const newGame: Game = {
      id: Date.now(),
      sport,
      city,
      venue,
      date,
      time,
      skill,
      players: 1,
      capacity,
    };

    setGames((current) => [newGame, ...current]);
    setSelectedCity(city);
    setSelectedSport("All Sports");
    setShowHostForm(false);
    event.currentTarget.reset();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
  <div>
    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
      Vanta Play
    </p>

    <p className="mt-2 text-sm text-muted-foreground">
      Powered by Vanta Passport
    </p>
  </div>

  <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
    South Africa Alpha · v0.2
  </div>
</div>

        <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
          Vanta Play
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          Find real-world games, host local sessions and build a respected
          sporting identity across South Africa.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <a
            href="#games"
            className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Find a Game
          </a>

          <button
            type="button"
            onClick={() => setShowHostForm((current) => !current)}
            className="rounded-md border border-border px-5 py-3 text-sm font-medium"
          >
            {showHostForm ? "Close Form" : "Host a Game"}
          </button>
        </div>

<section className="mt-12 rounded-2xl border border-border bg-card p-6 md:p-8">
  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        🔥 Featured Game
      </p>

      <h2 className="mt-3 text-3xl font-semibold">
        Friday Night Basketball
      </h2>

      <p className="mt-2 text-muted-foreground">
        Wanderers Club • Johannesburg
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-3 py-1 text-xs">
          🏀 Basketball
        </span>

        <span className="rounded-full border border-border px-3 py-1 text-xs">
          Friday
        </span>

        <span className="rounded-full border border-border px-3 py-1 text-xs">
          19:00
        </span>

        <span className="rounded-full border border-border px-3 py-1 text-xs">
          Intermediate
        </span>

        <span className="rounded-full border border-border px-3 py-1 text-xs">
          8 / 10 Players
        </span>
      </div>
    </div>

    <button
      type="button"
      className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
    >
      Join Featured Game
    </button>
  </div>
</section>

        <section className="mt-14 grid gap-4 md:grid-cols-4">
          {[
            ["12", "Games played"],
            ["7", "Reputation"],
            ["3", "Current streak"],
            ["96%", "Attendance"],
          ].map(([value, label]) => (
            <article
              key={label}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-3xl font-semibold">{value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{label}</p>
            </article>
          ))}
        </section>

        {showHostForm && (
          <section className="mt-14 rounded-xl border border-border bg-card p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Create activity
            </p>

            <h2 className="mt-3 text-2xl font-medium">Host a game</h2>

            <form
              onSubmit={hostGame}
              className="mt-7 grid gap-4 md:grid-cols-2"
            >
              <label className="grid gap-2 text-sm">
                Sport
                <select
                  name="sport"
                  required
                  className="rounded-md border border-border bg-background px-3 py-3"
                >
                  {sports
                    .filter((sport) => sport !== "All Sports")
                    .map((sport) => (
                      <option key={sport}>{sport}</option>
                    ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                City
                <select
                  name="city"
                  required
                  className="rounded-md border border-border bg-background px-3 py-3"
                >
                  {cities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm md:col-span-2">
                Venue
                <input
                  name="venue"
                  required
                  placeholder="Park, school, university or sports facility"
                  className="rounded-md border border-border bg-background px-3 py-3"
                />
              </label>

              <label className="grid gap-2 text-sm">
                Date
                <input
                  name="date"
                  type="date"
                  required
                  className="rounded-md border border-border bg-background px-3 py-3"
                />
              </label>

              <label className="grid gap-2 text-sm">
                Time
                <input
                  name="time"
                  type="time"
                  required
                  className="rounded-md border border-border bg-background px-3 py-3"
                />
              </label>

              <label className="grid gap-2 text-sm">
                Skill level
                <select
                  name="skill"
                  className="rounded-md border border-border bg-background px-3 py-3"
                >
                  <option>All levels</option>
                  <option>Casual</option>
                  <option>Intermediate</option>
                  <option>Competitive</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                Maximum players
                <input
                  name="capacity"
                  type="number"
                  min="2"
                  max="100"
                  defaultValue="10"
                  required
                  className="rounded-md border border-border bg-background px-3 py-3"
                />
              </label>

              <button
                type="submit"
                className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground md:col-span-2"
              >
                Create Game
              </button>
            </form>
          </section>
        )}

        <section id="games" className="mt-16">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Local activity
              </p>
              <h2 className="mt-3 text-3xl font-medium">Games near you</h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
                className="rounded-md border border-border bg-background px-4 py-3 text-sm"
              >
                {cities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>

              <select
                value={selectedSport}
                onChange={(event) => setSelectedSport(event.target.value)}
                className="rounded-md border border-border bg-background px-4 py-3 text-sm"
              >
                {sports.map((sport) => (
                  <option key={sport}>{sport}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {filteredGames.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8">
                <h3 className="text-lg font-medium">No games found</h3>
                <p className="mt-2 text-muted-foreground">
                  Host the first {selectedSport.toLowerCase()} session in{" "}
                  {selectedCity}.
                </p>
              </div>
            ) : (
              filteredGames.map((game) => {
                const joined = joinedGames.includes(game.id);
                const full = game.players >= game.capacity && !joined;

                return (
                  <article
                    key={game.id}
                    className="grid gap-5 rounded-xl border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        <span>{game.sport}</span>
                        <span>•</span>
                        <span>{game.skill}</span>
                        <span>•</span>
                        <span>{game.city}</span>
                      </div>

                      <h3 className="mt-3 text-xl font-medium">{game.venue}</h3>

                      <p className="mt-2 text-sm text-muted-foreground">
                        {game.date} at {game.time} · {game.players}/
                        {game.capacity} players
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={full}
                      onClick={() => joinGame(game.id)}
                      className="rounded-md border border-border px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {joined ? "Leave Game" : full ? "Game Full" : "Join Game"}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Before activity
            </p>
            <h2 className="mt-3 text-2xl font-medium">Prepare</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li>Drink water before leaving.</li>
              <li>Complete a five-minute dynamic warm-up.</li>
              <li>Check equipment, footwear and weather.</li>
              <li>Tell someone where the session is taking place.</li>
            </ul>
          </article>

          <article className="rounded-xl border border-border p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              After activity
            </p>
            <h2 className="mt-3 text-2xl font-medium">Recover</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li>Rehydrate gradually after playing.</li>
              <li>Cool down before static stretching.</li>
              <li>Record the result and sportsmanship rating.</li>
              <li>Rest when pain feels abnormal or persistent.</li>
            </ul>
          </article>
        </section>

        <section className="mt-16 rounded-xl border border-border p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Alpha rollout
          </p>
          <h2 className="mt-3 text-2xl font-medium">South Africa first</h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Initial testing begins with Johannesburg and Pretoria before
            expanding through Cape Town, Durban, Gqeberha and other cities.
          </p>
        </section>

        <Link href="/">
          <a className="mt-10 inline-block text-sm underline underline-offset-4">
            Return to Vanta OS
          </a>
        </Link>
      </section>
    </main>
  );
}