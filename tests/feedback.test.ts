import {describe,it,expect} from 'vitest';
import {Feedback} from '../src/game/feedback';
import type {GameEvent} from '../src/game/contracts';
const player={x:100,y:200};
const event=(seq:number,type:string):GameEvent=>({seq,type,time:1,text:type,x:160,y:200,targetId:'enemy'});
describe('combat presentation event delivery',()=>{
 it('keeps a hit when an alert follows in the same frame, without replaying either',()=>{
  const f=new Feedback();
  expect(f.ingest([event(1,'hit'),event(2,'alert')],player).map(e=>e.type)).toEqual(['hit','alert']);
  expect(f.active.some(e=>e.kind==='hit')).toBe(true);
  expect(f.ingest([event(1,'hit'),event(2,'alert')],player)).toEqual([]);
 });
 it('clears old effects and accepts events from a newly loaded journey',()=>{
  const f=new Feedback();f.ingest([event(90,'hit')],player);f.reset(2);
  expect(f.active).toEqual([]);
  expect(f.ingest([event(2,'hit'),event(3,'block')],player).map(e=>e.type)).toEqual(['block']);
 });
 it('expires impacts without mutating the authoritative event or player',()=>{
  const f=new Feedback(),events=[event(1,'hurt')],before=JSON.stringify({events,player});
  f.ingest(events,player);f.advance(1000);
  expect(f.active).toEqual([]);expect(JSON.stringify({events,player})).toBe(before);
 });
});
