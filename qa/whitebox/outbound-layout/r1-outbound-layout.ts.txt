import { SCENES } from '../game/content';
import { createGame } from '../game/model';
import type { GameState, SceneDefinition } from '../game/contracts';

// Geometry preflight only. Installing this map is restricted to this isolated
// test entry; the normal game entry never imports or installs it.
export const OUTBOUND_LAYOUT:SceneDefinition={
 id:'home',title:'山外出行 · 两岩背候选',subtitle:'先检查独行直达；尚无友方出手。',
 width:1400,height:1000,spawn:{x:480,y:660},
 palette:{ground:0xb6aa91,path:0xcbbda0,foliage:0x777d64,water:0x789eac},
 ground:[{type:'floor',points:[80,80,1320,80,1320,920,80,920]}],
 obstacles:[
  {x:40,y:40,w:1320,h:40},{x:40,y:920,w:1320,h:40},
  {x:40,y:80,w:40,h:840},{x:1320,y:80,w:40,h:840},
  {x:360,y:300,w:220,h:300},{x:760,y:300,w:220,h:300},
 ],
 entities:[
  {id:'outbound_guard',name:'路口散修',kind:'enemy',type:'raider',x:670,y:380,homeX:670,homeY:380,w:40,h:60,hp:3,state:'idle',data:{attack:0,seen:0,lastX:670,lastY:380}},
  {id:'outbound_traveler',name:'岑舟（未结伴）',kind:'npc',type:'outbound-traveler',x:520,y:660,w:40,h:60,hp:3,state:'idle',data:{mana:1}},
 ],
};

export function installOutboundLayout():()=>void{
 const previous=SCENES.home;SCENES.home=OUTBOUND_LAYOUT;
 return()=>{SCENES.home=previous;};
}

export function createOutboundLayout(mana:0|6):GameState{
 if(SCENES.home!==OUTBOUND_LAYOUT)throw Error('Install the isolated geometry candidate first');
 if(mana!==0&&mana!==6)throw Error('Use one of the two public initial resource conditions');
 const s=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});
 s.worlds.home=structuredClone(OUTBOUND_LAYOUT.entities);
 s.player.x=480;s.player.y=660;s.player.hp=4;s.player.mana=mana;
 s.player.path=[];s.player.pullId=null;s.player.pullPoint=null;
 s.ringStyle='hold';s.herbs=0;s.events=[];s.flags={eventSeq:0,companion:'waiting'};
 s.checkpoint=null;s.lastSafe={scene:'home',point:{x:260,y:760}};
 return s;
}
