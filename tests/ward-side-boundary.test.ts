import {expect,it} from 'vitest';
import {act,createGame,tick} from '../src/game/model';
// Exact perpendicular approaches must not turn into frontal impacts because
// cos(pi/2) is a tiny positive float. This is a shared combat regression.
for(const dt of [1/40,1/60,1/120])for(const sign of [-1,1])it(`side ray sign ${sign}, step ${dt} cannot be caught by a north-facing ward`,()=>{
 const s=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});s.worlds.home=[];s.player.x=940;s.player.y=900;
 expect(act(s,{type:'cast',spell:'ward',point:{x:940,y:700}}).ok).toBe(true);
 s.projectiles=[{id:99,owner:'enemy',x:940+sign*200,y:900,vx:-sign*260,vy:0,life:1.6}];
 for(let t=0;t<1;t+=dt)tick(s,dt,{x:0,y:0});
 expect(s.player.hp).toBe(3);expect(s.player.ward).toBeGreaterThan(0);expect(s.events.some(e=>e.type==='block')).toBe(false);
});
