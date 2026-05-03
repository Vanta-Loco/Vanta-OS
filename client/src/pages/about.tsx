import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ABOUT_DEFAULTS, type SiteContent } from "@shared/schema";
import aboutImage from "@assets/generated_images/Artist_portrait_lifestyle_photo_4eb94ae9.png";
import studioImage from "@assets/generated_images/Recording_session_behind_scenes_04ce1f60.png";
import cityImage from "@assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png";

export default function About() {
  const { data } = useQuery<SiteContent>({
    queryKey: ["/api/site-content/about"],
  });

  const c = data ?? ABOUT_DEFAULTS;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-20">
        <section className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                <img
                  src={aboutImage}
                  alt="Vanta Cold Artist"
                  className="w-full h-full object-cover"
                  data-testid="img-about-hero"
                />
              </div>

              <div>
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight"
                  data-testid="text-about-title"
                >
                  {c.title}
                </h1>
                <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                  <p data-testid="text-about-p1">{c.heroP1}</p>
                  <p data-testid="text-about-p2">{c.heroP2}</p>
                  <p data-testid="text-about-p3">{c.heroP3}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-card">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2
              className="text-3xl md:text-4xl font-display font-bold mb-12 text-center"
              data-testid="text-journey-title"
            >
              {c.journeyTitle}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden">
                <img
                  src={studioImage}
                  alt="Studio Sessions"
                  className="w-full h-full object-cover"
                  data-testid="img-studio"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-2xl font-display font-bold mb-4">
                  {c.creativeTitle}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {c.creativeBody}
                </p>
              </div>

              <div className="flex flex-col justify-center md:order-2">
                <h3 className="text-2xl font-display font-bold mb-4">
                  {c.visionTitle}
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {c.visionBody}
                </p>
              </div>
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden md:order-1">
                <img
                  src={cityImage}
                  alt="Building Vision"
                  className="w-full h-full object-cover"
                  data-testid="img-vision"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <h2
              className="text-3xl md:text-4xl font-display font-bold mb-6"
              data-testid="text-mission-title"
            >
              {c.missionTitle}
            </h2>
            <p
              className="text-xl text-muted-foreground leading-relaxed mb-8"
              data-testid="text-mission-content"
            >
              {c.missionBody}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
