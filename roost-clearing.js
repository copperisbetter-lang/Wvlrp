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
    renderPano=()=>{const scale=Math.min(1,720/innerWidth,900/innerHeight);const w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);if(fallback.width!==w||fallback.height!==h){fallback.width=w;fallback.height=h}const out=ctx.createImageData(w,h),dst=out.data,t=Math.tan(fov/2),aspect=innerWidth/innerHeight,cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);
      for(let y=0;y<h;y++){const dy=(1-(y+.5)/h*2)*t,yy=dy*cp+sp,zz=cp-dy*sp;for(let x=0;x<w;x++){const dx=((x+.5)/w*2-1)*t*aspect,xx=dx*cy+zz*sy,z=zz*cy-dx*sy,u=((Math.atan2(xx,z)/(2*Math.PI))%1+1)%1,v=.5-Math.atan2(yy,Math.hypot(xx,z))/Math.PI;const sx=Math.min(sourceWidth-1,Math.floor(u*sourceWidth)),syi=Math.max(0,Math.min(sourceHeight-1,Math.floor(v*sourceHeight))),i=(syi*sourceWidth+sx)*4,j=(y*w+x)*4;dst[j]=pixels[i];dst[j+1]=pixels[i+1];dst[j+2]=pixels[i+2];dst[j+3]=255;}}
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
  function draw(){if(ready)renderPano();positionVideo()}
  const image=new Image();image.onload=()=>{window.roostUploadImage(image);delete window.roostUploadImage;ready=true;error.hidden=true;schedule();dispatchEvent(new Event('wvlrp-scene-ready'))};image.onerror=()=>{error.hidden=false;error.textContent='The clearing could not load. Please refresh.'};
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
