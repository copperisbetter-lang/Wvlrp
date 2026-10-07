(()=>{
  const canvas=document.getElementById('scene'),fallback=document.getElementById('panoFallback'),wrap=document.getElementById('videoWrap');
  const error=document.getElementById('sceneMessage');
  let yaw=Math.PI,pitch=-.075,fov=1.25,ready=false,raf=0,renderPano=null;
  let pixels=null,sourceWidth=0,sourceHeight=0;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false});
  function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;draw()})}
  if(gl){
    const vs='attribute vec2 a;varying vec2 p;void main(){p=a;gl_Position=vec4(a,0.,1.);}';
    const fs='precision highp float;varying vec2 p;uniform sampler2D tex;uniform float yaw,pitch,fov,aspect;void main(){float t=tan(fov*.5);vec3 d=normalize(vec3(p.x*t*aspect,p.y*t,1.));float yy=d.y*cos(pitch)+d.z*sin(pitch);float zz=d.z*cos(pitch)-d.y*sin(pitch);float xx=d.x*cos(yaw)+zz*sin(yaw);float z=zz*cos(yaw)-d.x*sin(yaw);float u=fract(atan(xx,z)/6.28318530718+1.);float v=.5-atan(yy,length(vec2(xx,z)))/3.14159265359;gl_FragColor=texture2D(tex,vec2(u,v));}';
    function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const attr=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
    const loc={};for(const k of ['yaw','pitch','fov','aspect'])loc[k]=gl.getUniformLocation(program,k);
    renderPano=()=>{const ratio=Math.min(devicePixelRatio||1,2);const w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.uniform1f(loc.yaw,yaw);gl.uniform1f(loc.pitch,pitch);gl.uniform1f(loc.fov,fov);gl.uniform1f(loc.aspect,w/h);gl.drawArrays(gl.TRIANGLES,0,6)};
    window.roostUploadImage=img=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img)};
  }else{
    // Use the same spherical projection on computers without WebGL.
    canvas.hidden=true;fallback.hidden=false;const ctx=fallback.getContext('2d',{alpha:false});
    renderPano=()=>{const scale=Math.min(1,1080/innerWidth,1400/innerHeight);const w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);if(fallback.width!==w||fallback.height!==h){fallback.width=w;fallback.height=h}const out=ctx.createImageData(w,h),dst=out.data,t=Math.tan(fov/2),aspect=innerWidth/innerHeight,cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);
      for(let y=0;y<h;y++){const dy=(1-(y+.5)/h*2)*t,yy=dy*cp+sp,zz=cp-dy*sp;for(let x=0;x<w;x++){const dx=((x+.5)/w*2-1)*t*aspect,xx=dx*cy+zz*sy,z=zz*cy-dx*sy,u=((Math.atan2(xx,z)/(2*Math.PI))%1+1)%1,v=.5-Math.atan2(yy,Math.hypot(xx,z))/Math.PI;const sx=u*sourceWidth,syi=Math.max(0,Math.min(sourceHeight-1,v*sourceHeight)),x0=Math.floor(sx),x1=(x0+1)%sourceWidth,y0=Math.floor(syi),y1=Math.min(sourceHeight-1,y0+1),tx=sx-x0,ty=syi-y0,i=(y0*sourceWidth+x0)*4,i1=(y0*sourceWidth+x1)*4,i2=(y1*sourceWidth+x0)*4,i3=(y1*sourceWidth+x1)*4,j=(y*w+x)*4;for(let channel=0;channel<3;channel++)dst[j+channel]=(pixels[i+channel]*(1-tx)+pixels[i1+channel]*tx)*(1-ty)+(pixels[i2+channel]*(1-tx)+pixels[i3+channel]*tx)*ty;dst[j+3]=255;}}
      ctx.putImageData(out,0,0);
    };
    window.roostUploadImage=img=>{const src=document.createElement('canvas');sourceWidth=img.width;sourceHeight=img.height;src.width=sourceWidth;src.height=sourceHeight;const c=src.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);pixels=c.getImageData(0,0,sourceWidth,sourceHeight).data};
  }
  function positionVideo(){
    const delta=Math.PI-yaw,worldY=Math.sin(-.075),worldZ=Math.cos(-.075)*Math.cos(delta),x=Math.cos(-.075)*Math.sin(delta),y=worldY*Math.cos(pitch)-worldZ*Math.sin(pitch),z=worldY*Math.sin(pitch)+worldZ*Math.cos(pitch);
    const focal=innerHeight/(2*Math.tan(fov/2)),baseFocal=innerHeight/(2*Math.tan(1.25/2)),width=Math.min(innerWidth*.91,820)*focal/baseFocal;
    const sx=innerWidth/2+focal*x/Math.max(z,.001),sy=innerHeight/2-focal*y/Math.max(z,.001),size=width/Math.max(z,.001);
    const visible=z>.24&&Math.abs(sx-innerWidth/2)<innerWidth/2+size/2&&Math.abs(sy-innerHeight/2)<innerHeight/2+size/2;
    wrap.style.visibility=visible?'visible':'hidden';wrap.style.pointerEvents=visible?'auto':'none';wrap.style.left=sx+'px';wrap.style.top=sy+'px';wrap.style.width=size+'px';
  }

  // A world-anchored trail sign at the fork opposite the live camera.
  const trailSign=document.createElement('div');
  trailSign.id='roostTrailSign';
  trailSign.style.cssText='position:fixed;z-index:12;transform:translate(-50%,-50%);visibility:hidden;pointer-events:none;';
  trailSign.innerHTML=`<a href="woodland-trail.html" aria-label="Back to Woodland Trail" style="position:absolute;left:5%;top:0;width:90%;height:100%;pointer-events:auto"></a>`;
  document.body.appendChild(trailSign);
  function positionTrailSign(){
    const latitude=-.025,delta=0-yaw,wy=Math.sin(latitude),wz=Math.cos(latitude)*Math.cos(delta),x=Math.cos(latitude)*Math.sin(delta),y=wy*Math.cos(pitch)-wz*Math.sin(pitch),z=wy*Math.sin(pitch)+wz*Math.cos(pitch);
    const focal=innerHeight/(2*Math.tan(fov/2)),size=focal*.23/Math.max(z,.001),sx=innerWidth/2+focal*x/Math.max(z,.001),sy=innerHeight/2-focal*y/Math.max(z,.001);
    const visible=ready&&z>.3&&Math.abs(sx-innerWidth/2)<innerWidth/2+size/2&&Math.abs(sy-innerHeight/2)<innerHeight/2+size/2;
    trailSign.style.visibility=visible?'visible':'hidden';trailSign.style.left=sx+'px';trailSign.style.top=sy+'px';trailSign.style.width=size+'px';trailSign.style.height=(size*.27)+'px';
  }

  function draw(){if(ready)renderPano();positionVideo();positionTrailSign()}
  // Composite the upright sign into the spherical scene once, so its feet
  // and the forest ground share exactly the same projection during every pan.
  const image=new Image(),signImage=new Image();
  signImage.src='assets/roost/trail-sign-realistic-v4.webp';
  image.onload=async()=>{
    try{await signImage.decode();
      const scene=document.createElement('canvas');scene.width=image.width;scene.height=image.height;
      const context=scene.getContext('2d');context.drawImage(image,0,0);
      const sprite=document.createElement('canvas');sprite.width=signImage.width;sprite.height=signImage.height;
      const sc=sprite.getContext('2d');sc.drawImage(signImage,0,0);
      const rgba=sc.getImageData(0,0,sprite.width,sprite.height).data;
      const halfWidth=.115,bottom=-.15,top=.0225;
      const span=Math.ceil(Math.atan(halfWidth)*scene.width/(2*Math.PI));
      const y0=Math.floor((.5-Math.atan(top)/Math.PI)*scene.height)-2;
      const y1=Math.ceil((.5-Math.atan(bottom)/Math.PI)*scene.height)+2;
      // The fork crosses the panorama seam; draw both sides with wrapped x.
      for(let ix=-span;ix<=span;ix++){
        const longitude=ix/scene.width*2*Math.PI,wx=Math.tan(longitude);
        const sx=Math.floor((wx+halfWidth)/(2*halfWidth)*sprite.width);
        if(sx<0||sx>=sprite.width)continue;
        const column=context.getImageData((ix+scene.width)%scene.width,y0,1,y1-y0);
        for(let iy=y0;iy<y1;iy++){
          const latitude=(.5-(iy+.5)/scene.height)*Math.PI;
          const wy=Math.tan(latitude)/Math.cos(longitude);
          const sy=Math.floor((top-wy)/(top-bottom)*sprite.height);
          if(sy<0||sy>=sprite.height)continue;
          const src=(sy*sprite.width+sx)*4,dst=(iy-y0)*4,alpha=rgba[src+3]/255;
          for(let c=0;c<3;c++)column.data[dst+c]=rgba[src+c]*alpha+column.data[dst+c]*(1-alpha);
        }
        context.putImageData(column,(ix+scene.width)%scene.width,y0);
      }
      window.roostUploadImage(scene);
    }catch{window.roostUploadImage(image);trailSign.remove()}
    delete window.roostUploadImage;ready=true;error.hidden=true;schedule();dispatchEvent(new Event('wvlrp-scene-ready'));
  };
  image.onerror=()=>{error.hidden=false;error.textContent='The clearing could not load. Please refresh.'};
  image.src='assets/roost/clearing-360-hd.webp?v=20261006-1';
  const surface=gl?canvas:fallback,pointers=new Map();let distance=0;
  surface.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;surface.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);distance=0});
  surface.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===1){yaw-=(e.clientX-prev[0])*.0015*fov;pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.clientY-prev[1])*.0015*fov))}else{const a=[...pointers.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(distance&&d>0)fov=Math.max(.65,Math.min(1.6,fov*distance/d));distance=d}schedule()});
  for(const event of ['pointerup','pointercancel'])surface.addEventListener(event,e=>{pointers.delete(e.pointerId);distance=0});
  surface.addEventListener('wheel',e=>{e.preventDefault();fov=Math.max(.65,Math.min(1.6,fov+e.deltaY*.001));schedule()},{passive:false});
  surface.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')yaw-=.1;if(e.key==='ArrowRight')yaw+=.1;if(e.key==='ArrowUp')pitch=Math.min(1.4,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(-1.4,pitch-.1);if(e.key==='+')fov=Math.max(.65,fov-.1);if(e.key==='-')fov=Math.min(1.6,fov+.1);schedule()});
  document.getElementById('centerView').onclick=()=>{yaw=Math.PI;pitch=-.075;fov=1.25;schedule()};
  addEventListener('resize',schedule);draw();
  setTimeout(()=>document.getElementById('hint').style.opacity=0,4500);
})();
