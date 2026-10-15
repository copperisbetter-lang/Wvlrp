/**
 * The Wild — sponsor-preview village planting blueprint.
 * Coordinate system: world X/Z in metres, not GIS or real estate parcels.
 *
 * These are proposed tree CENTRES, not yet rendered plants. 3D asset selection
 * must supply genuinely different licensed PBR species/variants before a build
 * can activate them. NO generic procedural tree fallback, NO one-GLB clones.
 */
import {VILLAGE_SECTION} from "./wild-acre-regions.js";
import {VILLAGE_CLEARING,COMMUNITY_SITES,pathDistance,siteDistance} from "./wild-reference-layout.js";
import {VILLAGE_DETAIL_ZONE} from "./wild-village-detail-spec.js";

export const HERO_WILLOW=Object.freeze({
  id:"village-hero-weeping-willow",
  species:"weeping-willow", x:112,z:68,
  targetHeightMetres:22,canopyRadiusMetres:11,
  model:"NEEDS_REVIEWED_PBR_WEEPING_WILLOW_GLB",
  status:"planned-not-installed",
  note:"One true drooping-leaf hero tree. Replace old square test broadleaf AFTER willow QA; never stack both."
});

// Regions are composed for the one ~3-acre box around the community.
// The 75-m central gathering square remains EMPTY of new peripheral trees.
// M=mature specimen (several uniquely modeled crown variants required);
// Y=young individual (a genuinely age-appropriate source model).
const REGIONS=Object.freeze([
  {
    id:"west-lower",label:"West woodland edge",goal:"Dense Appalachian hardwood pockets",
    species:["white-oak","red-maple","american-beech","tulip-poplar","eastern-hemlock","shagbark-hickory"],
    points:"33.8,64.7,M;34.1,72.7,M;36.9,57.3,M;46.1,61.6,Y;33.7,96.6,M;47.6,48.5,Y;34.2,84.7,M;41.5,88.9,Y;42.1,75.5,M;48.9,82.6,M;38.5,49.6,M;42.9,94.4,Y;49.2,70.6,Y;46.8,54.6,Y;42.7,67.3,Y;29.7,51.1,M;29.2,78.7,Y;49.7,91.5,Y"
  },
  {
    id:"west-upper",label:"Laurel-side wooded buffer",goal:"Natural shade beyond kitchen access",
    species:["eastern-hemlock","eastern-white-pine","american-beech","chestnut-oak","black-cherry"],
    points:"30.2,123.3,Y;31.1,114.6,M;29.7,105.2,Y;37.0,105.9,Y;36.5,123.7,Y"
  },
  {
    id:"east-lower",label:"East woodland edge",goal:"Distinct oaks, maples, walnut and pine",
    species:["northern-red-oak","sugar-maple","black-walnut","tulip-poplar","virginia-pine","american-sycamore"],
    points:"156.4,65.2,M;150.1,87.1,Y;156.7,53.1,M;141.0,73.1,Y;140.9,49.3,M;155.6,96.7,Y;148.8,56.5,Y;146.0,65.2,M;152.2,75.7,M;139.6,57.9,Y;138.9,81.6,M;141.2,93.0,Y;137.8,64.7,Y;148.4,96.2,Y;155.2,89.5,Y;150.7,47.8,Y"
  },
  {
    id:"east-upper",label:"Mercantile-side wooded buffer",goal:"Screen service edge without hiding storefront",
    species:["eastern-white-pine","chestnut-oak","river-birch","eastern-hemlock","red-maple"],
    points:"154.5,123.0,M;151.1,108.1,Y;156.8,108.3,Y;150.8,102.2,Y;150.5,115.5,Y;156.4,115.1,Y"
  },
  {
    id:"southwest-gateway",label:"Western village approach",goal:"Layered entry trees framing first view",
    species:["sugar-maple","river-birch","white-oak","black-cherry"],
    points:"65.1,47.9,M;53.2,51.6,Y;74.3,46.6,M;82.4,45.4,Y;59.2,42.6,Y;79.2,40.1,Y"
  },
  {
    id:"southeast-gateway",label:"Eastern village approach",goal:"Complement entry forest without blocking road",
    species:["northern-red-oak","shagbark-hickory","red-maple","black-walnut"],
    points:"127.0,47.0,Y;107.8,47.0,M;119.8,43.3,Y;114.7,51.3,M;114.1,41.8,Y;131.5,43.1,Y"
  },
  {
    id:"northwest-transition",label:"Northwest building gap",goal:"One natural young tree, not a wall behind the roof",
    species:["american-beech"],points:"73.2,121.7,Y"
  },
  {
    id:"northeast-transition",label:"Northeast building gap",goal:"One natural young tree, mountain sky stays open",
    species:["chestnut-oak"],points:"112.5,120.5,Y"
  }
]);

