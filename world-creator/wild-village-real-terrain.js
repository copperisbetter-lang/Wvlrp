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

/**
 * A 32-metre seamless photographic macro tile. The old 4-metre repeat
 * produced long, unmistakable rows in open areas. All three downloaded
 * CC0 photographs are blended with soft, wraparound patches; no synthetic
 * ground photograph is substituted. Drawing once into a shared atlas keeps
 * the normal walking/render loop cheap even on mobile.
 */
export const PHOTO_TILE_METRES=32;
function photoImage(url){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(Error("Cannot load terrain photograph "+url));
    img.src=url;
  });
}
function tileSeed(x,y,salt=0){
  let n=Math.imul(x+41,374761393)^Math.imul(y+97,668265263)^Math.imul(salt+7,2246822519);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
}
function blendedPhotoAtlas(B,scene,photos,{mobile,lite}){
  const size=lite?1024:2048;
  const macro=document.createElement("canvas");
  macro.width=macro.height=size;
  const ctx=macro.getContext("2d",{alpha:false});
  if(!ctx)throw Error("Canvas unavailable for photographic ground");
  // Eight actual-photo repeats under the varied broad-scale patches.
  const repeat=Math.round(size*4/PHOTO_TILE_METRES);
  const imageTiles=photos.map(photo=>{
    const tile=document.createElement("canvas");
    tile.width=tile.height=repeat;
    tile.getContext("2d").drawImage(photo,0,0,repeat,repeat);
    return tile;
  });
  const base=ctx.createPattern(imageTiles[0],"repeat");
  ctx.fillStyle=base;
  ctx.fillRect(0,0,size,size);

  const cells=4,spacing=size/cells,radius=Math.ceil(spacing*.78);
  const extent=radius*2;
  for(let cy=0;cy<cells;cy++)for(let cx=0;cx<cells;cx++){
    const selection=tileSeed(cx,cy,1);
    // Primary leafy ground remains dominant; the other genuine forest
    // photographs break up the repeated horizontal/diagonal stripes.
    const source=selection<.48?0:selection<.77?1:2;
    const patch=document.createElement("canvas");
    patch.width=patch.height=extent;
    const p=patch.getContext("2d");
    p.save();
    p.translate(radius,radius);
    p.rotate(Math.floor(tileSeed(cx,cy,2)*4)*Math.PI/2);
    p.scale(tileSeed(cx,cy,3)<.5?-1:1,1);
    p.fillStyle=p.createPattern(imageTiles[source],"repeat");
    p.fillRect(-extent,-extent,extent*2,extent*2);
    p.restore();
    p.globalCompositeOperation="destination-in";
    const fade=p.createRadialGradient(radius,radius,radius*.28,radius,radius,radius);
    fade.addColorStop(0,"rgba(0,0,0,1)");
    fade.addColorStop(.68,"rgba(0,0,0,.88)");
    fade.addColorStop(1,"rgba(0,0,0,0)");
    p.fillStyle=fade;
    p.fillRect(0,0,extent,extent);
    p.globalCompositeOperation="source-over";
    const x=(cx+.5+(tileSeed(cx,cy,4)-.5)*.36)*spacing-radius;
    const y=(cy+.5+(tileSeed(cx,cy,5)-.5)*.36)*spacing-radius;
    // Wrap any patch extending over an atlas edge, making both opposite
    // edges pixel-identical and avoiding seams when a player streams tiles.
    for(const dx of [-size,0,size])for(const dy of [-size,0,size])
      if(x+dx< size&&x+dx+extent>0&&y+dy<size&&y+dy+extent>0)
        ctx.drawImage(patch,x+dx,y+dy);
  }
  const atlas=new B.DynamicTexture(
    "seamless mixed CC0 photographic forest floor",macro,scene,true);
  atlas.wrapU=atlas.wrapV=B.Texture.WRAP_ADDRESSMODE;
  atlas.anisotropicFilteringLevel=mobile?4:8;
  atlas.update(false);
  // Retain photographed leaf, pebble and moss edges at walking distance.
  // The 32 m atlas provides large natural patches; this neutral high-pass
  // texture supplies finer true-photograph detail at 2 m without visible
  // color-pattern repetition.
  const detailCanvas=document.createElement("canvas");
  const detailSize=lite?512:1024;
  detailCanvas.width=detailCanvas.height=detailSize;
  const detailCtx=detailCanvas.getContext("2d",{willReadFrequently:true});
  if(!detailCtx)throw Error("Terrain detail canvas unavailable");
  detailCtx.drawImage(photos[0],0,0,detailSize,detailSize);
  const original=detailCtx.getImageData(0,0,detailSize,detailSize);
  const blurred=document.createElement("canvas");
  blurred.width=blurred.height=detailSize;
  const blurCtx=blurred.getContext("2d",{willReadFrequently:true});
  blurCtx.filter="blur(12px)";
  blurCtx.drawImage(detailCanvas,0,0);
  const smooth=blurCtx.getImageData(0,0,detailSize,detailSize).data;
  const pixels=original.data;
  for(let i=0;i<pixels.length;i+=4){
    const fine=((pixels[i]-smooth[i])*.25+
      (pixels[i+1]-smooth[i+1])*.60+
      (pixels[i+2]-smooth[i+2])*.15)*1.65;
    const neutral=Math.max(70,Math.min(186,128+fine));
    pixels[i]=pixels[i+1]=pixels[i+2]=neutral;
    pixels[i+3]=255;
  }
  detailCtx.putImageData(original,0,0);
  const detail=new B.DynamicTexture(
    "sharp close-range CC0 leaf and soil microdetail",detailCanvas,scene,true);
  detail.wrapU=detail.wrapV=B.Texture.WRAP_ADDRESSMODE;
  detail.uScale=detail.vScale=PHOTO_TILE_METRES/2;
  detail.anisotropicFilteringLevel=mobile?8:16;
  detail.update(false);
  atlas.anisotropicFilteringLevel=mobile?8:16;
  return {atlas,detail};
}

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
  const entry={state,material:null,farMaterial:null,promise:null};
  SCENE_MATERIALS.set(scene,entry);
  entry.promise=(async()=>{
    let diffuse=null,detail=null,normal=null,mat=null,farMat=null;
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
      // Composite from all three verified local photographs, once per scene.
      // Gracefully retain the original photo if a browser forbids the canvas.
      try{
        const photos=await Promise.all(VILLAGE_TERRAIN_SURFACES.map(id=>
          photoImage(entries.get(id).files[resolution].diffuse)));
        const layers=blendedPhotoAtlas(B,scene,photos,{mobile,lite});
        diffuse=layers.atlas;
        detail=layers.detail;
        state.nearDetailMetres=2;
        state.blendMode="seamless-photographic-atlas";
        state.sourceIds=VILLAGE_TERRAIN_SURFACES.slice();
      }catch(blendError){
        console.warn("Seamless ground blending unavailable; using source JPEG",blendError);
        diffuse=await image(file.diffuse);
        diffuse.uScale=diffuse.vScale=PHOTO_TILE_METRES/4;
        state.blendMode="original-photographic-fallback";
        state.sourceIds=[PRIMARY_SURFACE];
        state.nearDetailMetres=0;
      }
      // The subtle normal map stays at its real ~4 m detail scale while the
      // photographic diffuse has a much larger, blended 32 m repeat.
      if(!lite){
        normal=await image(file.normal);
        normal.uScale=normal.vScale=PHOTO_TILE_METRES/4;
      }
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
      if(detail){
        mat.detailMap.texture=detail;
        mat.detailMap.diffuseBlendLevel=.88;
        mat.detailMap.bumpLevel=0;
        mat.detailMap.roughnessBlendLevel=0;
        mat.detailMap.isEnabled=true;
      }
      // Distant mesh uses the same photographic macro material but NEVER
      // the close-up detail/normal: they alias into horizontal bands near
      // the horizon on low-resolution phone screens.
      farMat=new B.StandardMaterial("CC0 distant terrain without repeating detail",scene);
      farMat.diffuseTexture=diffuse;
      farMat.diffuseColor=new B.Color3(.95,.96,.95);
      farMat.ambientColor=new B.Color3(.15,.15,.15);
      farMat.specularColor=new B.Color3(.005,.005,.005);
      farMat.useVertexColors=false;
      entry.material=mat;
      entry.farMaterial=farMat;
      state.materials=2;
      state.farDetailDisabled=true;
      state.status="ready";
    }catch(err){
      if(mat)mat.dispose();
      if(farMat)farMat.dispose();
      if(normal)normal.dispose();
      if(detail)detail.dispose();
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
    for(const [mesh,material] of [[ground,entry.material],[farGround,entry.farMaterial]]){
      if(!mesh||mesh.isDisposed?.())continue;
      // Height sampler, UVs and collision geometry remain unchanged.
      mesh.material=material;
      mesh.useVertexColors=false;
      mesh.isPickable=false;
      mesh.checkCollisions=false;
    }
  };
  apply();
  entry.promise.then(apply);
  return entry.state;
}
