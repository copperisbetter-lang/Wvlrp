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


  // Small timber barrier across the Natural Springs entrance, projected in world space.
  const gate=document.createElement('div');
  gate.id='naturalSpringsGate';gate.setAttribute('role','img');gate.setAttribute('aria-label','Natural Springs trail under construction');
  gate.style.cssText='position:fixed;left:0;top:0;width:400px;height:230px;transform-origin:0 0;z-index:11;pointer-events:none;visibility:hidden';
  gate.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 230" width="400" height="230" aria-hidden="true">
  <defs>
    <linearGradient id="gatePost" x1="0" y1="0" x2=".85" y2="1">
      <stop stop-color="#8a7049"/><stop offset=".28" stop-color="#665235"/><stop offset=".58" stop-color="#7d6540"/><stop offset="1" stop-color="#3f3425"/>
    </linearGradient>
    <linearGradient id="gateRail" x1="0" y1="0" x2="1" y2=".7">
      <stop stop-color="#9c8052"/><stop offset=".22" stop-color="#715a39"/><stop offset=".52" stop-color="#826945"/><stop offset=".82" stop-color="#5b472e"/><stop offset="1" stop-color="#443421"/>
    </linearGradient>
    <linearGradient id="gateSign" x1="0" y1="0" x2=".2" y2="1">
      <stop stop-color="#8b7147"/><stop offset=".5" stop-color="#6f5938"/><stop offset="1" stop-color="#4f3e28"/>
    </linearGradient>
    <filter id="woodNoise" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".018 .18" numOctaves="4" seed="21" result="n"/>
      <feColorMatrix in="n" type="matrix" values=".45 0 0 0 .2  0 .35 0 0 .16  0 0 .22 0 .1  0 0 0 .34 0" result="grain"/>
      <feBlend in="SourceGraphic" in2="grain" mode="multiply"/>
    </filter>
    <filter id="softShadow" x="-30%" y="-40%" width="170%" height="190%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="tinyShadow" x="-30%" y="-40%" width="170%" height="190%"><feGaussianBlur stdDeviation="1.6"/></filter>
  </defs>

  <!-- Long, soft shadow thrown back into the trail instead of a perfect oval. -->
  <path d="M37 204C104 198 169 191 241 181C292 174 337 174 379 181C315 194 260 203 204 213C137 224 83 224 35 218Z"
        fill="#211a11" opacity=".23" filter="url(#softShadow)"/>

  <!-- Uneven hand-set posts, intentionally not parallel. -->
  <path d="M26 18L45 14L48 194L43 216L25 222L20 204Z" fill="url(#gatePost)" stroke="#352a1d" stroke-width="1.5" filter="url(#woodNoise)"/>
  <path d="M354 25L374 29L369 207L365 219L349 212L351 190Z" fill="url(#gatePost)" stroke="#352a1d" stroke-width="1.5" filter="url(#woodNoise)"/>

  <!-- Rough rails with bowed / chipped edges. -->
  <path d="M42 55C118 56 204 58 356 63L354 82C247 78 147 75 43 75Z"
        fill="url(#gateRail)" stroke="#3e3020" stroke-width="1.7" filter="url(#woodNoise)"/>
  <path d="M43 140C132 138 239 141 352 148L352 166C250 162 145 159 44 161Z"
        fill="url(#gateRail)" stroke="#3e3020" stroke-width="1.7" filter="url(#woodNoise)"/>
  <path d="M54 157L330 72L341 87L64 172Z"
        fill="url(#gateRail)" stroke="#3b2d1d" stroke-width="1.7" filter="url(#woodNoise)"/>

  <!-- Sun-faded streaks, knots, splits, and darkened bottom ends. -->
  <g fill="none" stroke="#c1a06a" stroke-linecap="round" opacity=".16">
    <path d="M55 62C118 63 218 67 328 70"/><path d="M76 147C159 146 240 150 331 155"/><path d="M77 159L294 93"/>
    <path d="M31 47L35 187"/><path d="M362 53L359 179"/>
  </g>
  <g fill="#2f2519" opacity=".55">
    <ellipse cx="119" cy="67" rx="8" ry="3.8" transform="rotate(4 119 67)"/>
    <ellipse cx="280" cy="154" rx="7" ry="3.2" transform="rotate(4 280 154)"/>
    <ellipse cx="199" cy="119" rx="6" ry="2.8" transform="rotate(-17 199 119)"/>
  </g>
  <g stroke="#32271a" stroke-width="1.4" opacity=".55">
    <path d="M170 63l-10 8m14-7-6 8"/><path d="M248 149l-9 10m14-9-7 8"/><path d="M98 151l8 7"/>
  </g>
  <g fill="#33281b" opacity=".8">
    <path d="M21 191L47 190L43 216L25 222Z"/><path d="M351 189L370 190L369 207L365 219L349 212Z"/>
  </g>

  <!-- Old dark hardware: small and subdued rather than shiny new brackets. -->
  <g fill="#4f4a3e" stroke="#28261f" opacity=".85">
    <path d="M27 59L73 59L73 67L27 67Z"/><path d="M29 145L74 144L74 152L29 153Z"/><path d="M338 67L366 68L365 75L338 74Z"/>
  </g>
  <g fill="#24231d">
    <circle cx="34" cy="63" r="2"/><circle cx="66" cy="63" r="2"/><circle cx="36" cy="149" r="2"/><circle cx="67" cy="148" r="2"/><circle cx="360" cy="71" r="1.7"/>
  </g>

  <!-- Rustic trail-style construction marker, deliberately matched to the directional sign language. -->
  <g transform="rotate(-1.4 204 112)">
    <!-- Soft offset shadow so the sign feels attached to the gate, not pasted over it. -->
    <path d="M121 84L258 87L279 101L258 115L123 112L114 105L119 97L113 91Z"
          fill="#17120d" opacity=".38" filter="url(#tinyShadow)" transform="translate(4 5)"/>
    <path d="M137 113L270 112L280 121L271 130L141 135L122 126Z"
          fill="#17120d" opacity=".34" filter="url(#tinyShadow)" transform="translate(3 4)"/>

    <!-- Upper hand-cut arrow board. -->
    <path d="M118 80L258 83L282 99L258 115L120 111L111 105L117 97L110 91Z"
          fill="#6a452a" stroke="#2d1f14" stroke-width="2.1" filter="url(#woodNoise)"/>
    <path d="M124 86C162 83 213 87 256 89M122 103C160 100 210 104 258 107"
          fill="none" stroke="#c49b67" stroke-width="1.15" opacity=".24"/>
    <path d="M151 85l-10 9m61-7l-8 8m53-5l-8 8" fill="none" stroke="#2c1d12" stroke-width="1.3" opacity=".55"/>
    <ellipse cx="176" cy="96" rx="8" ry="3.4" transform="rotate(4 176 96)" fill="#2e2117" opacity=".62"/>
    <ellipse cx="232" cy="101" rx="5.5" ry="2.4" transform="rotate(-7 232 101)" fill="#2e2117" opacity=".52"/>
    <circle cx="128" cy="95" r="2.2" fill="#24221d"/><circle cx="259" cy="99" r="2.2" fill="#24221d"/>

    <!-- Lower hand-cut board, offset just like a stacked trail marker. -->
    <path d="M138 109L269 108L281 119L271 132L143 137L120 126Z"
          fill="#5d3d26" stroke="#2b1d13" stroke-width="2" filter="url(#woodNoise)"/>
    <path d="M143 116C179 114 226 115 266 115M142 129C184 127 227 126 267 125"
          fill="none" stroke="#bd9461" stroke-width="1.05" opacity=".22"/>
    <path d="M165 113l-7 8m55-8l-9 9m43-8l-7 8" fill="none" stroke="#2b1d13" stroke-width="1.25" opacity=".5"/>
    <ellipse cx="192" cy="124" rx="7" ry="3" transform="rotate(-3 192 124)" fill="#2d2016" opacity=".58"/>
    <circle cx="140" cy="124" r="2.1" fill="#24221d"/><circle cx="266" cy="120" r="2.1" fill="#24221d"/>

    <!-- Cream, carved-looking lettering with a faint dark cut shadow. -->
    <g text-anchor="middle" font-family="Georgia,serif" font-weight="bold" letter-spacing=".8">
      <text x="198.5" y="102.2" font-size="11.6" fill="#271b12" opacity=".78">NATURAL SPRINGS</text>
      <text x="197" y="100.8" font-size="11.6" fill="#e0c99b">NATURAL SPRINGS</text>
      <text x="204.5" y="127.7" font-size="9.2" fill="#271b12" opacity=".78">UNDER CONSTRUCTION</text>
      <text x="203" y="126.3" font-size="9.2" fill="#dec392">UNDER CONSTRUCTION</text>
    </g>
  </g>

  <!-- Forest-floor overlap to visually bury the posts in dirt/leaves instead of floating. -->
  <g opacity=".95">
    <path d="M7 219C17 209 24 208 31 216C37 207 45 207 54 218C46 222 33 225 18 224Z" fill="#514126"/>
    <path d="M337 216C348 208 355 207 363 214C371 205 381 209 390 219C376 223 357 224 340 222Z" fill="#4b3b24"/>
    <path d="M12 215l11-8 7 10 9-13 7 14m298-6 8-13 7 13 12-12 6 13" fill="none" stroke="#77623a" stroke-width="3" stroke-linecap="round"/>
    <g fill="#86683a">
      <ellipse cx="24" cy="218" rx="9" ry="3" transform="rotate(-28 24 218)"/>
      <ellipse cx="45" cy="220" rx="8" ry="2.8" transform="rotate(19 45 220)"/>
      <ellipse cx="354" cy="219" rx="9" ry="3" transform="rotate(-13 354 219)"/>
      <ellipse cx="378" cy="219" rx="8" ry="2.8" transform="rotate(25 378 219)"/>
    </g>
  </g>
  </svg>`;
  document.body.appendChild(gate);
  function positionGate(){
    // Plane x=.25.. .61, y=-.10..-.307, z=1; all points share the panorama camera.
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),k=.0009,f=innerHeight/(2*Math.tan(fov/2)),cx=innerWidth/2,hy=innerHeight/2;
    const X0=.25*cy-sy,Z0=.25*sy+cy,Y0=-.10*cp-Z0*sp,D0=-.10*sp+Z0*cp;
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