export const VILLAGE_PLANTING_REGIONS=Object.freeze(REGIONS.map(({points,...zone})=>
  Object.freeze({...zone,count:points.split(";").length})
));

const HEIGHTS=Object.freeze({
  "white-oak":26,"northern-red-oak":26,"chestnut-oak":23,
  "sugar-maple":23,"red-maple":21,"tulip-poplar":30,
  "american-beech":24,"black-cherry":23,"shagbark-hickory":26,
  "black-walnut":25,"eastern-hemlock":25,"eastern-white-pine":29,
  "virginia-pine":20,"american-sycamore":27,"river-birch":21
});
const hash=(a,b)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};

export const VILLAGE_PROPOSED_TREES=Object.freeze(REGIONS.flatMap((zone,zIndex)=>
  zone.points.split(";").map((entry,i)=>{
    const [xs,zs,age]=entry.split(",");
    const x=Number(xs),z=Number(zs),young=age==="Y";
    const species=zone.species[i%zone.species.length];
    const sizeFactor=young?0.35+hash(x,z)*.25:0.82+hash(z,x)*.24;
    return Object.freeze({
      id:`village-grove-${zone.id}-${String(i+1).padStart(2,"0")}`,
      zoneId:zone.id,x,z,species,age:young?"young":"mature",
      // An authentic age/model silhouette is mandatory; these are art targets,
      // NOT instructions to reuse a single GLB with different scales.
      modelVariant:`pbr-${species}-${young?"young":"mature"}-${1+((i+zIndex)%3)}`,
      targetHeightMetres:Math.round(HEIGHTS[species]*sizeFactor*10)/10,
      yawRadians:Math.round(hash(x+17,z+23)*6.283*1000)/1000
    });
  })
));

export const VILLAGE_TREE_COUNT=VILLAGE_PROPOSED_TREES.length;

/** Prevent trees emerging through the gathering square, buildings, campfire,
 * paths, or mountain view. This is a QA constraint, not runtime fall-back. */
export function villagePlantingViolations(t){
  const failures=[];
  if(t.x<VILLAGE_SECTION.minX||t.x>VILLAGE_SECTION.maxX||
     t.z<VILLAGE_SECTION.minZ||t.z>VILLAGE_SECTION.maxZ)failures.push("outside-3-acres");
  const isWillow=t.id===HERO_WILLOW.id;
  if(isWillow){
    if(Math.hypot(t.x-VILLAGE_DETAIL_ZONE.centerX,t.z-VILLAGE_DETAIL_ZONE.centerZ)>=
       VILLAGE_DETAIL_ZONE.radiusMetres)failures.push("willow-outside-square");
    if(Math.hypot(t.x-VILLAGE_CLEARING.fireX,t.z-VILLAGE_CLEARING.fireZ)<
       t.canopyRadiusMetres+7)failures.push("willow-too-close-to-fire");
  }else{
    if(Math.hypot(t.x-VILLAGE_DETAIL_ZONE.centerX,t.z-VILLAGE_DETAIL_ZONE.centerZ)<40)
      failures.push("planted-in-square");
    if(Math.hypot(t.x-VILLAGE_CLEARING.fireX,t.z-VILLAGE_CLEARING.fireZ)<12)
      failures.push("planted-in-fire-circle");
    const minBuilding=t.age==="young"?5.5:9.5;
    if(COMMUNITY_SITES.some(s=>siteDistance(t.x,t.z,s)<minBuilding))
      failures.push("too-close-to-building");
    if(pathDistance(t.x,t.z)<(t.age==="young"?3:4.8))
      failures.push("blocked-path");
    if(t.z>=123&&t.x>68&&t.x<118)failures.push("blocked-mountain-sightline");
  }
  return failures;
}

export const VILLAGE_PLANTING_METADATA=Object.freeze({
  areaAcres:VILLAGE_SECTION.acres,
  approximateSquareDiameterMetres:VILLAGE_DETAIL_ZONE.diameterMetres,
  proposedPeripheralTrees:VILLAGE_TREE_COUNT,
  proposedSignatureWillows:1,
  geometryInstalled:false,
  photoRealisticModelsAvailable:false,
  existingPilotOak:"remains until replacement willow GLB quality and performance have been verified",
  projectPhase:"blueprint only"
});
