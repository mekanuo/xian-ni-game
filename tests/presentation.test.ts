import {describe,it,expect} from 'vitest';
import {createGame,snapshot,tick,act} from '../src/game/model';
import {playerPose,visibleLabels} from '../src/game/presentation';
const make=()=>createGame({name:'行舟',origin:'herbalist',wish:'travel',appearance:0});
describe('state-driven presentation',()=>{
 it('leans toward the actual picked leaf without changing authoritative facing or position',()=>{const s=make();s.scene='creek';s.player.x=1455;s.player.y=680;s.life.harvest.picking={id:'life_shade_leaf',elapsed:.8,start:{x:1455,y:680}};const before=snapshot(s),pose=playerPose(s,false,0,false);expect(pose.action).toBe('gather');expect(pose.flipX).toBe(true);expect(pose.angle).toBeLessThan(0);expect(snapshot(s)).toBe(before);});
 it('keeps the gathered pose through a model pause and resets when interrupted',()=>{const s=make();s.scene='creek';s.life.harvest.picking={id:'life_shade_leaf',elapsed:.6,start:{x:s.player.x,y:s.player.y}};act(s,{type:'pause',value:true});const a=playerPose(s,false,0,false);tick(s,1,{x:0,y:0});expect(playerPose(s,false,0,false)).toEqual(a);s.life.harvest.picking=null;expect(playerPose(s,false,0,false).action).toBe('idle');});
 it('reduced motion retains action identity without rotating or compressing the portrait',()=>{const s=make();s.life.repair.testing=.5;const pose=playerPose(s,false,0,true);expect(pose.action).toBe('press');expect(pose.angle).toBe(0);expect(pose.scaleY).toBe(1);});
 it('shows the focused label when labels overlap and keeps their authored positions',()=>{const labels=[{id:'a',x:0,y:0,w:80,h:20,priority:2},{id:'b',x:50,y:0,w:70,h:20,priority:0},{id:'c',x:140,y:0,w:50,h:20,priority:1}];const before=JSON.stringify(labels);expect(visibleLabels(labels)).toEqual(['b','c']);expect(JSON.stringify(labels)).toBe(before);});
});
