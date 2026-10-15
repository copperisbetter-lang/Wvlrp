/**
 * The Wild clean-slate greenfield: terrain, connected footpaths, reserved
 * cabin pads and camp clearings only. No old trees, villages or structure
 * geometry is instantiated here. The Hearthside building/GLB NPCs are owned
 * by walk.js and remain untouched.
 *
 * Keeps exact sampler/ground geometry parity for first-person eye height.
 */
import {cabinGrade} from "./wild-nature.js";
import {makeGroundHeightSampler} from "./terrain-height.js";
import {createForestSurfaceTextures} from "./wild-investor-graphics.js";
import {hash} from "./world-core.js";
import {REBUILD_CLEARINGS,REBUILD_PATHS,flatlandHeight,REBUILD_LAYOUT_VERSION} from "./wild-rebuild-layout.js";
import {installVillageRealTerrain} from "./wild-village-real-terrain.js";

function tileIntersectsRoute(route,cx,cz,margin){
  return route.points.some(p=>Math.abs(p[0]-cx)<margin&&Math.abs(p[1]-cz)<margin);
}
function makeFootpaths(B,scene,track,{cx,cy,seed,base,material}){
  const meshes=[],margin=106;
  for(const route of REBUILD_PATHS){
    if(!tileIntersectsRoute(route,cx,cy,margin))continue;
    const verts=[],uvs=[],indices=[];
    let run=0;
    for(let k=0;k<route.points.length;k++){
      const [x,z]=route.points[k];
      const [prevX,prevZ]=route.points[Math.max(0,k-1)];
      const [nextX,nextZ]=route.points[Math.min(route.points.length-1,k+1)];
      const tx=nextX-prevX,tz=nextZ-prevZ,len=Math.hypot(tx,tz)||1;
      const nx=-tz/len,nz=tx/len;
      if(k)run+=Math.hypot(x-prevX,z-prevZ);
      for(const side of [-1,1]){
        const px=x+nx*side*1.75,pz=z+nz*side*1.75;
        verts.push(px-cx,flatlandHeight(px,pz,seed,base)+.046,pz-cy);
        uvs.push(side===-1?0:1,run/3.2);
      }
      if(k){const n=k*2;indices.push(n-2,n-1,n,n-1,n+1,n);}
    }
    if(indices.length===0)continue;
    const mesh=track(new B.Mesh("WALKABLE trail "+route.id,scene));
    const norm=[];B.VertexData.ComputeNormals(verts,indices,norm);
    const data=new B.VertexData();data.positions=verts;data.indices=indices;data.uvs=uvs;data.normals=norm;data.applyToMesh(mesh);
    mesh.material=material;mesh.isPickable=false;mesh.checkCollisions=false;
    mesh.receiveShadows=false;
    meshes.push(mesh);
  }
  return meshes.length;
}
function reservedPad(B,scene,track,p,{cx,cy,seed,base,material}){
  if(Math.abs(p.x-cx)>p.radius+100||Math.abs(p.z-cy)>p.radius+100)return null;
  const sides=56,verts=[],uvs=[],idx=[],norm=[];
  // Three radial rings follow actual topology: no floating discs over a hill.
  const radii=[0,p.radius*.65,p.radius*.92];
  for(const r of radii){
    for(let i=0;i<sides;i++){
      const a=i*2*Math.PI/sides;
      const x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
      verts.push(x-cx,flatlandHeight(x,z,seed,base)+.055,z-cy);
      uvs.push(x/4,z/4);
    }
  }
  for(let ring=0;ring<radii.length-1;ring++)for(let i=0;i<sides;i++){
    const n=(i+1)%sides,a=ring*sides+i,b=ring*sides+n,c=(ring+1)*sides+i,d=(ring+1)*sides+n;
    if(ring===0)idx.push(b,d,c); // One center triangle: no degenerate duplicates.
    else idx.push(a,b,c,b,d,c);
  }
  B.VertexData.ComputeNormals(verts,idx,norm);
  const m=track(new B.Mesh("RESERVED CLEARING "+p.name,scene)),data=new B.VertexData();
  data.positions=verts;data.indices=idx;data.normals=norm;data.uvs=uvs;data.applyToMesh(m);
  m.material=material;m.checkCollisions=false;m.isPickable=false;
  return m;
}
export function renderRebuiltLandscape(B,scene,track,{cx,cy,seed,mobile=false,lite=false}){
  const base=cabinGrade(0,0,seed);
  const atlas=createForestSurfaceTextures(B,scene,track,seed);
  const soil=track(new B.StandardMaterial("New playable summer ground",scene));
  soil.diffuseTexture=atlas.duff;soil.diffuseColor=new B.Color3(.90,.98,.86);
  soil.specularColor=new B.Color3(.013,.019,.012);soil.useVertexColors=true;
  const distant=track(new B.StandardMaterial("distant Appalachian meadow ridges",scene));
  distant.diffuseColor=new B.Color3(.49,.66,.43);
  distant.specularColor=new B.Color3(.012,.012,.012);distant.useVertexColors=true;

  function surface(size,subdivisions,offset,mat){
    const ground=track(B.MeshBuilder.CreateGround("FRESH walkable Appalachian lowland "+size,
      {width:size,height:size,subdivisions,updatable:true},scene));
    const positions=ground.getVerticesData(B.VertexBuffer.PositionKind);
    const uvs=ground.getVerticesData(B.VertexBuffer.UVKind);
    const colors=[];
    for(let k=0;k<positions.length;k+=3){
      const x=cx+positions[k],z=cy+positions[k+2];
      const y=flatlandHeight(x,z,seed,base)-offset;
      positions[k+1]=y;
      // Healthy, subtle summer colors instead of the old brown foliage.
      const n=hash(Math.floor(x/13),Math.floor(z/13),seed);
      const tint=.88+.16*n;
      colors.push(.84*tint,.97*tint,.82*tint,1);
      const t=k/3*2;
      uvs[t]=x/6;uvs[t+1]=z/6;
    }
    const normals=[];B.VertexData.ComputeNormals(positions,ground.getIndices(),normals);
    ground.updateVerticesData(B.VertexBuffer.PositionKind,positions,true);
    ground.updateVerticesData(B.VertexBuffer.NormalKind,normals);
    ground.setVerticesData(B.VertexBuffer.UVKind,uvs);
    ground.setVerticesData(B.VertexBuffer.ColorKind,new Float32Array(colors));
    ground.useVertexColors=true;ground.material=mat;
    ground.isPickable=false;ground.checkCollisions=false;
    ground.updateCoordinateHeights?.();
    return ground;
  }
  // Far horizon is lower-detail; local collidable ground stays fine mesh.
  surface(1400,lite?76:mobile?98:128,.30,distant);
  const subdivisions=lite?64:mobile?96:132;
  const ground=surface(196,subdivisions,0,soil);
  const surfaceHeight=makeGroundHeightSampler(
    ground.getVerticesData(B.VertexBuffer.PositionKind),
    ground.getIndices(),196,subdivisions,cx,cy);

  // Reserved pads and paths are textures/visual geometry, not new buildings.
  const pathMat=track(new B.StandardMaterial("Light worn dirt footpath",scene));
  pathMat.diffuseTexture=atlas.duff;
  pathMat.diffuseColor=new B.Color3(.89,.78,.60);
  pathMat.specularColor=new B.Color3(.013,.013,.011);
  const padMat=track(new B.StandardMaterial("Level cleared build-pad earth",scene));
  padMat.diffuseTexture=atlas.duff;
  padMat.diffuseColor=new B.Color3(.84,.87,.68);
  padMat.specularColor=new B.Color3(.009,.012,.009);
  const paths=makeFootpaths(B,scene,track,{cx,cy,seed,base,material:pathMat});
  let pads=0;
  for(const p of REBUILD_CLEARINGS){
    // Hearthside ground remains but its building and residents never removed.
    if(p.id==="hearthside")continue;
    if(reservedPad(B,scene,track,p,{cx,cy,seed,base,material:padMat}))pads++;
  }
  // The licensed scanned ground pass is optional; its loader does not alter
  // walkable geometry or invent a result if actual source JPEGs are absent.
  const villageRealTerrain=installVillageRealTerrain(B,scene,track,
    {cx,cy,seed,mobile,lite,ground});
  return {
    surfaceHeight,collidableTrees:[],nearTrees:0,distantTrees:0,
    addedTrees:0,addedEvergreens:0,elderTrees:0,species:0,
    understory:0,heroPlants:0,communityBuildings:0,communityFirePits:0,
    communityPaths:paths,clearingsRendered:pads,
    villageGroundDetails:0,villageEdgeTrees:0,villageDetailDiameterMetres:0,
    heroGraphics:false,forestExtentMetres:700,
    layoutVersion:REBUILD_LAYOUT_VERSION,
    villageRealTerrain
  };
}
