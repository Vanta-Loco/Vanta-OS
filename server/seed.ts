import { storage } from "./storage";
import type { InsertPost } from "@shared/schema";

const seedPosts: InsertPost[] = [
  {
    title: "Welcome to Vanta Cold",
    excerpt: "The beginning of a journey documenting music creation, lifestyle moments, and everything in between.",
    content: `This is the start of something special. Vanta Cold isn't just a music label—it's a platform for authentic storytelling through sound, visuals, and words.

Over the coming weeks and months, this space will transform into a comprehensive documentation of the creative process. From studio sessions to lifestyle photography, from production techniques to personal reflections on the music industry.

Every post here represents a piece of the puzzle, a chapter in the story of building something meaningful from the ground up. Whether you're a fellow artist, music enthusiast, or just curious about the journey, welcome aboard.

Let's create something unforgettable together.`,
    coverImage: "/attached_assets/generated_images/Music_studio_lifestyle_hero_cf7ae2f2.png",
    coverImagePosition: "50% 50%",
    images: [
      "/attached_assets/generated_images/Recording_session_behind_scenes_04ce1f60.png",
      "/attached_assets/generated_images/Artist_portrait_lifestyle_photo_4eb94ae9.png"
    ],
    category: "Music Production",
    readTime: "3 min read",
    featured: "true",
  },
  {
    title: "Late Night Sessions",
    excerpt: "There's something magical about creating music when the world is asleep. The studio becomes a sanctuary.",
    content: `3 AM. The city outside is quiet. Inside the studio, creativity flows without boundaries.

These late-night sessions are where the magic happens. No distractions, no interruptions—just pure focus on the craft. The synthesizers hum, the monitors glow, and ideas transform into tracks.

Some of the best music comes from these moments. When you're tired, your conscious mind steps back and lets intuition take the wheel. That's when you discover sounds you didn't know you were searching for.

The coffee helps. The ambient lighting sets the mood. But ultimately, it's about being present with the music, letting each sound guide the next decision.

These are the moments that define Vanta Cold.`,
    coverImage: "/attached_assets/generated_images/Recording_session_behind_scenes_04ce1f60.png",
    coverImagePosition: "50% 50%",
    images: [],
    category: "Behind the Scenes",
    readTime: "4 min read",
    featured: "false",
  },
  {
    title: "Building a Vision",
    excerpt: "Creating a music label from scratch requires more than talent—it demands vision, persistence, and authenticity.",
    content: `Every successful label starts with a vision. For Vanta Cold, that vision is clear: create genuine music that resonates, tell authentic stories, and build a community around creative expression.

The journey hasn't been easy. From learning production techniques to understanding the business side of music, every step has been a lesson. But that's what makes it worthwhile.

This blog exists to document not just the successes, but the challenges too. The late nights debugging DAW crashes. The frustration of a mix that won't sit right. The excitement when a track finally clicks.

It's all part of the process. And sharing that process openly creates connection. That's what Vanta Cold is about—real stories, real music, real journey.

Looking ahead, there's so much more to build. More music to create, more stories to tell, more moments to capture. And you're invited to be part of it all.`,
    coverImage: "/attached_assets/generated_images/Urban_night_cityscape_mood_2c3c2c61.png",
    coverImagePosition: "50% 50%",
    images: [],
    category: "Creative Process",
    readTime: "5 min read",
    featured: "false",
  }
];

export async function seedDatabase() {
  const existingPosts = await storage.getPosts();
  
  if (existingPosts.length > 0) {
    console.log(`Database already has ${existingPosts.length} posts, skipping seed`);
    return;
  }
  
  console.log("Seeding database with sample posts...");
  
  for (const post of seedPosts) {
    await storage.createPost(post);
  }
  
  console.log(`✓ Seeded ${seedPosts.length} posts successfully`);
}
