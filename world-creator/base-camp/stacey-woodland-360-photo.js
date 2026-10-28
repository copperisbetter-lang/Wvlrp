// Stacey Lake V13: visible PHOTOGRAPHIC woodland tread, no generic soil ribbon.
// The photographic source is our original 360 Woodland Trail scene; only near-ground
// pixels are sampled. A subtle, foot-worn central treatment keeps it distinct from
// the surrounding grassy terrain while preserving photographed rocks and leaf detail.
export function applyWoodlandTrail360Photo(THREE,meshes){
  const asset='../../assets/woodland-trail-hd.webp';
  const status={asset,state:'loading',meshes:meshes.length,photographic:true};
  if(typeof window!=='undefined')window.staceyTrailPhoto=status;
  const image=new Image();
  image.onload=()=>{
    try{
      const w=image.naturalWidth,h=image.naturalHeight;
      if(w<512||h<256)throw Error('Woodland photo resolution too small');
      const S=1024,canvas=document.createElement('canvas');
      canvas.width=canvas.height=S;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw Error('Trail photo canvas unavailable');
      // Equirectangular original: use ONLY the ground BELOW the horizon.
      // This is a photograph of the actual WVLRP 360 Woodland Trail ground,
      // not a 360 panorama, painted trees, or a flat brown synthetic ribbon.
      const sx=Math.floor(w*.36),sy=Math.floor(h*.62);
      const sw=Math.floor(w*.28),sh=Math.floor(h*.33);
      ctx.drawImage(image,sx,sy,sw,sh,0,0,S,S);
      const pixels=ctx.getImageData(0,0,S,S),data=pixels.data;
      // Narrow compacted-footpath center, with photographed irregular leaf and
      // stone detail preserved. Feathery, uneven margins merge with real terrain.
      for(let y=0;y<S;y++){
        const along=y/S;
        const meander=.045*Math.sin(along*14.1)+.023*Math.sin(along*33.7+1.8);
        for(let x=0;x<S;x++){
          const i=(y*S+x)*4;
          const across=Math.abs((x/S-.5-meander)*2);
          const worn=Math.pow(Math.max(0,1-across*across),1.55);
          const k=.52*worn;
          // Color-shift only: every photographed stone, crack and leaf survives.
          data[i]=Math.min(255,Math.round(data[i]*(1-k)+155*k));
          data[i+1]=Math.min(255,Math.round(data[i+1]*(1-k)+125*k));
          data[i+2]=Math.min(255,Math.round(data[i+2]*(1-k)+85*k));
          const fringe=(1-across)/.20;
          const irregular=.04*Math.sin(along*71+across*16);
          const alpha=Math.max(0,Math.min(1,fringe+irregular));
          data[i+3]=Math.round(255*alpha);
        }
      }
      ctx.putImageData(pixels,0,0);
      const map=new THREE.CanvasTexture(canvas);
      map.colorSpace=THREE.SRGBColorSpace;
      map.wrapS=THREE.ClampToEdgeWrapping;
      map.wrapT=THREE.MirroredRepeatWrapping;
      map.generateMipmaps=true;
      map.minFilter=THREE.LinearMipmapLinearFilter;
      map.magFilter=THREE.LinearFilter;
      map.anisotropy=4;
      for(const mesh of meshes){
        mesh.material.map=map;
        mesh.material.color.set(0xffffff);
        mesh.material.transparent=true;
        mesh.material.alphaTest=.035;
        mesh.material.depthWrite=false;
        mesh.material.opacity=1;
        mesh.material.polygonOffset=true;
        mesh.material.polygonOffsetFactor=-3;
        mesh.material.polygonOffsetUnits=-3;
        mesh.material.needsUpdate=true;
        mesh.userData.photoSurface=asset;
        mesh.userData.photoReady=true;
      }
      status.state='ready';status.photoSize=[w,h];status.photoCrop=[sx,sy,sw,sh];
      if(window.staceyDiagnostics)window.staceyDiagnostics.assets['360 Woodland Trail photo walking surface']='READY: '+meshes.length+' trail meshes';
    }catch(e){
      status.state='failed';status.error=String(e);
      if(window.staceyDiagnostics)window.staceyDiagnostics.errors.push('360 photo trail: '+e);
    }
  };
  image.onerror=()=>{
    status.state='failed';status.error='Woodland Trail photo asset unavailable';
    if(window.staceyDiagnostics)window.staceyDiagnostics.errors.push(status.error);
  };
  image.src=new URL(asset,import.meta.url).href;
  return status;
}
