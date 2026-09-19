(()=>{
const API='https://wvlrp-chat-production.up.railway.app';
const path=location.pathname.toLowerCase();
const room=path.includes('roost')?'roost':path.includes('east-bank')?'eastbank':'';
const names={eastbank:'East Bank',roost:'The Roost',westbank:'West Bank',southhill:'South Hill',infrared:'Infrared'};
if(!room)return;
const video=document.querySelector('video');
const anchor=document.querySelector('.player-shell,.video-wrap');
if(!video||!anchor)return;
const safe=s=>(s??'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style=document.createElement('style');
style.textContent=`
.hatch-alert-zone{width:100%;margin:0 0 10px;font-family:Arial,sans-serif;color:#fff;position:relative;z-index:12}
.hatch-alert{display:none;align-items:center;gap:10px;padding:9px 11px;border:1px solid #ffffff36;border-radius:14px;background:linear-gradient(135deg,#153421f5,#07140ff5);box-shadow:0 12px 28px #0009}
.hatch-alert.show{display:flex;animation:hatch-arrive .32s ease-out}@keyframes hatch-arrive{from{opacity:0;transform:translateY(-7px)}to{opacity:1;transform:none}}
.hatch-face{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;background:#d9b33f;color:#102010;border:2px solid #fff7b8;font-size:22px;box-shadow:0 0 0 3px #183b26}
.hatch-shot{display:none;width:112px;aspect-ratio:16/9;object-fit:cover;border-radius:9px;border:1px solid #ffffff45;background:#020806}
.hatch-alert[data-rich="true"] .hatch-shot{display:block}.hatch-copy{min-width:0;flex:1}.hatch-copy b{display:block;color:#ffe283;font-size:11px;letter-spacing:.1em}.hatch-copy strong{display:block;margin-top:3px;font-size:14px}.hatch-copy small{display:block;margin-top:2px;color:#c9d8cf;font-size:10px}
.hatch-dismiss{border:0;background:#ffffff0d;color:#dfe9e3;width:28px;height:28px;border-radius:50%;cursor:pointer}
.hatch-tools{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;width:100%;margin:8px 0 0;font-family:Arial,sans-serif}
.hatch-tools button{border:1px solid #ffffff2b;background:#10291e;color:#fff;border-radius:999px;padding:9px 12px;font-weight:900;font-size:10px;letter-spacing:.05em;cursor:pointer}
.hatch-tools button:hover{background:#183c2a}.hatch-tools .hatch-interaction.on{background:#755d22;color:#fff1b5}
.hatch-status{width:100%;text-align:center;min-height:14px;color:#d2ded6;font-size:10px}
@media(max-width:620px){.hatch-alert{align-items:flex-start}.hatch-alert[data-rich="true"]{display:grid;grid-template-columns:38px 92px 1fr 28px}.hatch-shot{width:92px}.hatch-copy strong{font-size:12px}}
`;
document.head.appendChild(style);
const zone=document.createElement('div');zone.className='hatch-alert-zone';
zone.innerHTML='<div class="hatch-alert" role="status" aria-live="polite"><span class="hatch-face" aria-hidden="true">🐊</span><img class="hatch-shot" alt=""><span class="hatch-copy"><b>HATCH SPOTTED SOMETHING</b><strong></strong><small></small></span><button class="hatch-dismiss" aria-label="Dismiss">×</button></div>';
anchor.parentNode.insertBefore(zone,anchor);
const tools=document.createElement('div');tools.className='hatch-tools';
tools.innerHTML='<button class="hatch-capture">📸 SHOW HATCH A SIGHTING</button><button class="hatch-interaction" aria-pressed="true">🐊 INTERACTION ON</button><div class="hatch-status"></div>';
anchor.insertAdjacentElement('afterend',tools);
const alert=zone.querySelector('.hatch-alert'),shot=zone.querySelector('.hatch-shot'),title=zone.querySelector('strong'),meta=zone.querySelector('small'),status=tools.querySelector('.hatch-status'),toggle=tools.querySelector('.hatch-interaction');
let interaction=localStorage.getItem('wvlrpHatchInteraction')!=='off';
let last=Number(sessionStorage.getItem('wvlrpHatchLastSighting')||0);
let dismissTimer=0;
function syncToggle(){toggle.classList.toggle('on',interaction);toggle.textContent=interaction?'🐊 INTERACTION ON':'🐊 INTERACTION OFF';toggle.setAttribute('aria-pressed',String(interaction))}
syncToggle();
toggle.onclick=()=>{interaction=!interaction;localStorage.setItem('wvlrpHatchInteraction',interaction?'on':'off');syncToggle()};
zone.querySelector('.hatch-dismiss').onclick=()=>alert.classList.remove('show');
function cameraName(id){return names[id]||id.replace(/(^|[-_])(\w)/g,(_,a,b)=>' '+b.toUpperCase()).trim()}
function show(item){clearTimeout(dismissTimer);const rich=interaction&&!!item.image_data;alert.dataset.rich=String(rich);shot.src=rich?item.image_data:'';title.textContent=item.label||'Wildlife activity';meta.textContent='Seen on '+cameraName(item.room)+' • tap that camera to take a look';alert.classList.add('show');alert.style.cursor='pointer';alert.onclick=e=>{if(e.target.closest('.hatch-dismiss'))return;const urls={eastbank:'east-bank.html',roost:'the-roost.html',westbank:'west-bank.html',southhill:'south-hill.html',infrared:'infrared-camera.html'};if(urls[item.room])location.href=urls[item.room]};dismissTimer=setTimeout(()=>alert.classList.remove('show'),interaction?18000:9000)}
async function poll(){try{const r=await fetch(API+'/api/hatch/sightings/latest?after='+last+'&exclude_room='+encodeURIComponent(room),{cache:'no-store'});if(!r.ok)return;const j=await r.json();for(const item of j.sightings||[]){last=Math.max(last,Number(item.id)||0);show(item)}sessionStorage.setItem('wvlrpHatchLastSighting',String(last))}catch{}}
function frame(){try{const max=640,scale=Math.min(1,max/(video.videoWidth||max)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((video.videoWidth||640)*scale));canvas.height=Math.max(1,Math.round((video.videoHeight||360)*scale));canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.72)}catch{return null}}
async function postSighting(label,image){const token=localStorage.getItem('wvlrpChatToken')||'';if(!token)throw Error('Sign in to WVLRP chat first so Hatch knows who submitted it.');const r=await fetch(API+'/api/hatch/sighting',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({room,label,note:'Live viewer screenshot',image_data:image})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.detail||'Hatch could not save that sighting.');return j}
tools.querySelector('.hatch-capture').onclick=async()=>{if(video.readyState<2){status.textContent='The live picture is not ready yet.';return}const label=prompt('What did you see? Example: white-tailed deer, raccoon, fox, or turkey.');if(!label)return;status.textContent='Hatch is capturing the live frame…';const image=frame();try{const j=await postSighting(label.trim(),image);status.textContent=j.message||'Hatch shared it with the other cameras.';setTimeout(()=>status.textContent='',7000)}catch(e){status.textContent=e.message}};
poll();setInterval(poll,4000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});
})();