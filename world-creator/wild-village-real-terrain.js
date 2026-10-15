/**
 * The Wild — photographic ground for every streamed walking tile.
 *
 * Uses the real locally committed CC0 Poly Haven JPEG diffuse/normal maps,
 * not a procedural image or a wall of simulated vegetation. A single shared
 * Babylon material is cached per scene to avoid re-downloading 1K/2K maps
 * each time the player crosses the seamless 84 m streaming threshold.
 *
 * Crucially, the photographic surface is assigned directly to the same
 * walkable GroundMesh (and the distant ground), so it cannot float above
 * the player, change footstep heights, or disappear outside the village.
 */
export const VILLAGE_TERRAIN_SURFACES=Object.freeze([
  "forest_leaves_02",
  "forest_ground_05",
  "forest_ground_04"
]);
const MANIFEST="./assets/village-terrain-sources.json";
const PRIMARY_SURFACE="forest_leaves_02";
const SCENE_MATERIALS=new WeakMap();

function sharedPhotographicMaterial(B,scene,{mobile,lite}){
  const cached=SCENE_MATERIALS.get(scene);
  if(cached)return cached;
  const resolution=mobile||lite?"1k":"2k";
  const state={
    status:"loading-assets",error:"",triangles:0,materials:0,
    sourceIds:[],resolution,coverage:"all-streamed-ground",
    visualOnly:true,collisionSurfaceUnchanged:true
  };
  const entry={state,material:null,promise:null};
  SCENE_MATERIALS.set(scene,entry);
  entry.promise=(async()=>{
    let diffuse=null,normal=null,mat=null;
    try{
      const response=await fetch(MANIFEST,{cache:"no-store"});
      if(!response.ok)throw Error("Photographic terrain manifest unavailable: HTTP "+response.status);
      const catalog=await response.json();
      if(!Array.isArray(catalog)||catalog.length!==VILLAGE_TERRAIN_SURFACES.length)
        throw Error("Incomplete photographic terrain manifest");
      const entries=new Map(catalog.map(item=>[item.id,item]));
      for(const id of VILLAGE_TERRAIN_SURFACES){
        const asset=entries.get(id);
        for(const quality of ["1k","2k"]){
          const prefix="./assets/village-terrain-"+id+"-"+quality+"-";
          if(asset?.license!=="CC0"||asset?.source!=="https://polyhaven.com/a/"+id||
             asset?.files?.[quality]?.diffuse!==prefix+"diffuse.jpg"||
             asset?.files?.[quality]?.normal!==prefix+"normal.jpg")
            throw Error("Unverified terrain asset "+id+" "+quality);
        }
      }
      const file=entries.get(PRIMARY_SURFACE).files[resolution];
      const image=(url)=>new Promise((resolve,reject)=>{
        const texture=new B.Texture(url,scene,false,false,
          B.Texture.TRILINEAR_SAMPLINGMODE,
          ()=>resolve(texture),
          (message,error)=>reject(error||Error(message||"Photographic texture failed: "+url)));
        texture.wrapU=B.Texture.WRAP_ADDRESSMODE;
        texture.wrapV=B.Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel=mobile?4:8;
      });
      diffuse=await image(file.diffuse);
      // Bump mapping can be left out on low-memory phones. Diffuse still
      // always comes from the real downloaded photographic JPEG.
      if(!lite)normal=await image(file.normal);
      if(scene.isDisposed===true)return;
      mat=new B.StandardMaterial("CC0 photographic Appalachian forest-floor",scene);
      mat.diffuseTexture=diffuse;
      mat.diffuseColor=new B.Color3(1,1,1);
      mat.ambientColor=new B.Color3(.15,.15,.15);
      mat.specularColor=new B.Color3(.015,.017,.013);
      mat.useVertexColors=false;
      if(normal){
        normal.level=.34;
        mat.bumpTexture=normal;
      }
      entry.material=mat;
      state.sourceIds=[PRIMARY_SURFACE];
      state.materials=1;
      state.status="ready";
    }catch(err){
      if(mat)mat.dispose();
      if(normal)normal.dispose();
      if(diffuse)diffuse.dispose();
      state.error=String(err?.message||err);
      state.status="awaiting-real-assets";
      console.warn("Installed photographic ground could not be loaded:",state.error);
    }
  })();
  return entry;
}

export function installVillageRealTerrain(B,scene,_track,{
  mobile=false,lite=false,ground,farGround
}){
  if(!ground?.getIndices?.())return {
    status:"no-ground",error:"Ground mesh missing",triangles:0,
    materials:0,sourceIds:[],coverage:"all-streamed-ground"
  };
  const entry=sharedPhotographicMaterial(B,scene,{mobile,lite});
  entry.state.triangles=ground.getIndices().length/3;
  const apply=()=>{
    if(!entry.material)return;
    for(const mesh of [ground,farGround]){
      if(!mesh||mesh.isDisposed?.())continue;
      // Height sampler, UVs and collision geometry remain unchanged.
      mesh.material=entry.material;
      mesh.useVertexColors=false;
      mesh.isPickable=false;
      mesh.checkCollisions=false;
    }
  };
  apply();
  entry.promise.then(apply);
  return entry.state;
}
