import type {GameEvent,Vec} from './contracts';
export interface Impact extends Vec {seq:number;kind:string;targetId?:string;age:number;life:number;angle:number;}
export class Feedback {
  active:Impact[]=[];
  recent:{seq:number;kind:string}[]=[];
  private lastSeq=0;
  reset(seq=0){this.active=[];this.recent=[];this.lastSeq=seq;}
  ingest(events:GameEvent[],player:Vec):GameEvent[]{
    if((events.at(-1)?.seq??0)<this.lastSeq)this.reset();
    const fresh=events.filter(e=>e.seq>this.lastSeq);
    for(const e of fresh){
      this.lastSeq=e.seq;
      if(!['hit','hurt','block','impact','steam','fire','cast','ward','pull','success','change'].includes(e.type))continue;
      const x=e.x??player.x,y=e.y??player.y;
      this.active.push({seq:e.seq,kind:e.type,x,y,targetId:e.targetId,age:0,life:e.type==='cast'?500:650,angle:Math.atan2(y-player.y,x-player.x)});
      this.recent.push({seq:e.seq,kind:e.type});
    }
    this.active=this.active.slice(-24);this.recent=this.recent.slice(-32);
    return fresh;
  }
  advance(milliseconds:number){for(const e of this.active)e.age+=milliseconds;this.active=this.active.filter(e=>e.age<e.life);}
}
