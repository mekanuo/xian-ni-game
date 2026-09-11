import type {Vec} from './contracts';
export const SPAR_CENTER={x:900,y:940};
export const SPAR_PEER_READY={x:900,y:720};
export const SPAR_STANCES={front:SPAR_PEER_READY,left:{x:680,y:940},right:{x:1120,y:940}};
export type SparStance=keyof typeof SPAR_STANCES;
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(a:Vec,b:Vec,p:Vec){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;return Math.hypot(a.x+t*dx-p.x,a.y+t*dy-p.y);}
export function positioningRoute(from:Vec,to:Vec):Vec[]{
 // These four agreed stations form the local walking circuit. No global AI or
 // collision changes: choose a short sequence whose segments stay outside the line.
 if(distance(from,SPAR_CENTER)<110||segmentDistance(from,to,SPAR_CENTER)>=110)return [{...to}];
 const points=[{...from},{...to},SPAR_STANCES.front,SPAR_STANCES.left,SPAR_STANCES.right,{x:900,y:1160}];
 const costs=points.map(()=>Infinity),previous=points.map(()=>-1),done=new Set<number>();costs[0]=0;
 for(let pass=0;pass<points.length;pass++){
  let best=-1;for(let i=0;i<points.length;i++)if(!done.has(i)&&(best<0||costs[i]<costs[best]))best=i;
  if(best<0||!Number.isFinite(costs[best]))break;if(best===1)break;done.add(best);
  for(let i=0;i<points.length;i++)if(i!==best&&!done.has(i)&&segmentDistance(points[best],points[i],SPAR_CENTER)>=110){
   const cost=costs[best]+distance(points[best],points[i]);if(cost<costs[i]){costs[i]=cost;previous[i]=best;}
  }
 }
 const route:Vec[]=[];for(let i=1;i!==0;i=previous[i]){if(i<0)return [];route.unshift({...points[i]});}return route;
}
export function positionWouldCrowd(from:Vec,next:Vec,player:Vec):boolean {
 return segmentDistance(from,next,player)<40&&distance(next,player)<distance(from,player);
}
