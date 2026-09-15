(()=>{
  const script=document.currentScript;
  const cam=(script?.dataset.camera||'').trim();
  if(!cam)return;

  const media=document.querySelector('.player-shell,.player,.video-wrap');
  if(!media)return;

  const style=document.createElement('style');
  style.textContent=`
    .viewer-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:10px;padding:9px 10px;border-radius:14px;background:#071713;border:1px solid rgba(255,255,255,.16)}
    .viewer-bar .live-bug,.viewer-bar .livebug,.viewer-bar .corner-brand,.viewer-bar .brandbug,.viewer-bar .controls{position:static!important;inset:auto!important;display:flex!important;opacity:1!important;background:none!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;padding:0!important;margin:0!important}
    .viewer-bar .live-bug,.viewer-bar .livebug{align-items:center;gap:7px;font-size:10px;font-weight:900;letter-spacing:.1em}
    .viewer-bar .corner-brand,.viewer-bar .brandbug{font-size:9px;font-weight:900;letter-spacing:.12em;color:#b8c8bf}
    .viewer-bar .controls{margin-left:auto!important;gap:7px!important}
    .viewer-bar .control,.viewer-bar .controls button{height:36px;min-width:38px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.18)!important;background:#132d22!important;color:#fff!important;display:grid!important;place-items:center;font-weight:900}
    .viewer-count{display:flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:#132d22;border:1px solid rgba(255,255,255,.24);color:#fff;font:900 10px/1 Arial,sans-serif;letter-spacing:.08em;white-space:nowrap}
    .viewer-count .eye{font-size:13px;letter-spacing:0}.viewer-count .num{font-size:11px}.viewer-count.offline{opacity:.65}
    .wvlrp-support-mini{display:inline-flex!important;align-items:center!important;justify-content:center!important;margin:10px auto 0!important;padding:7px 11px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.22)!important;background:rgba(255,255,255,.06)!important;color:#dfe8e3!important;text-decoration:none!important;font:800 10px/1 Arial,sans-serif!important;letter-spacing:.04em!important;box-shadow:none!important}
    .wvlrp-support-mini:hover{background:rgba(255,255,255,.11)!important;color:#fff!important}
    @media(max-width:620px){.viewer-bar{justify-content:center}.viewer-bar .controls{margin-left:0!important}.viewer-bar .corner-brand,.viewer-bar .brandbug{width:100%;justify-content:center}.wvlrp-support-mini{font-size:9px!important;padding:7px 10px!important}}
  `;
  document.head.appendChild(style);

  const sponsor=document.querySelector('.sponsor');
  if(sponsor){
    let support=sponsor.querySelector('a[href*="cash.app"]');
    if(!support){
      support=document.createElement('a');
      support.href='https://cash.app/$DougHiffman';
      support.target='_blank';
      support.rel='noopener';
      const firstP=sponsor.querySelector('p');
      if(firstP)firstP.insertAdjacentElement('afterend',support);else sponsor.appendChild(support);
    }
    support.classList.add('wvlrp-support-mini');
    support.textContent='Support WVLRP · Cash App';
  }

  let bar=document.querySelector('.viewer-bar');
  if(!bar){
    bar=document.createElement('div');
    bar.className='viewer-bar';
    media.insertAdjacentElement('afterend',bar);
  }

  const live=document.querySelector('.live-bug,.livebug');
  const brand=document.querySelector('.corner-brand,.brandbug');
  const controls=document.querySelector('.controls');
  if(live)bar.appendChild(live);
  if(brand)bar.appendChild(brand);
  if(controls)bar.appendChild(controls);

  const badge=document.createElement('div');
  badge.className='viewer-count offline';
  badge.innerHTML='<span class="eye">◉</span><span class="num">—</span><span>VIEWERS</span>';
  bar.appendChild(badge);
  const num=badge.querySelector('.num');

  const endpoint='https://wvlrp-production.up.railway.app/presence';
  const sid=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
  let timer=null;

  async function beat(){
    if(document.hidden)return;
    try{
      const r=await fetch(`${endpoint}/heartbeat?cam=${encodeURIComponent(cam)}&id=${encodeURIComponent(sid)}`,{method:'POST',cache:'no-store'});
      if(!r.ok)throw new Error();
      const j=await r.json();
      num.textContent=String(j.viewers??0);
      badge.classList.remove('offline');
    }catch{badge.classList.add('offline')}
  }
  function start(){clearInterval(timer);beat();timer=setInterval(beat,15000)}
  function leave(){clearInterval(timer);timer=null;fetch(`${endpoint}/leave?cam=${encodeURIComponent(cam)}&id=${encodeURIComponent(sid)}`,{method:'POST',keepalive:true,cache:'no-store'}).catch(()=>{})}
  document.addEventListener('visibilitychange',()=>document.hidden?leave():start());
  window.addEventListener('pagehide',leave);
  start();

  const chatRoom=cam==='east-bank'?'eastbank':cam==='roost'?'roost':'';
  if(chatRoom){
    const host=document.createElement('div');
    host.id='wvlrp-chat-'+chatRoom;
    bar.insertAdjacentElement('afterend',host);
    const chat=document.createElement('script');
    chat.src='chat-widget.js?v=20260915-1';
    chat.dataset.room=chatRoom;
    chat.dataset.target='#'+host.id;
    chat.dataset.api='https://wvlrp-chat-production.up.railway.app';
    document.body.appendChild(chat);
  }
})();
