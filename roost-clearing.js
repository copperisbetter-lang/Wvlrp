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
  gate.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 310" width="490" height="310" aria-hidden="true">
    <defs>
      <linearGradient id="pL" x1="0" y1="0" x2="1" y2=".25"><stop stop-color="#342719"/><stop offset=".15" stop-color="#806444"/><stop offset=".42" stop-color="#9b7a51"/><stop offset=".72" stop-color="#60482f"/><stop offset="1" stop-color="#2f2419"/></linearGradient>
      <linearGradient id="pR" x1="1" y1="0" x2="0" y2=".3"><stop stop-color="#2d2217"/><stop offset=".2" stop-color="#6f5539"/><stop offset=".52" stop-color="#96744d"/><stop offset=".8" stop-color="#59432d"/><stop offset="1" stop-color="#2b2117"/></linearGradient>
      <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3a2a1b"/><stop offset=".16" stop-color="#8b6743"/><stop offset=".48" stop-color="#9a7550"/><stop offset=".78" stop-color="#5b422c"/><stop offset="1" stop-color="#302319"/></linearGradient>
      <linearGradient id="board" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#4b2e1b"/><stop offset=".3" stop-color="#70472b"/><stop offset=".62" stop-color="#5e3922"/><stop offset="1" stop-color="#382417"/></linearGradient>
      <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency=".015 .22" numOctaves="5" seed="33" result="n"/>
        <feColorMatrix in="n" type="matrix" values=".72 0 0 0 .08  0 .55 0 0 .05  0 0 .36 0 .03  0 0 0 .32 0" result="g"/>
        <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
      </filter>
      <filter id="shadow" x="-25%" y="-35%" width="160%" height="180%"><feGaussianBlur stdDeviation="4.5"/></filter>
      <filter id="textShadow" x="-20%" y="-40%" width="150%" height="190%"><feGaussianBlur stdDeviation="1.1"/></filter>
    </defs>

    <!-- ground shadow -->
    <path d="M18 267C89 251 170 248 251 250C331 251 408 254 478 269C408 286 333 293 247 292C159 293 82 287 15 274Z" fill="#17110c" opacity=".33" filter="url(#shadow)"/>

    <!-- heavy, weathered posts -->
    <path d="M30 28C38 23 54 23 63 29L66 250L59 274L37 281L27 264Z" fill="url(#pL)" stroke="#281d14" stroke-width="2.2" filter="url(#grain)"/>
    <path d="M423 35C432 29 449 29 458 36L461 257L454 276L432 273L419 257Z" fill="url(#pR)" stroke="#281d14" stroke-width="2.2" filter="url(#grain)"/>

    <!-- top rail, bowed slightly like the accepted sign -->
    <path d="M46 77C142 73 257 78 443 82L445 117C322 111 180 108 45 111Z" fill="url(#rail)" stroke="#2a1e14" stroke-width="2.4" filter="url(#grain)"/>
    <!-- lower rail -->
    <path d="M52 194C170 190 305 193 437 201L438 232C316 224 181 222 52 226Z" fill="url(#rail)" stroke="#2a1e14" stroke-width="2.4" filter="url(#grain)"/>

    <!-- sun checking, splits and knots -->
    <g fill="none" stroke="#c4a073" stroke-linecap="round" opacity=".23">
      <path d="M63 88C151 83 252 91 423 94"/><path d="M69 101C167 98 274 102 420 106"/>
      <path d="M70 207C174 203 294 207 420 214"/><path d="M75 218C190 214 306 217 415 222"/>
      <path d="M39 52L45 236"/><path d="M53 45L57 244"/><path d="M438 55L439 243"/><path d="M451 49L449 248"/>
    </g>
    <g fill="#241a12" opacity=".72">
      <ellipse cx="142" cy="94" rx="11" ry="4.3" transform="rotate(2 142 94)"/>
      <ellipse cx="337" cy="98" rx="9" ry="3.7" transform="rotate(-4 337 98)"/>
      <ellipse cx="282" cy="214" rx="10" ry="3.7" transform="rotate(3 282 214)"/>
      <ellipse cx="93" cy="212" rx="8" ry="3.2" transform="rotate(-5 93 212)"/>
    </g>
    <g stroke="#2a1d13" stroke-width="2" opacity=".75" stroke-linecap="round">
      <path d="M195 84l-14 14m22-13-9 12"/><path d="M373 88l-11 13m18-11-7 11"/>
      <path d="M229 201l-13 15m21-14-8 13"/><path d="M119 199l10 11"/>
    </g>

    <!-- old blackened hardware and bolts -->
    <g fill="#39352d" stroke="#1b1915" stroke-width="1.7">
      <rect x="34" y="84" width="51" height="12" rx="2"/><rect x="407" y="89" width="46" height="12" rx="2"/>
      <rect x="38" y="203" width="50" height="12" rx="2"/><rect x="404" y="208" width="47" height="12" rx="2"/>
    </g>
    <g fill="#211f1a" stroke="#665f50" stroke-width="1">
      <circle cx="45" cy="90" r="5"/><circle cx="76" cy="90" r="4.4"/><circle cx="417" cy="95" r="4.6"/><circle cx="442" cy="95" r="4.4"/>
      <circle cx="48" cy="209" r="4.6"/><circle cx="78" cy="209" r="4.3"/><circle cx="415" cy="214" r="4.5"/><circle cx="441" cy="214" r="4.2"/>
    </g>

    <!-- exact two-board construction marker proportions from the accepted mockup -->
    <g transform="rotate(.35 245 156)">
      <path d="M119 113L343 116L384 140L344 164L118 160L95 143Z" fill="#16100b" opacity=".45" filter="url(#textShadow)" transform="translate(4 6)"/>
      <path d="M127 161L349 165L376 187L349 209L128 205L105 185Z" fill="#16100b" opacity=".42" filter="url(#textShadow)" transform="translate(4 5)"/>

      <path d="M116 107L343 110L387 136L344 160L116 156L92 139Z" fill="url(#board)" stroke="#24160f" stroke-width="2.5" filter="url(#grain)"/>
      <path d="M126 155L349 159L378 183L349 205L126 201L102 181Z" fill="url(#board)" stroke="#24160f" stroke-width="2.5" filter="url(#grain)"/>

      <g fill="none" stroke="#bd9464" stroke-width="1.35" opacity=".25">
        <path d="M128 118C188 115 260 121 340 120"/><path d="M127 146C191 142 270 148 341 149"/>
        <path d="M139 168C207 166 282 170 344 170"/><path d="M138 193C213 190 286 194 346 193"/>
      </g>
      <g fill="#241811" opacity=".7">
        <ellipse cx="176" cy="132" rx="10" ry="3.7" transform="rotate(5 176 132)"/>
        <ellipse cx="317" cy="142" rx="8" ry="3.1" transform="rotate(-6 317 142)"/>
        <ellipse cx="211" cy="184" rx="8.5" ry="3.2" transform="rotate(-2 211 184)"/>
      </g>
      <g fill="#24211b" stroke="#0f0e0b" stroke-width=".8">
        <circle cx="122" cy="137" r="3.1"/><circle cx="347" cy="137" r="3.1"/>
        <circle cx="132" cy="181" r="3"/><circle cx="350" cy="183" r="3"/>
      </g>

      <g text-anchor="middle" font-family="Georgia,serif" font-weight="bold" letter-spacing="1">
        <text x="243" y="141" font-size="21" fill="#24150e" opacity=".95" transform="translate(1.6 1.8)">NATURAL SPRINGS</text>
        <text x="241.5" y="139.4" font-size="21" fill="#ead3a6">NATURAL SPRINGS</text>
        <text x="244" y="188" font-size="16.5" fill="#24150e" opacity=".95" transform="translate(1.5 1.7)">UNDER CONSTRUCTION</text>
        <text x="242.5" y="186.4" font-size="16.5" fill="#e7c99a">UNDER CONSTRUCTION</text>
      </g>
    </g>

    <!-- darkened buried ends plus moss/leaf overlap -->
    <path d="M29 236L66 236L59 274L37 281L27 264Z" fill="#2d251a" opacity=".86"/>
    <path d="M420 239L460 239L454 276L432 273L419 257Z" fill="#2a2218" opacity=".86"/>
    <g fill="#45502f" opacity=".95">
      <path d="M15 270C25 251 35 247 45 264C50 248 63 250 69 268C61 278 28 282 15 270Z"/>
      <path d="M409 268C417 251 428 249 438 264C445 248 457 252 468 269C457 278 424 279 409 268Z"/>
    </g>
    <g fill="#7a5a33" opacity=".95">
      <ellipse cx="26" cy="274" rx="12" ry="4" transform="rotate(-24 26 274)"/><ellipse cx="58" cy="275" rx="10" ry="3.5" transform="rotate(18 58 275)"/>
      <ellipse cx="420" cy="274" rx="11" ry="3.7" transform="rotate(-18 420 274)"/><ellipse cx="456" cy="274" rx="11" ry="3.7" transform="rotate(20 456 274)"/>
    </g>
  </svg>`;
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
