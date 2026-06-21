export type WorldStatus = "Active" | "In Development" | "Coming Soon";

export interface WorldEntry {
  id: string;
  name: string;
  tagline: string;
  status: WorldStatus;
  description: string;
  detail: string;
  href: string;
  cta: string;
}

export const worlds: WorldEntry[] = [
  {
    id: "vanta-cold",
    name: "Vanta Cold",
    tagline: "The Label",
    status: "Active",
    description:
      "The creative headquarters. Music, visuals, and the architecture of the sound. Vanta Cold documents the journey of building an independent music label from the ground up — raw, deliberate, and uncompromising.",
    detail:
      "Albums, singles, transmissions, and lifestyle content all originate here. The label is the root of the system.",
    href: "/releases",
    cta: "View Releases",
  },
  {
    id: "vanta-os",
    name: "Vanta OS",
    tagline: "The System",
    status: "In Development",
    description:
      "An evolving interface for navigating the Vanta universe. Vanta OS is a conceptual operating system — part mythology, part music infrastructure — designed to gate premium access and frame the world around Vanta Cold.",
    detail:
      "Authentication required. A private system is being built. Invite-only access will open when the system is ready.",
    href: "/enter",
    cta: "Request Access",
  },
  {
    id: "fractured-godhead",
    name: "Fractured Godhead",
    tagline: "The Mythology",
    status: "In Development",
    description:
      "A conceptual universe built through sound, story, and visual language. Fractured Godhead is a long-form artistic world with its own cosmology, characters, and aesthetic logic — told across music, writing, and visuals.",
    detail:
      "This world is being built piece by piece. Enter the archive to explore its characters, factions, and artifacts.",
    href: "/fgh",
    cta: "Enter Archive",
  },
  {
    id: "solo-mission",
    name: "Solo Mission",
    tagline: "The Solo Project",
    status: "Active",
    description:
      "Independent transmissions from the artist. Personal, direct, unfiltered. Solo Mission captures the individual voice behind the label — stripped of ensemble and closest to the source.",
    detail:
      "No collaborators. No compromise. Just the work.",
    href: "/",
    cta: "Read Transmissions",
  },
  {
    id: "mobbrats",
    name: "Mobbrats",
    tagline: "The Collective",
    status: "Coming Soon",
    description:
      "A crew-based project living at the intersection of street culture and music. Mobbrats is collaborative, energetic, and rooted in the culture that shaped the sound.",
    detail:
      "Details releasing soon. Watch for signals.",
    href: "/",
    cta: "Coming Soon",
  },
];

export const worldStatusStyle: Record<string, string> = {
  "Active": "bg-primary/20 text-primary border-primary/30",
  "In Development": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Coming Soon": "bg-muted/40 text-muted-foreground border-border",
};
