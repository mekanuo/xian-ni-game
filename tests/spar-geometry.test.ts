import {expect,it} from 'vitest';
import {SPAR_CENTER,SPAR_STANCES,positioningRoute,positionWouldCrowd} from '../src/game/spar-geometry';

it('every side-to-side route keeps the full walking segment outside the practice line',()=>{
 for(const from of [SPAR_STANCES.left,SPAR_STANCES.right,{x:712,y:1044},{x:1060,y:800}]){
  for(const to of Object.values(SPAR_STANCES)){
   const before=JSON.stringify({from,to}),route=positioningRoute(from,to);
   expect(route.at(-1)).toEqual(to);let previous=from;
   for(const point of route){for(let i=0;i<=100;i++){
    const foot={x:previous.x+(point.x-previous.x)*i/100,y:previous.y+(point.y-previous.y)*i/100};
    expect(Math.hypot(foot.x-SPAR_CENTER.x,foot.y-SPAR_CENTER.y)).toBeGreaterThanOrEqual(110-1e-8);
   }previous=point;}
   expect(JSON.stringify({from,to})).toBe(before);
  }
 }
});
it('initial greeting can leave the circle and a south-side return stays on the shorter southern route',()=>{
 expect(positioningRoute({x:900,y:980},SPAR_STANCES.front)).toEqual([SPAR_STANCES.front]);
 const route=positioningRoute({x:710,y:1050},SPAR_STANCES.right);
 expect(route.some(p=>p.y===1160)).toBe(true);
});
it('yielding prevents the NPC approaching within forty units but permits retreat from an existing overlap',()=>{
 const peer={x:680,y:940};
 expect(positionWouldCrowd(peer,{x:682,y:938},{x:705,y:930})).toBe(true);
 expect(positionWouldCrowd(peer,{x:678,y:942},{x:705,y:930})).toBe(false);
 expect(positionWouldCrowd(peer,{x:682,y:938},{x:900,y:940})).toBe(false);
});
