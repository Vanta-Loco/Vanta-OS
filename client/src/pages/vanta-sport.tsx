import { Link } from "wouter";

const features = [
  {
    title: "Find a Game",
    description:
      "Discover pickup football, basketball, tennis, rugby, cricket and other games around South African cities.",
  },
  {
    title: "Host a Session",
    description:
      "Choose the sport, field, date, player limit and experience level, then invite the local community.",
  },
  {
    title: "Build Reputation",
    description:
      "Record wins, losses, draws, streaks, attendance and sportsmanship.",
  },
  {
    title: "Prepare & Recover",
    description:
      "Get hydration reminders, warm-up routines, stretching guides and recovery checklists.",
  },
];

export default function VantaSport() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Vanta OS Application
        </p>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
          Vanta Sport
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
          A community sports network for organizing real-world games, staying
          active and building a respected local sporting identity.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Find a Game
          </button>

          <button
            type="button"
            className="rounded-md border border-border px-5 py-3 text-sm font-medium"
          >
            Host a Game
          </button>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h2 className="text-xl font-medium">{feature.title}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-16 rounded-xl border border-border p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Prototype status
          </p>

          <h2 className="mt-3 text-2xl font-medium">South Africa Alpha</h2>

          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
            Initial testing can begin with Johannesburg and Pretoria before
            expanding to Cape Town, Durban, Gqeberha and other cities.
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