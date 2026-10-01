import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReturnToCity } from "@/components/return-to-city";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { CSSProperties } from "react";
import { worlds, worldStatusStyle as statusStyle } from "@/data/worlds";
import cityImage from "@assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png";
import { ParallaxLayer, VantaDepth } from "@/components/vanta-depth";
import { GlitchText, SignalGlitch } from "@/components/vanta-signal";
import { LivingScene, SceneFog, SceneLayer, SceneLight, SceneReveal } from "@/components/vanta-living-scene";

export default function Worlds() {
  return (
    <div className="min-h-screen flex flex-col">
      <ReturnToCity />
      <Header />

      <main className="flex-1 bg-background pt-20">
        {/* ── Header section ── */}
        <VantaDepth className="relative py-24 overflow-hidden border-b border-border">
          <ParallaxLayer depth={-205} mobileDepth={-125} className="pointer-events-none absolute inset-[-7%] z-0">
            <SignalGlitch intensity="medium" className="h-full w-full">
              <div className="vanta-city-image-drift">
                <img src={cityImage} alt="" aria-hidden="true" className="opacity-20" />
                <span className="vanta-city-lights" />
              </div>
            </SignalGlitch>
          </ParallaxLayer>
          <ParallaxLayer depth={-55} mobileDepth={-32} className="pointer-events-none absolute inset-[-3%] z-[2]">
            <SceneLight className="inset-0" style={{ "--scene-light-strength": 0.55 } as CSSProperties} />
          </ParallaxLayer>
          <ParallaxLayer depth={34} mobileDepth={22} className="pointer-events-none absolute inset-[-3%] z-[3]">
            <SceneFog className="inset-0 vanta-worlds-fog-depth" />
          </ParallaxLayer>
          <LivingScene className="absolute inset-0 z-[1] vanta-worlds-scene">
            <SceneLayer className="vanta-city-drift" />
            <SceneFog className="vanta-city-ground-fog" />
          </LivingScene>
          <SceneReveal className="relative max-w-7xl mx-auto px-6 lg:px-8 z-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">
              <GlitchText intensity="medium">PROJECTS & UNIVERSES</GlitchText>
            </p>
            <h1
              className="vanta-scene-stage text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6"
              data-testid="text-worlds-title"
              data-scene-stage="title"
            >
              Worlds
            </h1>
            <p className="vanta-scene-stage text-xl text-muted-foreground max-w-2xl leading-relaxed" data-testid="text-worlds-subtitle" data-scene-stage="description">
              Vanta Cold is not one project. It is a system of interconnected worlds — each with its own voice,
              aesthetic, and purpose. This is the map.
            </p>
            <div className="vanta-scene-stage mt-8" data-scene-stage="controls">
              <Link href="/world">
                <Button variant="outline" size="lg" className="font-mono text-xs uppercase tracking-widest gap-2" data-testid="button-enter-district">
                  <MapPin className="w-4 h-4" />
                  Enter Vanta District
                </Button>
              </Link>
            </div>
          </SceneReveal>
        </VantaDepth>

        {/* ── Worlds grid ── */}
        <VantaDepth className="relative overflow-hidden py-20">
          <ParallaxLayer depth={-82} mobileDepth={-46} className="pointer-events-none absolute inset-[-5%] z-0">
            <div className="vanta-worlds-depth-image h-full w-full">
              <img src={cityImage} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <span className="vanta-city-lights" aria-hidden="true" />
            </div>
          </ParallaxLayer>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6">
              {worlds.map((world, index) => (
                <SceneReveal key={world.id} delay={Math.min(index * 80, 240)}>
                <Card
                  className="h-full overflow-hidden"
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
                            className="vanta-scene-stage text-3xl md:text-4xl font-display font-bold mb-4"
                            data-testid={`text-world-name-${world.id}`}
                            data-scene-stage="title"
                          >
                            {world.name}
                          </h2>
                          <span
                            className={`vanta-scene-stage inline-block text-xs px-2 py-1 rounded-md border font-medium ${statusStyle[world.status]}`}
                            data-testid={`badge-world-status-${world.id}`}
                            data-scene-stage="metadata"
                          >
                            {world.status}
                          </span>
                        </div>

                        <Link
                          href={world.href}
                          className="vanta-scene-stage flex items-center gap-2 text-sm font-medium mt-8 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`link-world-cta-${world.id}`}
                          data-scene-stage="controls"
                        >
                          {world.cta} <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>

                      {/* Description */}
                       <div className={`p-8 flex flex-col justify-center gap-4 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                        <p
                          className="vanta-scene-stage text-lg leading-relaxed text-foreground"
                          data-testid={`text-world-description-${world.id}`}
                          data-scene-stage="description"
                        >
                          {world.description}
                        </p>
                        <p
                          className="vanta-scene-stage text-sm text-muted-foreground leading-relaxed"
                          data-testid={`text-world-detail-${world.id}`}
                          data-scene-stage="description"
                        >
                          {world.detail}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </SceneReveal>
              ))}
            </div>
          </div>
        </VantaDepth>
      </main>

      <Footer />
    </div>
  );
}
