import type {GameState,Spell,Vec,Entity} from './contracts';
export interface PlayerPose {action:'idle'|'walk'|'cast'|'pull'|'gather'|'press'|'hurt';x:number;y:number;angle:number;scaleY:number;flipX:boolean;}
/** Presentation only: model time and real action progress drive every pose. */
export function playerPose(s:GameState,moving:boolean,step:number,reduced:boolean,hurtAge:number|null=null):PlayerPose{
 const p=s.player,pick=s.life.harvest.picking,work=s.canal.work;
 const target=work?s.worlds[s.scene].find(e=>e.id===(work.kind==='clear'?'canal_screen':'canal_diverter')):pick?s.worlds[s.scene].find(e=>e.id===pick.id):s.life.repair.testing!==null?s.worlds[s.scene].find(e=>e.id==='life_press'):undefined;
 const side=target?Math.sign(target.x-p.x)||1:Math.cos(p.facing)<0?-1:1;
 const action:PlayerPose['action']=hurtAge!==null?'hurt':pick||work?.kind==='clear'?'gather':s.life.repair.testing!==null||work?'press':s.flags.casting?'cast':p.pullId&&p.hold<=0?'pull':moving?'walk':'idle';
 const pose:PlayerPose={action,x:0,y:5,angle:0,scaleY:1,flipX:side<0};
 if(reduced)return pose;
 if(action==='gather'){const elapsed=pick?.elapsed??work!.elapsed,ease=Math.min(1,elapsed/.2);pose.angle=side*(9+Math.sin(elapsed*9)*1.2)*ease;pose.scaleY=1-.045*ease;}
 if(action==='press'){const q=s.life.repair.testing??work!.elapsed/2;pose.angle=side*(5+Math.sin(Math.PI*q)*6);pose.scaleY=1-.025*Math.sin(Math.PI*q);}
 if(action==='cast')pose.angle=-side*7;
 if(action==='pull')pose.angle=-side*3;
 if(action==='walk'){pose.angle=Math.sin(step)*1.6;pose.y-=Math.abs(Math.sin(step*2))*1.6;}
 if(action==='hurt'){const kick=Math.sin(Math.PI*Math.min(1,hurtAge!/240))*9;pose.x=-Math.cos(p.facing)*kick;pose.y-=Math.sin(p.facing)*kick;pose.angle=-side*kick*.8;}
 return pose;
}
export interface LabelBox {id:string;x:number;y:number;w:number;h:number;priority:number;}
/** Keep nearest/focused names at their original anchors; suppress colliding names. */
export function visibleLabels(boxes:LabelBox[]):string[]{
 const selected:LabelBox[]=[];
 for(const box of [...boxes].sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id))){
  if(!selected.some(other=>box.x<other.x+other.w+4&&box.x+box.w+4>other.x&&box.y<other.y+other.h+3&&box.y+box.h+3>other.y))selected.push(box);
 }
 return selected.map(b=>b.id);
}

/** Selecting a prop grasps its actual anchor; the next ground input chooses its landing. */
export function castTargetPoint(spell:Spell,point:Vec,target?:Entity):Vec{return spell==='pull'&&target?.movable?{x:target.x,y:target.y}:{...point};}
