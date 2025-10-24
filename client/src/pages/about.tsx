import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import aboutImage from "@assets/generated_images/Artist_portrait_lifestyle_photo_4eb94ae9.png";
import studioImage from "@assets/generated_images/Recording_session_behind_scenes_04ce1f60.png";
import cityImage from "@assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png";

export default function About() {
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
                  About Vanta Cold
                </h1>
                <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                  <p data-testid="text-about-p1">
                    Vanta Cold is more than a music label—it's a journey documented
                    through sound, visuals, and stories. Born from a passion for
                    authentic creativity and raw expression, we're building something
                    genuine from the ground up.
                  </p>
                  <p data-testid="text-about-p2">
                    This blog serves as a window into the creative process. From late
                    night studio sessions to lifestyle moments that inspire the music,
                    every post captures a piece of the journey. It's about
                    transparency, connection, and sharing the real story behind the
                    music.
                  </p>
                  <p data-testid="text-about-p3">
                    We believe in the power of storytelling through multiple mediums—
                    combining music production with photography, videography, and
                    written narratives to create a complete artistic vision.
                  </p>
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
              The Journey
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
                  Creative Process
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Every track starts with an idea, a feeling, or a moment of
                  inspiration. Through countless hours in the studio, experimenting
                  with sounds, beats, and melodies, these ideas transform into the
                  music that defines Vanta Cold.
                </p>
              </div>

              <div className="flex flex-col justify-center md:order-2">
                <h3 className="text-2xl font-display font-bold mb-4">
                  Building the Vision
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  From navigating the music industry to building a brand identity,
                  every step is a learning experience. This platform documents not
                  just the successes, but the challenges, setbacks, and lessons
                  learned along the way.
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
              Our Mission
            </h2>
            <p
              className="text-xl text-muted-foreground leading-relaxed mb-8"
              data-testid="text-mission-content"
            >
              To create music that resonates, tell stories that inspire, and build a
              community around authentic artistic expression. Vanta Cold represents
              the journey of turning passion into reality, one post, one track, one
              moment at a time.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
