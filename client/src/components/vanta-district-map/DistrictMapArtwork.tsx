import {
  DISTRICT_BLOCKS,
  DISTRICT_MAP_HEIGHT,
  DISTRICT_MAP_WIDTH,
  DISTRICT_ZONES,
} from "./district-map-geometry";
import {
  DISTRICT_BRIDGE_MARK_PATHS,
  DISTRICT_DESTINATION_ACCESS_ROADS,
  DISTRICT_PARK_POLYGONS,
  DISTRICT_ROAD_LINES,
  DISTRICT_RIVER_TOP_SHORELINE,
  DISTRICT_WATER_POLYGON,
  districtRoadPath,
} from "./district-navigation-geometry";

type Props = {
  className?: string;
  viewBox?: string;
};

const mapPoints = (points: Array<{ x: number; y: number }>) =>
  points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

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
      <polygon className="vdm-water" points={mapPoints(DISTRICT_WATER_POLYGON)} />
      <polyline className="vdm-water-highlight" points={mapPoints(DISTRICT_RIVER_TOP_SHORELINE)} />
      {DISTRICT_PARK_POLYGONS.map((polygon, index) => (
        <polygon key={`park-${index}`} className="vdm-park" points={mapPoints(polygon)} />
      ))}
      <path className="vdm-park-detail" d="M85 575 L124 614 L177 565 M124 614 L163 652 M124 614 L75 645" />
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
        {DISTRICT_BRIDGE_MARK_PATHS.map((path, index) => (
          <path key={`bridge-${index}`} className="vdm-bridge-mark" d={path} aria-hidden="true" />
        ))}
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
