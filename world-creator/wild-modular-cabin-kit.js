/**
 * The Wild — modular cabin source kit.
 * Cabin #1: CC0 Smithsonian/Innerscene single-mesh GLB. Original geometry
 * is sampled non-destructively (including source UVs/materials) for inspection.
 * Reusable structural parts use already-committed CC0 Poly Haven 1K PBR maps.
 * Nothing in this module places buildings into the live multiplayer world.
 */
export const KIT_SOURCE = Object.freeze({
  name:"Cabin 1 — Historic timber cabin (3D scan)",
  model:"./assets/cabins/historic-log-cabin.glb",
  original:"https://www.innerscene.com/tools/library/3d-parts/point-of-pines-slave-cabin-71703bdd",
  author:"Smithsonian Institution (NMAAHC)",license:"CC0",
  important:"The scan is one joined mesh; sampled pieces have open cut edges and are prototypes, not closed solid timber."
});
const buildingPath="./assets/building/";
const libraryIds=["wood_trunk_wall","weathered_plank_siding","mossy_stone_wall","rough_pine_door","roof_slates_02","corrugated_iron"];
export function makeCabinMaterialLibrary(B,scene){
  const mats={};
  for(const id of libraryIds){
    const m=new B.PBRMaterial("The Wild modular "+id,scene);
    const tex=kind=>{
      const t=new B.Texture(buildingPath+id+"_"+kind+"_1k.jpg",scene);
      t.wrapU=B.Texture.WRAP_ADDRESSMODE;t.wrapV=B.Texture.WRAP_ADDRESSMODE;
      return t;
    };
    m.albedoTexture=tex("diffuse");
    m.bumpTexture=tex("normal");
    m.bumpTexture.level=id==="mossy_stone_wall"?.72:.6;
    m.metallicTexture=tex("arm");
    m.useRoughnessFromMetallicTextureGreen=true;
    m.useMetallnessFromMetallicTextureBlue=true;
    m.metallic=id==="corrugated_iron"?.72:0;
    m.roughness=id==="corrugated_iron"?.77:.96;
    mats[id]=m;
  }
  return mats;
}
const limit=(v,lo,hi,fallback)=>Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Math.round(Number(v)))):fallback;
export function normalizedCabinDesign(spec={}){
  return {baysWide:limit(spec.baysWide,2,5,3),
    baysDeep:limit(spec.baysDeep,2,5,3),
    roof:spec.roof==="roof_slates_02"?"roof_slates_02":"corrugated_iron",
    fireplace:spec.fireplace!==false,
    porch:spec.porch!==false,
    windows:spec.windows!==false};
}
export function buildModularCabin(B,scene,mats,config={}){
  const spec=normalizedCabinDesign(config),w=spec.baysWide*3,d=spec.baysDeep*3;
  const root=new B.TransformNode("Custom modular Appalachian log cabin",scene);
  const mesh=(m,mat)=>{m.material=mats[mat];m.parent=root;m.isPickable=false;return m;};
  function box(name,ww,hh,dd,x,y,z,mat,rz=0){
    const m=mesh(B.MeshBuilder.CreateBox("KIT "+name,{width:ww,height:hh,depth:dd},scene),mat);
    m.position.set(x,y,z);m.rotation.z=rz;return m;
  }
  function timber(name,len,x,y,z,axis,course){
    const dia=.42,shrink=1-((course%4)*.004);
    const m=mesh(B.MeshBuilder.CreateCylinder("KIT "+name,{height:len,diameterTop:dia*shrink,
       diameterBottom:dia*(1-((course+1)%3)*.005),tessellation:12},scene),"wood_trunk_wall");
    m.position.set(x,y,z);
    if(axis==="x")m.rotation.z=-Math.PI/2;else m.rotation.x=Math.PI/2;
    return m;
  }
  const floor=.53,wallH=3.5,courses=10,step=.345,roofRise=Math.min(2.5,w*.24);
  const front=-d/2,rear=d/2,top=floor+wallH;
  box("fieldstone footing",w+.45,.48,d+.45,0,.22,0,"mossy_stone_wall");
  for(let i=0;i<Math.ceil(w/.65);i++){
    const strip=w/Math.ceil(w/.65),x=-w/2+(i+.5)*strip;
    box("individual floorboard "+i,strip-.016,.16,d-.16,x,.55,0,"weathered_plank_siding");
  }
  // Courses are fully round meshes with end caps; real openings remain voids.
  function segmented(name,y,z,minX,maxX,holes,course){
    let cursor=minX;
    for(const h of [...holes].sort((a,b)=>a[0]-b[0])){
      if(h[0]>cursor+.08)timber(name+" section",h[0]-cursor,cursor+(h[0]-cursor)/2,y,z,"x",course);
      cursor=Math.max(cursor,h[1]);
    }
    if(maxX>cursor+.08)timber(name+" section",maxX-cursor,cursor+(maxX-cursor)/2,y,z,"x",course);
  }
  for(let c=0;c<courses;c++){
    const y=floor+.22+c*step;
    const windowH=spec.windows&&y>floor+1.04&&y<floor+2.59;
    const frontHoles=y<floor+2.6?[[-.94,.94]]:[];
    if(windowH&&w>=9)frontHoles.push([-w/2+1.55,-w/2+2.9],[w/2-2.9,w/2-1.55]);
    segmented("front log "+c,y,front,-w/2-.16,w/2+.16,frontHoles,c);
    timber("rear course "+c,w+.24,0,y,rear,"x",c);
    for(const side of [-1,1]){
      // Side windows are genuine gaps, not glass pasted on solid timber.
      const gaps=windowH?[[-.72,.72]]:[];
      let z=-d/2-.13;
      for(const g of gaps){
        if(g[0]>z+.10)timber("side partial "+side+" "+c,g[0]-z,side*w/2,y,z+(g[0]-z)/2,"z",c);
        z=g[1];
      }
      if(d/2+.13>z+.10)timber("side log "+side+" "+c,d/2+.13-z,side*w/2,y,z+(d/2+.13-z)/2,"z",c);
    }
  }
  // The scan can provide texture/shape references; buildable openings use
  // separate high-resolution licensed timber materials with repeatable UVs.
  for(const x of [-.96,.96])box("front door jamb",.13,2.64,.42,x,floor+1.32,front-.08,"rough_pine_door");
  box("door header",2.07,.17,.48,0,floor+2.70,front-.08,"rough_pine_door");
  // Actual door remains closed for preview; a gameplay interaction comes later.
  box("timber entry door",1.72,2.50,.12,0,floor+1.25,front+.07,"rough_pine_door");
  if(spec.windows){
    const glass=new B.StandardMaterial("KIT translucent window glass",scene);
    glass.diffuseColor=new B.Color3(.36,.52,.56);glass.alpha=.42;
    const pane=(name,x,y,z,ww,hh,dd)=>{
      const p=B.MeshBuilder.CreateBox("KIT "+name,{width:ww,height:hh,depth:dd},scene);
      p.parent=root;p.position.set(x,y,z);p.material=glass;p.isPickable=false;
    };
    for(const x of [-w/2+2.225,w/2-2.225]){
      if(w<9)break;
      pane("front glass",x,floor+1.83,front+.08,1.34,1.45,.055);
      for(const off of [-.72,.72])box("front vertical casing",.12,1.62,.18,x+off,floor+1.83,front-.18,"rough_pine_door");
      box("front sill",1.65,.12,.35,x,floor+1.01,front-.13,"rough_pine_door");
    }
    for(const x of [-w/2,w/2]){
      pane("side glass",x,floor+1.83,0,.055,1.45,1.38);
      for(const off of [-.75,.75])box("side casing",.21,1.62,.11,x,floor+1.83,off,"rough_pine_door");
      box("side sill",.30,.13,1.65,x,floor+1.02,0,"rough_pine_door");
    }
  }
  // Structural gable triangles, independently materialed to avoid hidden gaps.
  for(const z of [front-.04,rear+.04]){
    const g=new B.Mesh("KIT timber gable",scene);
    const v=new B.VertexData();
    v.positions=[-w/2,top,z, 0,top+roofRise,z, w/2,top,z];
    v.indices=[0,1,2,2,1,0];v.uvs=[0,0,.5,1,1,0];
    v.normals=[];B.VertexData.ComputeNormals(v.positions,v.indices,v.normals);
    v.applyToMesh(g);mesh(g,"weathered_plank_siding");
  }
  const span=w/2+.62,roofLen=Math.hypot(span,roofRise);
  const angle=Math.atan2(roofRise,span);
  for(const side of [-1,1]){
    box("full pitched roof "+side,roofLen+.18,.18,d+.95,
      side*span/2,top+roofRise/2,0,spec.roof,-side*angle);
    box("roof fascia "+side,roofLen+.05,.19,.19,
      side*span/2,top+roofRise/2,front-.51,"rough_pine_door",-side*angle);
  }
  box("continuous ridge cap",.36,.25,d+1.1,0,top+roofRise,0,spec.roof);
  if(spec.porch){
    box("front plank porch",Math.max(3.8,w*.55),.23,2.7,0,.54,front-1.50,"weathered_plank_siding");
    for(const x of [-Math.max(1.6,w*.24),Math.max(1.6,w*.24)]){
      box("porch support",.23,3.08,.23,x,2.05,front-2.55,"wood_trunk_wall");
    }
    box("porch step",2.3,.24,.68,0,.23,front-3.01,"mossy_stone_wall");
  }
  if(spec.fireplace){
    // Reusable stone fireplace is actual layered 3D masonry; Cabin 1's scan
    // is not falsely presented as containing an independently modeled hearth.
    const fx=-w*.28,fz=rear-.95;
    box("hearthstone slab",3.1,.20,1.7,fx,.78,fz-1.0,"mossy_stone_wall");
    box("deep firebox back",2.85,2.45,.38,fx,1.93,fz+.38,"mossy_stone_wall");
    for(const side of [-1,1]){
      for(let c=0;c<6;c++){
        const height=.40,yy=.95+c*.40;
        box("individual fireplace jamb stone "+side+" "+c,.57,height,1.16,
          fx+side*1.22,yy,fz-.26,"mossy_stone_wall");
      }
    }
    box("wide stone lintel",3.15,.43,1.22,fx,3.38,fz-.28,"mossy_stone_wall");
    box("timber mantel",3.43,.25,1.40,fx,3.73,fz-.28,"rough_pine_door");
    box("stone chimney above roof",1.12,2.7,1.12,fx,top+roofRise+1.01,rear-1,"mossy_stone_wall");
    box("chimney cap",1.39,.18,1.40,fx,top+roofRise+2.42,rear-1,"mossy_stone_wall");
    const soot=new B.StandardMaterial("KIT dark firebox",scene);
    soot.diffuseColor=new B.Color3(.045,.037,.032);
    const firebox=B.MeshBuilder.CreatePlane("KIT recessed dark fireplace opening",{width:1.68,height:1.75},scene);
    firebox.parent=root;firebox.position.set(fx,1.87,fz-.49);
    firebox.material=soot;firebox.rotation.y=Math.PI;firebox.isPickable=false;
  }
  return {root,spec,width:w,depth:d};
}
function worldBounds(meshes){
  const lo={x:Infinity,y:Infinity,z:Infinity},hi={x:-Infinity,y:-Infinity,z:-Infinity};
  let n=0;
  for(const m of meshes){
    if(!m.getTotalVertices?.())continue;
    m.computeWorldMatrix(true);
    const b=m.getBoundingInfo()?.boundingBox;if(!b)continue;n++;
    for(const k of ["x","y","z"]){lo[k]=Math.min(lo[k],b.minimumWorld[k]);hi[k]=Math.max(hi[k],b.maximumWorld[k]);}
  }
  if(!n)throw Error("Cabin 1 GLB has no renderable geometry.");
  return {lo,hi,span:{x:hi.x-lo.x,y:hi.y-lo.y,z:hi.z-lo.z},
    center:{x:(lo.x+hi.x)/2,z:(lo.z+hi.z)/2}};
}
export async function openOriginalCabin1(B,scene){
  const loaded=await B.SceneLoader.ImportMeshAsync(null,"",KIT_SOURCE.model,scene,undefined,".glb");
  const meshes=loaded.meshes.filter(m=>m.getTotalVertices?.()>0),bounds=worldBounds(meshes);
  const scale=Math.min(11/Math.max(bounds.span.x,bounds.span.z,.01),8/Math.max(bounds.span.y,.01));
  // Capture BEFORE reparenting; glTF hierarchical node transforms must survive.
  const originalRecords=meshes.map(m=>{
    const mtx=m.computeWorldMatrix(true).clone();
    return {pos:m.getVerticesData(B.VertexBuffer.PositionKind),
      uv:m.getVerticesData(B.VertexBuffer.UVKind),
      normal:m.getVerticesData(B.VertexBuffer.NormalKind),
      idx:m.getIndices(),mtx,mat:m.material};
  }).filter(r=>r.pos&&r.idx);
  const root=new B.TransformNode("Original Cabin 1 — preserved scanned mesh",scene);
  const entries=[...new Set([...(loaded.meshes||[]),...(loaded.transformNodes||[])])];
  const set=new Set(entries);
  for(const item of entries)if(!item.parent||!set.has(item.parent))item.parent=root;
  root.scaling.setAll(scale);
  root.position.set(-18-bounds.center.x*scale,-bounds.lo.y*scale,-bounds.center.z*scale);
  function extractPanel(face="front"){
    // Triangle-centroid crop is intentionally reversible and source-preserving:
    // UVs and the original material stay unchanged. Cut boundaries are open.
    const p=[],uv=[],normal=[],ind=[];
    let triangles=0,selectedMaterial=null;
    for(const r of originalRecords){
      const xyz=r.pos,idx=r.idx;
      const read=j=>{
        const local=new B.Vector3(xyz[j*3],xyz[j*3+1],xyz[j*3+2]);
        return B.Vector3.TransformCoordinates(local,r.mtx);
      };
      const norm=j=>r.normal?
        B.Vector3.TransformNormal(new B.Vector3(r.normal[j*3],r.normal[j*3+1],r.normal[j*3+2]),r.mtx).normalize():null;
      for(let at=0;at<idx.length;at+=3){
        const ids=[idx[at],idx[at+1],idx[at+2]],v=ids.map(read);
        const cx=(v[0].x+v[1].x+v[2].x)/3;
        const cy=(v[0].y+v[1].y+v[2].y)/3;
        const cz=(v[0].z+v[1].z+v[2].z)/3;
        const ny=(cy-bounds.lo.y)/Math.max(bounds.span.y,.01);
        const nx=(cx-bounds.center.x)/Math.max(bounds.span.x,.01);
        const nz=(cz-bounds.center.z)/Math.max(bounds.span.z,.01);
        let include=false;
        if(face==="roof")include=ny>.76&&Math.abs(nx)<.49&&Math.abs(nz)<.49;
        if(face==="front")include=ny>.17&&ny<.76&&Math.abs(nx)<.28&&nz<-.20;
        if(face==="rear")include=ny>.17&&ny<.76&&Math.abs(nx)<.28&&nz>.20;
        if(face==="side")include=ny>.17&&ny<.76&&Math.abs(nz)<.28&&nx>.20;
        if(!include)continue;
        const base=p.length/3;
        for(let k=0;k<3;k++){
          const vv=v[k],ii=ids[k];
          p.push((vv.x-bounds.center.x)*scale,(vv.y-bounds.lo.y)*scale,(vv.z-bounds.center.z)*scale);
          uv.push(r.uv?r.uv[ii*2]:0,r.uv?r.uv[ii*2+1]:0);
          const nn=norm(ii);normal.push(nn?nn.x:0,nn?nn.y:1,nn?nn.z:0);
        }
        ind.push(base,base+1,base+2);selectedMaterial=r.mat;triangles++;
      }
    }
    if(!triangles)throw Error("No scanned triangles in the "+face+" selection; try another face.");
    const mesh=new B.Mesh("Copied real Cabin 1 "+face+" triangle section",scene);
    const data=new B.VertexData();data.positions=p;data.indices=ind;data.uvs=uv;
    data.normals=normal;data.applyToMesh(mesh);
    mesh.material=selectedMaterial;
    mesh.isPickable=false;
    return {mesh,triangles,openEdges:true};
  }
  return {root,meshes,bounds,scale,extractPanel};
}
