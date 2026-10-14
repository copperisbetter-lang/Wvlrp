/** Jenny's first quest: The Woodland Discovery Trail.
 * Pure quest state; no placeholder avatar, no premature NPC spawning.
 * The world should activate this only when the finished Jenny GLB and animation
 * clips (idle/walk/run/pickup) are verified and loaded successfully.
 */
export const JENNY_QUEST = Object.freeze({
 id:'jenny-woodland-discovery-01',
 title:'The Woodland Discovery Trail',
 start:{site:'Ranger Station',x:93,z:77},
 steps:[
  {id:'meet',title:'Meet Jenny at the Ranger Station',action:'talk'},
  {id:'trail',title:'Follow Jenny along the woodland trail',action:'follow'},
  {id:'oak',title:'Identify a native oak tree',action:'identify',species:'oak'},
  {id:'maple',title:'Identify a native maple tree',action:'identify',species:'maple'},
  {id:'return',title:'Return to the Ranger Station',action:'return'}
 ]
});
export function newJennyQuestState(){return {questId:JENNY_QUEST.id,step:0,complete:false};}
export function advanceJennyQuest(state,action,species){
 if(!state||state.questId!==JENNY_QUEST.id||state.complete)return state;
 const step=JENNY_QUEST.steps[state.step];
 if(!step||step.action!==action||(step.species&&step.species!==species))return state;
 const next=state.step+1;
 return {questId:JENNY_QUEST.id,step:next,complete:next>=JENNY_QUEST.steps.length};
}
export function validateJennyAnimations(clipNames){
 const names=(clipNames||[]).map(x=>String(x).toLowerCase());
 return ['idle','walk','run','pickup'].every(k=>names.some(n=>n.includes(k)));
}
