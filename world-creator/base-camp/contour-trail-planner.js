// Offline map-stage route solver for Base Camp. Does NOT place floors or edit terrain.
// A* on sampled terrain: avoid lake, steep longitudinal grades and sideways tilt.
// If no walkable route exists, return a documented grading-required result, never
// silently draw a misleading 'approved' line through a hillside.
import {auditTrail} from './trail-terrain-audit.js';
export function planContourTrail(start,goal,{terrainY,lakeRadius,obstacleAt=()=>false,
  grid=3,margin=90,maxGrade=.08,maxCrossSlope=.03,halfWidth=.9,
  lakeMargin=1.035,maxNodes=80000}={}){
 if(!terrainY)throw Error('terrainY required');
 const minX=Math.min(start.x,goal.x)-margin,minZ=Math.min(start.z,goal.z)-margin;
 const nx=Math.ceil((Math.abs(start.x-goal.x)+2*margin)/grid)+1;
 const nz=Math.ceil((Math.abs(start.z-goal.z)+2*margin)/grid)+1;
 if(nx*nz>maxNodes)return {status:'needs-partitioning',nodes:nx*nz};
 const idx=(i,j)=>j*nx+i,point=(i,j)=>({x:minX+i*grid,z:minZ+j*grid});
 const cell=p=>[Math.max(0,Math.min(nx-1,Math.round((p.x-minX)/grid))),
                Math.max(0,Math.min(nz-1,Math.round((p.z-minZ)/grid)))];
 const [si,sj]=cell(start),[gi,gj]=cell(goal),source=idx(si,sj),target=idx(gi,gj);
 const dist=new Float64Array(nx*nz).fill(Infinity),previous=new Int32Array(nx*nz).fill(-1);
 const heap=[];const push=(key,score)=>{heap.push([score,key]);let k=heap.length-1;while(k){let p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p}};
 const pop=()=>{let top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;while(true){let l=k*2+1,r=l+1,b=k;if(l<heap.length&&heap[l][0]<heap[b][0])b=l;if(r<heap.length&&heap[r][0]<heap[b][0])b=r;if(b===k)break;[heap[k],heap[b]]=[heap[b],heap[k]];k=b}}return top};
 const heuristic=(i,j)=>Math.hypot((i-gi)*grid,(j-gj)*grid);
 const pass=(a,b)=>{
   const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
   const tx=dx/len,tz=dz/len,nx=-tz,nz=tx;
   for(const t of [.25,.5,.75]){
     const x=a.x+dx*t,z=a.z+dz*t;
     if(obstacleAt(x,z)||lakeRadius&&lakeRadius(x,z)<lakeMargin)return false;
     const grade=Math.abs(terrainY(x+tx*.5,z+tz*.5)-terrainY(x-tx*.5,z-tz*.5));
     const cross=Math.abs(terrainY(x+nx*halfWidth,z+nz*halfWidth)-terrainY(x-nx*halfWidth,z-nz*halfWidth))/(2*halfWidth);
     if(grade>maxGrade||cross>maxCrossSlope)return false;
   }
   return true;
 };
 dist[source]=0;push(source,heuristic(si,sj));
 let expanded=0;
 while(heap.length&&expanded<maxNodes){
   const [score,k]=pop(),i=k%nx,j=(k-i)/nx;
   if(score>dist[k]+heuristic(i,j)+1e-6)continue;
   if(k===target)break;expanded++;
   for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
     if(!di&&!dj)continue;
     const u=i+di,v=j+dj;if(u<0||v<0||u>=nx||v>=nz)continue;
     const a=point(i,j),b=point(u,v);if(!pass(a,b))continue;
     const nk=idx(u,v),step=Math.hypot(di,dj)*grid;
     // Mild preference for contour-following and gentle curves over zigzags.
     const nd=dist[k]+step;
     if(nd<dist[nk]){dist[nk]=nd;previous[nk]=k;push(nk,nd+heuristic(u,v))}
   }
 }
 if(!Number.isFinite(dist[target]))return {status:'grading-required',reason:'No continuous path meets natural-ground slope and clearance limits',expanded};
 const points=[];for(let k=target;k>=0;k=previous[k]){const i=k%nx,j=(k-i)/nx;points.push(point(i,j));if(k===source)break}
 points.reverse();
 // Verify actual segment-to-segment grade and cross-slope after reconstruction.
 const audit=auditTrail(points,terrainY,{spacing:1,halfWidth,maxGrade,maxCrossSlope});
 return {status:audit.pass?'candidate':'grading-required',points,audit,expanded,
   note:'Grid-based planning only; final smoothing, obstacles, land ownership, landmark, beaches and game runtime need review.'};
}
