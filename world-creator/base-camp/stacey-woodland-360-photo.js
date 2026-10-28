// WVLRP Stacey Lake — V14 original Woodland Trail PHOTO-surface.
// Use the real rocky path in the CENTER of the owner's approved 360 panorama.
// Native autumn colours, square photographic texels, feathered trail edges.
// The V13 browser failure was caused by getImageData() on a cross-origin image.
export function applyWoodlandTrail360Photo(THREE,meshes){
  const asset='../../assets/woodland-trail-hd.webp';
  const source=new URL(asset,import.meta.url).href;
  const pinned='https://raw.githubusercontent.com/copperisbetter-lang/Wvlrp/044f3db6b25dc23b2277cde07db430f0dd4f1a11/assets/woodland-trail-hd.webp';
  const sources=[source,pinned];
  const status={asset,state:'loading',meshes:meshes.length,photographic:true,mode:'original 360 central rocky trail'};
  if(typeof window!=='undefined')window.staceyTrailPhoto=status;
  let attempt=0;
  function failed(error){
    status.state='failed';status.error=String(error);
    if(typeof window!=='undefined'&&window.staceyDiagnostics)
      window.staceyDiagnostics.errors.push('Woodland photo: '+error);
  }
  function tryLoad(){
    if(attempt>=sources.length){failed('CORS-safe Woodland Trail image unavailable');return;}
    const url=sources[attempt++];
    const img=new Image();
    // IMPORTANT: Must be set BEFORE src for a CORS-clean WebGL CanvasTexture.
    // The old image lacked this setting and getImageData threw SecurityError.
    img.crossOrigin='anonymous';
    img.onload=()=>{
      try{
        const w=img.naturalWidth,h=img.naturalHeight;
        if(w<512||h<256)throw Error('Original 360 woodland photo too small');
        const S=1024,canvas=document.createElement('canvas');
        canvas.width=canvas.height=S;
        const ctx=canvas.getContext('2d');
        if(!ctx)throw Error('Photo compositing unavailable');
        // Central photographed woodland walking track with roots, rocks,
        // dirt, real golden leaves. Previous V13 photo region took leaf
        // carpet at the bottom rather than the rocky path in center.
        // Nearly square pixel crop; path UVs below repeat at 2.8m intervals.
        const sx=Math.floor(w*.405),sy=Math.floor(h*.52);
        const sw=Math.floor(w*.19),sh=Math.floor(h*.38);
        ctx.drawImage(img,sx,sy,sw,sh,0,0,S,S);
        // Feather ONLY edges, not colours. No desaturation, beige tint,
        // per-pixel readback, or washed-out faux soil texture.
        ctx.globalCompositeOperation='destination-in';
        const edge=ctx.createLinearGradient(0,0,S,0);
        edge.addColorStop(0,'rgba(255,255,255,0)');
        edge.addColorStop(.08,'rgba(255,255,255,.25)');
        edge.addColorStop(.21,'rgba(255,255,255,1)');
        edge.addColorStop(.79,'rgba(255,255,255,1)');
        edge.addColorStop(.92,'rgba(255,255,255,.25)');
        edge.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=edge;ctx.fillRect(0,0,S,S);
        ctx.globalCompositeOperation='source-over';
        // With CORS-enabled image, canvas remains origin clean for WebGL.
        // No getImageData()/putImageData(), which caused the Android crash.
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
          mesh.material.opacity=1;
          mesh.material.alphaTest=.02;
          mesh.material.depthWrite=false;
          mesh.material.polygonOffset=true;
          mesh.material.polygonOffsetFactor=-3;
          mesh.material.polygonOffsetUnits=-3;
          mesh.material.needsUpdate=true;
          mesh.userData.photoSurface=asset;
          mesh.userData.photoReady=true;
        }
        status.state='ready';status.photoSize=[w,h];status.photoCrop=[sx,sy,sw,sh];status.loadedFrom=url;
        if(typeof window!=='undefined'&&window.staceyDiagnostics)
          window.staceyDiagnostics.assets['360 Woodland Trail photo walking surface']='READY, full-colour '+meshes.length+' meshes';
      }catch(err){
        // If browser refuses a CORS-clean canvas after image.onload,
        // do not quietly call the original beige ground a photo.
        if(attempt<sources.length)tryLoad();else failed(err);
      }
    };
    img.onerror=()=>{
      if(attempt<sources.length)tryLoad();
      else failed('WebP CORS image load rejected for both hosts');
    };
    img.src=url;
  }
  tryLoad();
  return status;
}
