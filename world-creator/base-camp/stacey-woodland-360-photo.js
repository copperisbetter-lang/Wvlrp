// Stacey Lake photo-surface pass. Source is WVLRP's original Woodland Trail 360.
export function applyWoodlandTrail360Photo(THREE,meshes){
  const asset='../../assets/woodland-trail-hd.webp';
  const status={asset,state:'loading',meshes:meshes.length};
  if(typeof window!=='undefined')window.staceyTrailPhoto=status;
  const image=new Image();
  image.onload=()=>{
    try{
      const w=image.naturalWidth,h=image.naturalHeight;
      if(w<512||h<256)throw Error('Woodland photo resolution too small');
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=1024;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('Canvas unavailable');
      // Equirectangular photo: sample the near-ground walking area, below the
      // horizon. Do not project the photo's sky, trees, or panoramic skyline.
      const sx=Math.floor(w*.40),sy=Math.floor(h*.67);
      const sw=Math.floor(w*.20),sh=Math.floor(h*.235);
      ctx.drawImage(image,sx,sy,sw,sh,0,0,1024,1024);
      // Transparent photo edges merge into native ground, no rectangular strips.
      ctx.globalCompositeOperation='destination-in';
      const fade=ctx.createLinearGradient(0,0,1024,0);
      fade.addColorStop(0,'rgba(255,255,255,0)');
      fade.addColorStop(.16,'rgba(255,255,255,1)');
      fade.addColorStop(.84,'rgba(255,255,255,1)');
      fade.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=fade;ctx.fillRect(0,0,1024,1024);
      ctx.globalCompositeOperation='source-over';
      const map=new THREE.CanvasTexture(canvas);
      map.colorSpace=THREE.SRGBColorSpace;
      map.wrapS=THREE.ClampToEdgeWrapping;
      map.wrapT=THREE.MirroredRepeatWrapping;
      map.generateMipmaps=true;
      map.minFilter=THREE.LinearMipmapLinearFilter;
      map.anisotropy=4;
      for(const mesh of meshes){
        mesh.material.map=map;
        mesh.material.color.set(0xffffff);
        mesh.material.transparent=true;
        mesh.material.depthWrite=false;
        mesh.material.opacity=1;
        mesh.material.needsUpdate=true;
        mesh.userData.photoSurface=asset;
      }
      status.state='ready';status.photoSize=[w,h];
      if(window.staceyDiagnostics)window.staceyDiagnostics.assets['360 Woodland Trail photo walking surface']='ready';
    }catch(e){
      status.state='failed';status.error=String(e);
      if(window.staceyDiagnostics)window.staceyDiagnostics.errors.push('360 photo trail: '+e);
    }
  };
  image.onerror=()=>{
    status.state='failed';status.error='Woodland Trail 360 image unavailable';
    if(window.staceyDiagnostics)window.staceyDiagnostics.errors.push(status.error);
  };
  image.src=new URL(asset,import.meta.url).href;
  return status;
}
