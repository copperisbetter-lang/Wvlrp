(()=>{
  const canvas=document.getElementById('scene'),fallback=document.getElementById('panoFallback'),wrap=document.getElementById('videoWrap');
  const error=document.getElementById('sceneMessage');
  let yaw=Math.PI,pitch=-.075,fov=1.25,ready=false,raf=0,renderPano=null;
  let pixels=null,sourceWidth=0,sourceHeight=0,signPixels=null,signWidth=0,signHeight=0;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false});
  function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;draw()})}
  if(gl){
    const vs='attribute vec2 a;varying vec2 p;void main(){p=a;gl_Position=vec4(a,0.,1.);}';
    const fs='precision highp float;varying vec2 p;uniform sampler2D tex,signTex;uniform float yaw,pitch,fov,aspect;void main(){float t=tan(fov*.5);vec3 d=normalize(vec3(p.x*t*aspect,p.y*t,1.));float yy=d.y*cos(pitch)+d.z*sin(pitch);float zz=d.z*cos(pitch)-d.y*sin(pitch);float xx=d.x*cos(yaw)+zz*sin(yaw);float z=zz*cos(yaw)-d.x*sin(yaw);float u=fract(atan(xx,z)/6.28318530718+1.);float v=.5-atan(yy,length(vec2(xx,z)))/3.14159265359;vec4 color=texture2D(tex,vec2(u,v));float seam=.5*(1.-smoothstep(0.,.012,min(u,1.-u)));color.rgb=mix(color.rgb,texture2D(tex,vec2(1.-u,v)).rgb,seam);if(z>0.){vec2 uv=vec2((xx/z+.115)/.23,(.0225-yy/z)/.1725);if(uv.x>=0.&&uv.x<=1.&&uv.y>=0.&&uv.y<=1.){vec4 sign=texture2D(signTex,uv);color.rgb=mix(color.rgb,sign.rgb,sign.a);}}gl_FragColor=color;}';
    function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const attr=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program,'tex'),0);gl.uniform1i(gl.getUniformLocation(program,'signTex'),1);
    const signTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,signTexture);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));gl.activeTexture(gl.TEXTURE0);
    window.roostUploadSign=img=>{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,signTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.activeTexture(gl.TEXTURE0)};
    const loc={};for(const k of ['yaw','pitch','fov','aspect'])loc[k]=gl.getUniformLocation(program,k);
    renderPano=()=>{const ratio=Math.min(devicePixelRatio||1,2);const w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.uniform1f(loc.yaw,yaw);gl.uniform1f(loc.pitch,pitch);gl.uniform1f(loc.fov,fov);gl.uniform1f(loc.aspect,w/h);gl.drawArrays(gl.TRIANGLES,0,6)};
    window.roostUploadImage=img=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img)};
  }else{
    // Use the same spherical projection on computers without WebGL.
    canvas.hidden=true;fallback.hidden=false;const ctx=fallback.getContext('2d',{alpha:false});
    renderPano=()=>{const scale=Math.min(1,1080/innerWidth,1400/innerHeight);const w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);if(fallback.width!==w||fallback.height!==h){fallback.width=w;fallback.height=h}const out=ctx.createImageData(w,h),dst=out.data,t=Math.tan(fov/2),aspect=innerWidth/innerHeight,cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);
      for(let y=0;y<h;y++){const dy=(1-(y+.5)/h*2)*t,yy=dy*cp+sp,zz=cp-dy*sp;for(let x=0;x<w;x++){const dx=((x+.5)/w*2-1)*t*aspect,xx=dx*cy+zz*sy,z=zz*cy-dx*sy,u=((Math.atan2(xx,z)/(2*Math.PI))%1+1)%1,v=.5-Math.atan2(yy,Math.hypot(xx,z))/Math.PI;const sx=u*sourceWidth,syi=Math.max(0,Math.min(sourceHeight-1,v*sourceHeight)),x0=Math.floor(sx),x1=(x0+1)%sourceWidth,y0=Math.floor(syi),y1=Math.min(sourceHeight-1,y0+1),tx=sx-x0,ty=syi-y0,i=(y0*sourceWidth+x0)*4,i1=(y0*sourceWidth+x1)*4,i2=(y1*sourceWidth+x0)*4,i3=(y1*sourceWidth+x1)*4,j=(y*w+x)*4;for(let channel=0;channel<3;channel++)dst[j+channel]=(pixels[i+channel]*(1-tx)+pixels[i1+channel]*tx)*(1-ty)+(pixels[i2+channel]*(1-tx)+pixels[i3+channel]*tx)*ty;const edge=Math.min(u,1-u);if(edge<.012){const q=Math.max(0,Math.min(1,edge/.012)),blend=.5*(1-q*q*(3-2*q)),ox=Math.min(sourceWidth-1,Math.floor((1-u)*sourceWidth)),oi=(y0*sourceWidth+ox)*4,oi2=(y1*sourceWidth+ox)*4;for(let c=0;c<3;c++)dst[j+c]=dst[j+c]*(1-blend)+(pixels[oi+c]*(1-ty)+pixels[oi2+c]*ty)*blend;}if(signPixels&&z>0){const su=(xx/z+.115)/.23,sv=(.0225-yy/z)/.1725;if(su>=0&&su<1&&sv>=0&&sv<1){const si=(Math.floor(sv*signHeight)*signWidth+Math.floor(su*signWidth))*4,alpha=signPixels[si+3]/255;for(let c=0;c<3;c++)dst[j+c]=signPixels[si+c]*alpha+dst[j+c]*(1-alpha);}}dst[j+3]=255;}}
      ctx.putImageData(out,0,0);
    };
    window.roostUploadSign=img=>{const src=document.createElement('canvas');signWidth=img.width;signHeight=img.height;src.width=signWidth;src.height=signHeight;const c=src.getContext('2d');c.drawImage(img,0,0);signPixels=c.getImageData(0,0,signWidth,signHeight).data};
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


  // Approved Natural Springs construction gate — matched to the accepted mockup.
  const gate=document.createElement('div');
  gate.id='naturalSpringsGate';
  gate.setAttribute('role','img');
  gate.setAttribute('aria-label','Natural Springs trail under construction');
  gate.style.cssText='position:fixed;left:0;top:0;width:490px;height:310px;transform-origin:0 0;z-index:11;pointer-events:none;visibility:hidden';
  gate.innerHTML=`<img src="assets/roost/natural-springs-gate-exact.svg?v=20261006-exact1" alt="" style="display:block;width:100%;height:100%;object-fit:fill;pointer-events:none;user-select:none">`;
  document.body.appendChild(gate);
  function positionGate(){
    // Plane x=.25.. .61, y=-.10..-.307, z=1; all points share the panorama camera.
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),k=.00062,f=innerHeight/(2*Math.tan(fov/2)),cx=innerWidth/2,hy=innerHeight/2;
    const X0=.47*cy-sy,Z0=.47*sy+cy,Y0=-.08*cp-Z0*sp,D0=-.08*sp+Z0*cp;
    const Xu=k*cy,Zu=k*sy,Yu=-Zu*sp,Du=Zu*cp,Yv=-k*cp,Dv=-k*sp;
    gate.style.visibility=ready&&D0>.2?'visible':'hidden';
    gate.style.transform='matrix3d('+[f*Xu+cx*Du,-f*Yu+hy*Du,0,Du,cx*Dv,-f*Yv+hy*Dv,0,Dv,0,0,1,0,f*X0+cx*D0,-f*Y0+hy*D0,0,D0].join(',')+')';
  }

  function draw(){if(ready)renderPano();positionVideo();positionTrailSign();positionGate()}
  // Sample the original sign texture per screen pixel, independently of the panorama.
  // This preserves detail while keeping its posts fixed to the same world plane.
  const image=new Image(),signImage=new Image();
  signImage.src='assets/roost/trail-sign-realistic-v4.webp';
  image.onload=async()=>{
    window.roostUploadImage(image);
    try{await signImage.decode();window.roostUploadSign(signImage)}catch{trailSign.remove()}
    delete window.roostUploadImage;delete window.roostUploadSign;
    ready=true;error.hidden=true;schedule();dispatchEvent(new Event('wvlrp-scene-ready'));
  };
  image.onerror=()=>{error.hidden=false;error.textContent='The clearing could not load. Please refresh.'};
  image.src='assets/roost/clearing-360-detail-v6.webp?v=20261006-quality6';
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
