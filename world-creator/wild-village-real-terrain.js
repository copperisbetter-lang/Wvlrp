/**
 * The Wild — actual Poly Haven CC0 photographic terrain surface, village only.
 *
 * Adds diffuse + normal maps to a noncolliding overlay made from the SAME
 * triangle vertices as the walkable GroundMesh. No invented height map, no
 * ground plane floating over mountains, no changed footsteps or building grade.
 *
 * Fails closed if the locally installed assets are not present. Never use
 * fake/empty images, generic placeholder ground, or external hotlinks.
 */
import {VILLAGE_SECTION} from "./wild-acre-regions.js";
import {VILLAGE_CLEARING,COMMUNITY_SITES,pathDistance,siteDistance} from "./wild-reference-layout.js";

export const VILLAGE_TERRAIN_SURFACES=Object.freeze([
  "forest_leaves_02", // natural moss + leaf duff; primary woodland
  "forest_ground_05", // compact soil, main footpaths and central clearing
  "forest_ground_04"  // occasional rocky woodland soil
]);
const MANIFEST="./assets/village-terrain-sources.json";
const SQ=VILLAGE_SECTION;
function clamp(t){return Math.max(0,Math.min(1,t));}
function smooth(t){t=clamp(t);return t*t*(3-2*t);}
function scramble(x,z,seed){let n=Math.sin(x*127.17+z*312.11+seed*0.0031)*43758.5453;return n-Math.floor(n);}

export function villageTerrainKind(x,z,seed=1){
  const nearBuilding=COMMUNITY_SITES.some(s=>siteDistance(x,z,s)<6);
  const fromFire=Math.hypot(x-VILLAGE_CLEARING.fireX,z-VILLAGE_CLEARING.fireZ);
  const fromCenter=Math.hypot(x-VILLAGE_CLEARING.centerX,z-VILLAGE_CLEARING.centerZ);
  const path=pathDistance(x,z);
  if(nearBuilding||path<3.0||fromFire<9||fromCenter<18)
    return "forest_ground_05";
  const n=scramble(Math.floor(x/6.5),Math.floor(z/6.5),seed);
  if(n<.10)return "forest_ground_04";
  if(n<.27)return "forest_ground_05";
  return "forest_leaves_02";
}

// Used in QA as well as at runtime: the overlay tapers out through 7 m so
// the photographic materials don't form a hard square at the acreage edge.
export function villageTerrainFade(x,z){
  const margin=Math.min(x-SQ.minX,SQ.maxX-x,z-SQ.minZ,SQ.maxZ-z);
  return smooth(margin/7);
}

