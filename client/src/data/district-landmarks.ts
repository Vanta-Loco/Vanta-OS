export type DistrictAction = "route" | "music-hub" | "locked";
export type DistrictLandmarkCategory = "archive" | "music" | "vault" | "signal" | "district" | "transport" | "system" | "portal" | "station";

export interface DistrictLandmark {
  id: string;
  name: string;
  shortName: string;
  category: DistrictLandmarkCategory;
  district: string;
  x: number;
  z: number;
  height: number;
  buildingColor: number;
  beaconColor: number;
  mapColor: string;
  description: string;
  status: string;
  actionLabel: string;
  action: DistrictAction;
  route: string | null;
}

export const DISTRICT_LANDMARKS: DistrictLandmark[] = [
  {
    id: "black-index", name: "BLACK INDEX", shortName: "IDX", category: "archive", district: "TECH",
    x: 40, z: -40, height: 36, buildingColor: 0x0a0014, beaconColor: 0x7c3aed, mapColor: "#a78bfa",
    description: "A searchable archive of the Vanta system.", status: "OPEN", actionLabel: "OPEN BLACK INDEX", action: "route", route: "/search",
  },
  {
    id: "music-hub", name: "MUSIC HUB", shortName: "MUS", category: "music", district: "INDUSTRIAL",
    x: -60, z: -60, height: 28, buildingColor: 0x14000a, beaconColor: 0xec4899, mapColor: "#f472b6",
    description: "A listening room connecting releases and the Vanta Bedroom.", status: "2 DESTINATIONS", actionLabel: "OPEN MUSIC HUB", action: "music-hub", route: null,
  },
  {
    id: "vault-gate", name: "VAULT GATE", shortName: "VLT", category: "vault",
    district: "COMMERCIAL", x: 90, z: 20, height: 20, buildingColor: 0x001400, beaconColor: 0x22c55e, mapColor: "#4ade80",
    description: "Entry to the restricted Vanta archive.", status: "ACCESS CONTROLLED", actionLabel: "OPEN VAULT", action: "route", route: "/vault",
  },
  {
    id: "wireline", name: "WIRELINE TERMINAL", shortName: "WRL", category: "signal", district: "RESIDENTIAL",
    x: -90, z: 50, height: 24, buildingColor: 0x000a14, beaconColor: 0x3b82f6, mapColor: "#60a5fa",
    description: "A dispatch relay for city signals and transmissions.", status: "OPEN", actionLabel: "OPEN WIRELINE", action: "route", route: "/wireline",
  },
  {
    id: "fract", name: "FRACT EXCHANGE", shortName: "FRX", category: "district", district: "TECH",
    x: 10, z: -110, height: 30, buildingColor: 0x100014, beaconColor: 0xf59e0b, mapColor: "#fbbf24",
    description: "The Vanta reputation and exchange network.", status: "OPEN", actionLabel: "OPEN FRACT", action: "route", route: "/fract",
  },
  {
    id: "subway", name: "VANTA METRO", shortName: "MET", category: "transport", district: "RESIDENTIAL",
    x: -20, z: 70, height: 5, buildingColor: 0x0a0a14, beaconColor: 0x6b7280, mapColor: "#9ca3af",
    description: "The station is visible, but the route is not cleared.", status: "LOCKED", actionLabel: "ROUTE LOCKED", action: "locked", route: null,
  },
  {
    id: "vanta-os", name: "VANTA OS CORE", shortName: "VOS", category: "system", district: "TECH",
    x: 110, z: -90, height: 32, buildingColor: 0x0a0010, beaconColor: 0xa855f7, mapColor: "#c084fc",
    description: "The core interface for Vanta OS.", status: "OPEN", actionLabel: "ENTER VANTA OS", action: "route", route: "/enter",
  },
  {
    id: "fractured-godhead-portal", name: "FRACTURED GODHEAD PORTAL", shortName: "FGH", category: "portal", district: "INDUSTRIAL",
    x: -150, z: -125, height: 26, buildingColor: 0x13091b, beaconColor: 0x8b5cf6, mapColor: "#c4b5fd",
    description: "A threshold into the Fractured Godhead archive and its separate mythology.", status: "ARCHIVE", actionLabel: "ENTER FGH ARCHIVE", action: "route", route: "/fgh",
  },
  {
    id: "brizz-station", name: "GODFORSAKEN PARADISE", shortName: "BRZ", category: "station", district: "COMMERCIAL",
    x: 145, z: 145, height: 22, buildingColor: 0x1a100b, beaconColor: 0xe5a85d, mapColor: "#f0bb78",
    description: "The Brizz General’s Station. A standalone Fractured Godhead-universe assignment.", status: "PLAYABLE", actionLabel: "ENTER THE STATION", action: "route", route: "/godforsaken-paradise",
  },
];

export const DISTRICT_ZONES = [
  { id: "industrial", name: "INDUSTRIAL", x: -200, z: -200, width: 200, depth: 200, color: "#b8884d" },
  { id: "tech", name: "TECH", x: 0, z: -200, width: 200, depth: 200, color: "#9277e8" },
  { id: "residential", name: "RESIDENTIAL", x: -200, z: 0, width: 200, depth: 200, color: "#6b9b9a" },
  { id: "commercial", name: "COMMERCIAL", x: 0, z: 0, width: 200, depth: 200, color: "#cc728c" },
] as const;
