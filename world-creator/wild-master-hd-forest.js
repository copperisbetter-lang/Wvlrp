// The Wild master HD forest installer. One entry point for all verified sources.
// The individual species loaders retain their proven grounding and exclusions.
import {installAutumnMaples} from "./wild-autumn-maple-scatter.js";
import {installNativeConiferScatter} from "./wild-native-conifer-scatter.js";
import {FOREST_SPECIES_TARGETS,validateForestTargets} from "./wild-master-forest-registry.js";
import {FOREST_CAMPS} from "./wild-master-forest-reservations.js";

export function installMasterHDForest(B,scene,{seed,terrainHeight,excluded=()=>false}={}){
  validateForestTargets();
  if(FOREST_CAMPS.length!==100)throw Error("Forest campsite reservations incomplete");
  const maple=installAutumnMaples(B,scene,{
    seed,terrainHeight,radius:2400,density:.18,maxVisible:180,
    excluded:(x,z,clearance)=>excluded(x,z,clearance)
  });
  const conifer=installNativeConiferScatter(B,scene,{
    seed,terrainHeight,radius:2400,cellSize:75,maxVisible:90,
    excluded:(x,z,clearance)=>excluded(x,z,clearance)
  });
  // Phase 2: extend deterministic placements beyond the original 900 m test area.\n  // Keep the existing instance caps to avoid a sudden mobile FPS collapse.\n  const state={maple,conifer,plantingRadiusMetres:2400,campsites:FOREST_CAMPS.length,
    pendingSpecies:FOREST_SPECIES_TARGETS.filter(s=>s.status.startsWith("pending")).map(s=>s.species),
    get planted(){return (maple.planted||0)+(conifer.planted||0);},
    get status(){return maple.status==="error"||conifer.status==="error"?"partial-error":
      maple.status==="loading"||conifer.status==="loading"?"loading":"ready";},
    dispose(){maple.dispose();conifer.dispose();}
  };
  return state;
}
