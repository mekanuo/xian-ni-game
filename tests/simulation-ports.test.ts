import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {SCENES} from '../src/game/content';
import {createGame, simulationPorts, tick} from '../src/game/model';
import type {Entity, GameState} from '../src/game/contracts';

const original=SCENES.home;
let s:GameState;
let npc:Entity;
beforeEach(()=>{
  SCENES.home={...original,width:900,height:600,spawn:{x:180,y:350},ground:[],
    obstacles:[{x:400,y:200,w:80,h:300}],entities:[]};
  s=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});
  npc={id:'port-npc',kind:'npc',type:'merchant',name:'行路人',x:200,y:350,w:40,h:60,state:'idle'};
  s.worlds.home=[npc,{id:'port-board',kind:'object',type:'board',name:'挡板',x:700,y:350,w:80,h:80,state:'idle',solid:true}];
});
afterEach(()=>{SCENES.home=original;});

describe('shared simulation ports',()=>{
  it('uses the same fixed and entity obstacles for visibility, standing and NPC movement',()=>{
    expect(simulationPorts.free(s,{x:440,y:350})).toBe(false);
    expect(simulationPorts.free(s,{x:700,y:350})).toBe(false);
    expect(simulationPorts.clearLine(s,{x:200,y:350},{x:600,y:350})).toBe(false);
    expect(simulationPorts.clearLine(s,{x:600,y:350},{x:800,y:350})).toBe(false);
    for(let i=0;i<160;i++)simulationPorts.moveNpc(s,npc,{x:600,y:350},120,.025);
    expect(npc.x).toBeGreaterThan(370);expect(npc.x).toBeLessThanOrEqual(383);
    expect(simulationPorts.free(s,npc)).toBe(true);
    for(let i=0;i<40;i++)simulationPorts.moveNpc(s,npc,{x:200,y:350},120,.025);
    expect(npc.x).toBeLessThan(280);
  });
  it('preserves the actual dialogue pause and the pre-existing manual pause',()=>{
    for(const manuallyPaused of [false,true]){
      s.paused=manuallyPaused;
      simulationPorts.dialogue(s,'port-talk','行路人','等我走到门边。');
      const time=s.time,position={x:npc.x,y:npc.y};
      tick(s,.5,{x:1,y:0});simulationPorts.moveNpc(s,npc,{x:300,y:350},120,.5);
      expect(s.time).toBe(time);expect({x:npc.x,y:npc.y}).toEqual(position);
      simulationPorts.closeDialogue(s);expect(s.paused).toBe(manuallyPaused);
      tick(s,.025,{x:0,y:0});expect(s.time>time).toBe(!manuallyPaused);
    }
  });
  it('does not move an NPC during defeat or invalid elapsed time',()=>{
    const initial={x:npc.x,y:npc.y};
    for(const dt of [0,-1,NaN,Infinity])simulationPorts.moveNpc(s,npc,{x:300,y:350},120,dt);
    s.defeated=true;simulationPorts.moveNpc(s,npc,{x:300,y:350},120,.5);
    expect({x:npc.x,y:npc.y}).toEqual(initial);
  });
});
