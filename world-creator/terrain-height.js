/**
 * Height of the ACTUAL rendered triangulated GroundMesh, without relying on
 * Babylon's GroundMesh.getHeightAtCoordinates() internal height cache.
 * GroundMesh height caches can remain flat after setVerticesData on a ground
 * that was initially constructed at Y=0: the camera then sinks into hills.
 * This uses only immutable vertex positions/indices and supports tile offsets.
 */
export function makeGroundHeightSampler(positions,indices,size,subdivisions,cx=0,cz=0){
  if(!(subdivisions>1)||!positions?.length||!indices?.length)
    throw Error("Invalid rendered terrain geometry");
  const n=subdivisions, side=n+1,half=size/2,cell=size/n;
  const h=new Float32Array(side*side),filled=new Uint8Array(side*side);
  for(let k=0;k<positions.length;k+=3){
    const ix=Math.round((positions[k]+half)/cell);
    const iz=Math.round((positions[k+2]+half)/cell);
    if(ix>=0&&iz>=0&&ix<=n&&iz<=n){
      const slot=iz*side+ix;
      h[slot]=positions[k+1];
      filled[slot]=1;
    }
  }
  for(let i=0;i<filled.length;i++)
    if(!filled[i])throw Error("Rendered ground missing grid height "+i);
  // Detect triangle diagonal from the first two faces instead of assuming
  // a particular Babylon MeshBuilder triangle order or mesh winding.
  const first=[indices[0],indices[1],indices[2]];
  const second=[indices[3],indices[4],indices[5]];
  const shared=first.filter(id=>second.includes(id));
  let positiveDiagonal=null;
  if(shared.length===2){
    const ax=positions[shared[0]*3],az=positions[shared[0]*3+2];
    const bx=positions[shared[1]*3],bz=positions[shared[1]*3+2];
    const prod=(ax-bx)*(az-bz);
    if(Math.abs(prod)>1e-7)positiveDiagonal=prod>0;
  }
  const sample=(worldX,worldZ)=>{
    const x=worldX-cx,z=worldZ-cz;
    if(!Number.isFinite(x)||!Number.isFinite(z)||
      x < -half || x > half || z < -half || z > half)return null;
    const fx=(x+half)/cell,fz=(z+half)/cell;
    const ix=Math.min(n-1,Math.max(0,Math.floor(fx)));
    const iz=Math.min(n-1,Math.max(0,Math.floor(fz)));
    const u=Math.max(0,Math.min(1,fx-ix)),v=Math.max(0,Math.min(1,fz-iz));
    const bl=h[iz*side+ix],br=h[iz*side+ix+1];
    const tl=h[(iz+1)*side+ix],tr=h[(iz+1)*side+ix+1];
    if(positiveDiagonal===true)
      return v<=u ? bl*(1-u)+br*(u-v)+tr*v :
        bl*(1-v)+tl*(v-u)+tr*u;
    if(positiveDiagonal===false)
      return u+v<=1 ? bl*(1-u-v)+br*u+tl*v :
        tr*(u+v-1)+br*(1-v)+tl*(1-u);
    // Conservative fallback if a future Babylon version changes triangle order.
    return bl*(1-u)*(1-v)+br*u*(1-v)+tl*(1-u)*v+tr*u*v;
  };
  sample.diagonal=positiveDiagonal;
  sample.spacing=cell;
  return sample;
}