export function installVillageRealTerrain(B,scene,track,{cx,cy,seed,mobile=false,lite=false,ground}){
  const state={status:"waiting",error:"",triangles:0,materials:0,
    sourceIds:[],visualOnly:true,collisionSurfaceUnchanged:true};
  const bounds=ground?.getVerticesData?.(B.VertexBuffer.PositionKind);
  const indices=ground?.getIndices?.();
  if(!bounds||!indices){state.status="no-ground";return state;}
  // Terrain chunks centered far from village must not download PBR maps.
  if(cx+98<SQ.minX||cx-98>SQ.maxX||cy+98<SQ.minZ||cy-98>SQ.maxZ){
    state.status="outside-village";return state;
  }
  const groups=new Map(VILLAGE_TERRAIN_SURFACES.map(id=>[id,{verts:[],normals:[],uvs:[],colors:[],indices:[]}]));
  const groundNormals=ground.getVerticesData(B.VertexBuffer.NormalKind);
  for(let i=0;i<indices.length;i+=3){
    const ids=[indices[i],indices[i+1],indices[i+2]];
    const wx=ids.reduce((sum,id)=>sum+cx+bounds[id*3],0)/3;
    const wz=ids.reduce((sum,id)=>sum+cy+bounds[id*3+2],0)/3;
    if(villageTerrainFade(wx,wz)<=0)continue;
    const group=groups.get(villageTerrainKind(wx,wz,seed));
    const base=group.verts.length/3;
    for(const id of ids){
      const j=id*3;
      const x=cx+bounds[j],z=cy+bounds[j+2];
      group.verts.push(bounds[j],bounds[j+1]+.012,bounds[j+2]);
      group.normals.push(groundNormals[j],groundNormals[j+1],groundNormals[j+2]);
      // World-space tiling: 3 m, never stretched across a 196 m tile.
      group.uvs.push(x/3,z/3);
      group.colors.push(1,1,1,villageTerrainFade(x,z));
    }
    group.indices.push(base,base+1,base+2);
  }

  state.status="loading-assets";
  (async()=>{
    let created=[];
    try{
      const response=await fetch(MANIFEST,{cache:"no-store"});
      if(!response.ok)throw Error("Real terrain textures not yet installed: HTTP "+response.status);
      const catalog=await response.json();
      if(!Array.isArray(catalog)||catalog.length!==VILLAGE_TERRAIN_SURFACES.length)
        throw Error("Incomplete terrain-source manifest");
      const resolution=mobile||lite?"1k":"2k";
      const approved=new Map(catalog.map(item=>[item.id,item]));
      for(const id of VILLAGE_TERRAIN_SURFACES){
        const asset=approved.get(id);
        const file=asset?.files?.[resolution];
        const prefix="./assets/village-terrain-"+id+"-"+resolution+"-";
        if(asset?.license!=="CC0"||asset?.source!=="https://polyhaven.com/a/"+id||
            file?.diffuse!==prefix+"diffuse.jpg"||file?.normal!==prefix+"normal.jpg")
          throw Error("Unverified source texture "+id);
        const diffuse=await new Promise((resolve,reject)=>{
          const tex=track(new B.Texture(file.diffuse,scene,false,false,
            B.Texture.TRILINEAR_SAMPLINGMODE,()=>resolve(tex),
            (_message,error)=>reject(error||Error("Texture failed: "+id))));
        });
        created.push(diffuse);
        const mat=track(new B.StandardMaterial("CC0 scanned village "+id,scene));
        mat.diffuseTexture=diffuse;
        mat.specularColor=new B.Color3(.018,.021,.015);
        mat.roughness=.96;
        mat.useVertexColors=true;
        mat.backFaceCulling=false;
        mat.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
        mat.forceDepthWrite=false;
        // Normal map is optional only for low-memory lite mode; diffuse
        // still must be real and cannot be replaced with an invented color.
        if(!lite){
          const normal=track(new B.Texture(file.normal,scene,false,false,
              B.Texture.TRILINEAR_SAMPLINGMODE));
          normal.level=.42;
          mat.bumpTexture=normal;
          created.push(normal);
        }
        const part=groups.get(id);
        if(part.indices.length){
          const mesh=track(new B.Mesh("Noncolliding scanned village ground "+id,scene));
          mesh.setVerticesData(B.VertexBuffer.PositionKind,new Float32Array(part.verts));
          mesh.setVerticesData(B.VertexBuffer.NormalKind,new Float32Array(part.normals));
          mesh.setVerticesData(B.VertexBuffer.UVKind,new Float32Array(part.uvs));
          mesh.setVerticesData(B.VertexBuffer.ColorKind,new Float32Array(part.colors));
          mesh.setIndices(part.indices);
          mesh.useVertexColors=true;mesh.hasVertexAlpha=true;
          mesh.isPickable=false;mesh.checkCollisions=false;mesh.material=mat;
          mesh.renderingGroupId=1;
          state.triangles+=part.indices.length/3;
        }
        state.materials++;
        state.sourceIds.push(id);
      }
      if(state.triangles<12)throw Error("No native triangle coverage inside village");
      state.status="ready";
    }catch(err){
      state.error=String(err?.message||err);
      state.status="awaiting-real-assets";
      // The default walkable terrain remains available with its old atlas.
    }
  })();
  return state;
}
