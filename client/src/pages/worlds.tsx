import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReturnToCity } from "@/components/return-to-city";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { worlds, worldStatusStyle as statusStyle } from "@/data/worlds";
import cityImage from "@assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png";

export default function Worlds() {
  return (
    <div className="min-h-screen flex flex-col">
      <ReturnToCity />
      <Header />

      <main className="flex-1 bg-background pt-20">
        {/* ── Header section ── */}
        <section className="relative py-24 overflow-hidden border-b border-border">
          <img
            src={cityImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-10"
          />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 z-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">
              Projects & Universes
            </p>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6"
              data-testid="text-worlds-title"
            >
              Worlds
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed" data-testid="text-worlds-subtitle">
              Vanta Cold is not one project. It is a system of interconnected worlds — each with its own voice,
              aesthetic, and purpose. This is the map.
            </p>
            <div className="mt-8">
              <Link href="/world">
                <Button variant="outline" size="lg" className="font-mono text-xs uppercase tracking-widest gap-2" data-testid="button-enter-district">
                  <MapPin className="w-4 h-4" />
                  Enter Vanta District
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Worlds grid ── */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6">
              {worlds.map((world, index) => (
                <Card
                  key={world.id}
                  className="overflow-hidden"
                  data-testid={`card-world-${world.id}`}
                >
                  <CardContent className="p-0">
                    <div className={`grid grid-cols-1 lg:grid-cols-[1fr_2fr] ${index % 2 === 1 ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
                      {/* Index label */}
                      <div className={`flex flex-col justify-between p-8 bg-card border-b lg:border-b-0 lg:border-r border-border ${index % 2 === 1 ? "lg:order-2 lg:border-r-0 lg:border-l" : ""}`}>
                        <div>
                          <span className="text-5xl md:text-7xl font-display font-bold text-muted-foreground/20 leading-none block mb-6">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                            {world.tagline}
                          </p>
                          <h2
                            className="text-3xl md:text-4xl font-display font-bold mb-4"
                            data-testid={`text-world-name-${world.id}`}
                          >
                            {world.name}
                          </h2>
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-md border font-medium ${statusStyle[world.status]}`}
                            data-testid={`badge-world-status-${world.id}`}
                          >
                            {world.status}
                          </span>
                        </div>

                        <Link
                          href={world.href}
                          className="flex items-center gap-2 text-sm font-medium mt-8 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`link-world-cta-${world.id}`}
                        >
                          {world.cta} <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>

                      {/* Description */}
                      <div className={`p-8 flex flex-col justify-center gap-4 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                        <p
                          className="text-lg leading-relaxed text-foreground"
                          data-testid={`text-world-description-${world.id}`}
                        >
                          {world.description}
                        </p>
                        <p
                          className="text-sm text-muted-foreground leading-relaxed"
                          data-testid={`text-world-detail-${world.id}`}
                        >
                          {world.detail}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
