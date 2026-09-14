(()=>{
  const script=document.currentScript;
  const cam=(script?.dataset.camera||'').trim();
  if(!cam)return;
  const target=document.querySelector('.viewer-bar,.player-tools,.roost-tools,.player-shell,.player,.video-wrap');
  if(!target)return;
  const style=document.createElement('style');
  style.textContent='.viewer-count{display:flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:#132d22;border:1px solid rgba(255,255,255,.24);color:#fff;font:900 10px/1 Arial,sans-serif;letter-spacing:.08em;white-space:nowrap}.viewer-count .eye{font-size:13px;letter-spacing:0}.viewer-count .num{font-size:11px}.viewer-count.offline{opacity:.65}';
  document.head.appendChild(style);
  const badge=document.createElement('div');
  badge.className='viewer-count offline';
  badge.innerHTML='<span class="eye">◉</span><span class="num">—</span><span>VIEWERS</span>';
  target.appendChild(badge);
  const num=badge.querySelector('.num');
  const endpoint='https://wvlrp-production.up.railway.app/presence';
  const sid=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
  let timer=null;
  async function beat(){if(document.hidden)return;try{const r=await fetch(`${endpoint}/heartbeat?cam=${encodeURIComponent(cam)}&id=${encodeURIComponent(sid)}`,{method:'POST',cache:'no-store'});if(!r.ok)throw new Error();const j=await r.json();num.textContent=String(j.viewers??0);badge.classList.remove('offline')}catch{badge.classList.add('offline')}}
  function start(){clearInterval(timer);beat();timer=setInterval(beat,15000)}
  function leave(){clearInterval(timer);timer=null;fetch(`${endpoint}/leave?cam=${encodeURIComponent(cam)}&id=${encodeURIComponent(sid)}`,{method:'POST',keepalive:true,cache:'no-store'}).catch(()=>{})}
  document.addEventListener('visibilitychange',()=>document.hidden?leave():start());
  window.addEventListener('pagehide',leave);
  start();
})();
