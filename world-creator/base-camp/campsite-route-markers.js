// Base Camp campsite route MARKERS ONLY. No textured trails, fences or lake asset changes.
// Every clearing joins a shared perimeter ring; exactly two marked lake access endpoints.
export function installCampsiteRouteMarkers(THREE,scene,{terrainY,perimeterClearings,interiorClearings,LAKE}){
 const group=new THREE.Group();group.name='campsite-route-markers';scene.add(group);
 const nodes=new Map(),edges=[],lakeExits=[];
 const node=(id,x,z,kind='junction')=>{const n={id,x,z,kind};nodes.set(id,n);return n};
 const link=(a,b)=>edges.push([a.id,b.id]);
 const ring=[],R=345,N=72;
 for(let i=0;i<N;i++){const a=i*2*Math.PI/N;ring.push(node('ring-'+i,R*Math.cos(a),R*Math.sin(a)))}
 for(let i=0;i<N;i++)link(ring[i],ring[(i+1)%N]);
 const nearest=(p,collection)=>collection.reduce((best,n)=>!best||Math.hypot(p.x-n.x,p.z-n.z)<Math.hypot(p.x-best.x,p.z-best.z)?n:best,null);
 const clearings=[...perimeterClearings,...interiorClearings];
 // Keep campsite spokes away from the lake: radial route to the shared outer ring.
 for(const p of clearings){const camp=node(p.id,p.x,p.z,'campsite');const a=nearest(p,ring);link(camp,a)}
 const village=node('village',0,0,'village');
 // The village exits northward, well away from lake to the south.
 const v1=node('village-north',0,90),v2=node('village-north-junction',0,230);
 link(village,v1);link(v1,v2);link(v2,nearest(v2,ring));
 // Only TWO terminal access paths reach the lake. Their endpoints are inland of the
 // north-facing shoreline; no trail extends across water or through either beach.
 for(const side of [-1,1]){
  const approach=node('lake-approach-'+(side<0?'west':'east'),side*155,-230);
  const exit=node('lake-exit-'+(side<0?'west':'east'),side*58,-192,'lake-exit');
  link(nearest(approach,ring),approach);link(approach,exit);lakeExits.push(exit);
 }
 const lakeClearance=lakeExits.map(p=>Math.hypot(p.x-LAKE.x,p.z-LAKE.z));
 if(clearings.length!==65||lakeExits.length!==2||lakeClearance.some(d=>d<10))throw Error('Campsite route network invariants failed');
 // Low-profile wooden wayfinding stakes, placed every ~14 m on connected edges.
 const postGeo=new THREE.CylinderGeometry(.055,.07,.64,6);
 const postMat=new THREE.MeshStandardMaterial({color:0x98734a,roughness:1});
 const capGeo=new THREE.SphereGeometry(.105,6,4);
 const capMat=new THREE.MeshStandardMaterial({color:0xe3c98b,roughness:1});
 const markers=[];
 for(const [aid,bid] of edges){
  const a=nodes.get(aid),b=nodes.get(bid),len=Math.hypot(b.x-a.x,b.z-a.z);
  const steps=Math.max(1,Math.ceil(len/14));
  for(let j=0;j<=steps;j++){
   const t=j/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   const p=new THREE.Mesh(postGeo,postMat);p.position.set(x,terrainY(x,z)+.32,z);group.add(p);
   const cap=new THREE.Mesh(capGeo,capMat);cap.position.set(x,terrainY(x,z)+.67,z);group.add(cap);
   markers.push({x,z});
  }
 }
 // Graph reachability test: every campsite can reach village and both lake exits.
 const adjacency=new Map([...nodes.keys()].map(k=>[k,new Set()]));
 for(const [a,b] of edges){adjacency.get(a).add(b);adjacency.get(b).add(a)}
 const seen=new Set(['village']),queue=['village'];
 for(let i=0;i<queue.length;i++)for(const k of adjacency.get(queue[i]))if(!seen.has(k)){seen.add(k);queue.push(k)}
 if(clearings.some(p=>!seen.has(p.id))||lakeExits.some(p=>!seen.has(p.id)))throw Error('Disconnected campsite route');
 return {group,nodes,edges,markers,campsiteCount:clearings.length,lakeExits,lakeClearance,connected:true};
}
