(()=>{const h=document.getElementById('hatch-roamer');if(!h)return;
const s=document.createElement('style');s.id='hatch-roamer-approved-fix';s.textContent=`
#hatch-roamer{width:132px!important;height:88px!important;background-image:var(--hatch-mascot)!important;background-size:contain!important;background-position:center!important;background-repeat:no-repeat!important;filter:drop-shadow(0 5px 5px #0008)!important;transform-origin:50% 55%!important}
#hatch-roamer i{display:none!important}
#hatch-roamer.run{animation:hatchApprovedScurry .22s steps(2,end) infinite!important}
#hatch-roamer.left{transform:scaleX(-1)}
#hatch-roamer.laugh{animation:hatchApprovedRoll .62s ease-out forwards!important}
#hatch-roamer.getup{animation:hatchApprovedGetup .5s ease-in forwards!important}
@keyframes hatchApprovedScurry{0%,100%{margin-top:0}25%{margin-top:-2px}50%{margin-top:1px}75%{margin-top:-1px}}
@keyframes hatchApprovedRoll{0%{transform:rotate(0deg) scaleY(1)}45%{transform:rotate(-90deg) scaleY(.92)}75%{transform:rotate(-178deg) scaleY(.9)}100%{transform:rotate(-180deg) scaleY(1)}}
@keyframes hatchApprovedGetup{0%{transform:rotate(-180deg)}100%{transform:rotate(-360deg)}}
@media(max-width:600px){#hatch-roamer{width:116px!important;height:78px!important}}
`;document.head.appendChild(s);
})();