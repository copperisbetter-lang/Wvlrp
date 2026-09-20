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
const assistantStyle=document.createElement('style');
assistantStyle.textContent=`
.hatch-launcher{position:fixed;right:14px;bottom:18px;z-index:2147483000;width:64px;height:64px;border-radius:50%;border:3px solid #fff1a8;background:linear-gradient(145deg,#8bbb47,#315e2f);color:#fff;box-shadow:0 10px 28px #000b,0 0 0 4px #173b25;display:grid;place-items:center;font-size:31px;cursor:pointer}
.hatch-launcher span{position:absolute;right:-2px;top:-5px;background:#ffd86c;color:#19351e;border:2px solid #fff6c7;border-radius:999px;padding:3px 6px;font:900 9px Arial;letter-spacing:.04em}
.hatch-panel{position:absolute;left:0;top:calc(100% + 48px);z-index:20;width:100%;margin:0;max-height:none;display:none;flex-direction:column;border-radius:20px;overflow:hidden;background:#06130e;border:1px solid #ffffff3b;box-shadow:0 22px 58px #000d;color:#fff;font-family:Arial,sans-serif}
.hatch-panel.open{display:flex}
.hatch-head{display:flex;align-items:center;gap:10px;padding:13px;background:linear-gradient(135deg,#376f38,#173b25);border-bottom:1px solid #ffffff2b}.hatch-head .face{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#e4c450;border:2px solid #fff4af;font-size:25px}.hatch-head b{display:block;color:#fff6bb}.hatch-head small{display:block;color:#d7e8d8;margin-top:2px}.hatch-close{margin-left:auto;border:0;background:#ffffff17;color:#fff;width:32px;height:32px;border-radius:50%;font-size:20px}
.hatch-messages{padding:12px;overflow:auto;display:flex;flex-direction:column;gap:9px;min-height:180px}.hatch-msg{max-width:86%;padding:9px 11px;border-radius:14px;font-size:13px;line-height:1.4}.hatch-msg.bot{align-self:flex-start;background:#173a29;border:1px solid #ffffff17}.hatch-msg.user{align-self:flex-end;background:#725b25;border:1px solid #ffe18644}
.hatch-quick{display:flex;gap:6px;overflow-x:auto;padding:0 10px 9px}.hatch-quick button{white-space:nowrap;border:1px solid #ffffff26;background:#10291e;color:#fff;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800}
.hatch-form{display:grid;grid-template-columns:1fr auto;gap:7px;padding:10px;border-top:1px solid #ffffff1d;background:#030b08}.hatch-form input{min-width:0;border:1px solid #ffffff2c;border-radius:12px;background:#0a1c14;color:#fff;padding:11px;font-size:14px}.hatch-form button{border:0;border-radius:12px;background:#d2ad43;color:#18331e;font-weight:1000;padding:0 14px}
@media(max-width:620px){.hatch-launcher{right:12px;bottom:14px;width:60px;height:60px}.hatch-panel{left:0;top:calc(100% + 44px);width:100%;margin:0;max-height:none}}
`;
document.head.appendChild(assistantStyle);
const launcher=document.createElement('button');launcher.className='hatch-launcher';launcher.type='button';launcher.setAttribute('aria-label','Open Hatch assistant');launcher.innerHTML='🐊<span>HATCH</span>';
const panel=document.createElement('section');panel.className='hatch-panel';panel.setAttribute('aria-label','Hatch wildlife assistant');panel.innerHTML='<div class="hatch-head"><div class="face">🐊</div><div><b>Hatch</b><small>WVLRP wildlife helper</small></div><button class="hatch-close" aria-label="Close Hatch">×</button></div><div class="hatch-messages" aria-live="polite"><div class="hatch-msg bot">Hey there! I’m Hatch. Ask me about the animals, The Roost, or what you’re seeing on camera.</div></div><div class="hatch-quick"><button data-q="What can I see here?">What can I see?</button><button data-q="Tell me about The Roost">The Roost</button><button data-q="How do I report an animal?">Report a sighting</button></div><form class="hatch-form"><input maxlength="240" placeholder="Ask Hatch something…" aria-label="Question for Hatch"><button type="submit">SEND</button></form>';
document.body.append(launcher);
const messages=panel.querySelector('.hatch-messages'),askInput=panel.querySelector('input');
function addMessage(text,kind){const m=document.createElement('div');m.className='hatch-msg '+kind;m.textContent=text;messages.appendChild(m);messages.scrollTop=messages.scrollHeight}
function hatchReply(q){const s=q.toLowerCase();if(/roost|chicken|hen|rooster/.test(s))return 'The Roost is WVLRP’s live chicken camera. You can watch the flock, hear their radio, and sometimes spot wildlife passing nearby.';if(/see|animal|wildlife|watch/.test(s))return 'Around WVLRP you may see white-tailed deer, raccoons, foxes, squirrels, rabbits, wild turkeys, songbirds, and plenty of chickens here at The Roost.';if(/report|sighting|picture|photo|capture/.test(s))return 'Use “SHOW HATCH A SIGHTING” below the camera. Sign in first, name what you saw, and I’ll capture the live frame.';if(/sound|hear|audio/.test(s))return 'Turn on the speaker below the Roost video. Sound identification is planned, but I can’t listen to the live audio yet.';if(/hello|hey|hi\b/.test(s))return 'Hey! I’m Hatch, WVLRP’s little wildlife helper. What would you like to know?';return 'I’m still learning. I can help with WVLRP animals, The Roost, live-camera controls, and reporting a sighting. More of my AI abilities are coming next.'}
function ask(q){q=(q||'').trim();if(!q)return;addMessage(q,'user');askInput.value='';setTimeout(()=>addMessage(hatchReply(q),'bot'),250)}
launcher.onclick=()=>{panel.classList.toggle('open');if(panel.classList.contains('open'))setTimeout(()=>askInput.focus(),100)};
panel.querySelector('.hatch-close').onclick=()=>panel.classList.remove('open');
panel.querySelectorAll('.hatch-quick button').forEach(b=>b.onclick=()=>ask(b.dataset.q));
panel.querySelector('.hatch-form').onsubmit=e=>{e.preventDefault();ask(askInput.value)};
const zone=document.createElement('div');zone.className='hatch-alert-zone';
zone.innerHTML='<div class="hatch-alert" role="status" aria-live="polite"><span class="hatch-face" aria-hidden="true">🐊</span><img class="hatch-shot" alt=""><span class="hatch-copy"><b>HATCH SPOTTED SOMETHING</b><strong></strong><small></small></span><button class="hatch-dismiss" aria-label="Dismiss">×</button></div>';
anchor.parentNode.insertBefore(zone,anchor);
const tools=document.createElement('div');tools.className='hatch-tools';
tools.innerHTML='<button class="hatch-capture">📸 SHOW HATCH A SIGHTING</button><button class="hatch-interaction" aria-pressed="true">🐊 INTERACTION ON</button><div class="hatch-status"></div>';
anchor.insertAdjacentElement('afterend',tools);anchor.appendChild(panel);
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