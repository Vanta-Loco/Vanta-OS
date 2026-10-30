import {
  DISTRICT_BLOCKS,
  DISTRICT_MAP_HEIGHT,
  DISTRICT_MAP_WIDTH,
  DISTRICT_ZONES,
} from "./district-map-geometry";
import {
  DISTRICT_DESTINATION_ACCESS_ROADS,
  DISTRICT_ROAD_LINES,
  districtRoadPath,
} from "./district-navigation-geometry";

type Props = {
  className?: string;
  viewBox?: string;
};

export function DistrictMapArtwork({ className = "vdm-map-art", viewBox = `0 0 ${DISTRICT_MAP_WIDTH} ${DISTRICT_MAP_HEIGHT}` }: Props) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="vdm-grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M 34 0 L 0 0 0 34" fill="none" stroke="rgba(190,155,238,.075)" strokeWidth="1" />
        </pattern>
        <pattern id="vdm-water-grid" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 11 Q5 7 11 11 T22 11" fill="none" stroke="rgba(106,151,181,.12)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={DISTRICT_MAP_WIDTH} height={DISTRICT_MAP_HEIGHT} fill="#0b0a12" />
      <rect width={DISTRICT_MAP_WIDTH} height={DISTRICT_MAP_HEIGHT} fill="url(#vdm-grid)" />
      {DISTRICT_ZONES.map((district) => (
        <g key={district.name}>
          <polygon className={`vdm-district-zone zone-${district.tint}`} points={district.points} />
          <text className="vdm-district-name" x={district.labelX} y={district.labelY}>{district.name}</text>
        </g>
      ))}
      <path className="vdm-water" d="M-10 251 C112 225 172 268 258 256 C344 244 402 230 476 256 C555 284 606 320 691 305 C803 286 875 242 1010 268 L1010 294 C875 268 803 311 694 332 C600 350 551 312 466 284 C398 262 344 278 262 288 C166 300 112 258 -10 282 Z" />
      <path className="vdm-water-highlight" d="M-10 265 C112 239 172 282 258 270 C344 258 402 244 476 270 C555 298 606 334 691 319 C803 300 875 256 1010 282" />
      <path className="vdm-park" d="M73 557 L197 541 L232 618 L179 670 L54 663 Z" />
      <path className="vdm-park-detail" d="M85 575 L124 614 L177 565 M124 614 L163 652 M124 614 L75 645" />
      <path className="vdm-park" d="M786 447 L865 431 L933 458 L916 520 L837 532 L776 499 Z" />
      <path className="vdm-park-detail" d="M798 471 L844 487 L891 452 M844 487 L858 521 M844 487 L803 510" />
      {DISTRICT_BLOCKS.map(([x, y, width, height], index) => (
        <g key={`block-${index}`} className="vdm-city-block">
          <rect x={x} y={y} width={width} height={height} rx="2" />
          <path d={`M${x + 8} ${y + 8}h${width * 0.28} M${x + 8} ${y + 15}h${width * 0.54}`} />
          <circle cx={x + width - 9} cy={y + 10} r="2" />
        </g>
      ))}
      <g className="vdm-roads">
        {DISTRICT_ROAD_LINES.map((road) => {
          const path = districtRoadPath(road.points);
          const arterial = road.roadClass === "arterial";
          return (
            <g key={road.id} data-road-id={road.id}>
              <path className={arterial ? "vdm-arterial-edge" : "vdm-road-edge"} d={path} />
              <path className={arterial ? "vdm-arterial" : "vdm-road-fill"} d={path} />
              {!arterial && <path className="vdm-road-center" d={path} />}
            </g>
          );
        })}
        {DISTRICT_DESTINATION_ACCESS_ROADS.map((road) => (
          <g key={road.id} data-road-id={road.id} data-road-class={road.roadClass}>
            <path className={road.roadClass === "bridge" ? "vdm-bridge-access-edge" : "vdm-alley-edge"} d={districtRoadPath(road.points)} />
            <path className={road.roadClass === "bridge" ? "vdm-bridge-access-fill" : "vdm-alley-fill"} d={districtRoadPath(road.points)} />
          </g>
        ))}
        {[155, 365, 652, 856].map((x) => (
          <g key={`bridge-${x}`} className="vdm-bridge-mark" aria-hidden="true">
            <path d={`M${x - 4} 263v21 M${x} 263v21 M${x + 4} 263v21`} />
          </g>
        ))}
        <g className="vdm-bridge-mark" aria-hidden="true">
          <path d="M488 278h14 M488 284h14 M488 290h14" />
        </g>
      </g>
      <g className="vdm-road-labels">
        <text x="66" y="108">WESTLINE AVE</text><text x="667" y="358">CROWN CIRCUIT</text>
        <text x="505" y="558" transform="rotate(85 505 558)">NORTH / SOUTH SPINE</text>
        <text x="789" y="201">EAST RELAY</text>
      </g>
      <g className="vdm-crossings">
        {[155, 365, 652, 856].map((x) => [116, 365, 450].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4" />
        )))}
      </g>
      <path className="vdm-map-border" d="M22 22H978V678H22Z" />
      <path className="vdm-map-corner" d="M22 53V22H53 M947 22H978V53 M22 647V678H53 M947 678H978V647" />
    </svg>
  );
}
