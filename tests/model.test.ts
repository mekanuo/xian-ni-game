import { describe, expect, it } from 'vitest';
import { act, createGame, nearbyEntity, previewCast, restore, snapshot, tick } from '../src/game/model';
import type { GameState, SceneId, Vec } from '../src/game/contracts';

const profile = { name: '行舟', origin: 'tinker' as const, wish: 'travel' as const, appearance: 0 as const };
function run(s: GameState, seconds: number) { for (let t = 0; t < seconds; t += .05) tick(s, .05, { x: 0, y: 0 }); }
function resume(s: GameState) { if (s.dialogue) act(s, { type: 'choose', choiceId: 'leave' }); act(s, { type: 'pause', value: false }); }
function walk(s: GameState, point: Vec) { resume(s); const moved=act(s, { type: 'move', point }); expect(moved.ok, `${s.scene} ${JSON.stringify(point)} ${moved.message}`).toBe(true); for(let t=0;t<30&&s.player.path.length;t+=.05) tick(s,.05,{x:0,y:0}); expect(Math.hypot(s.player.x - point.x, s.player.y - point.y), `${s.scene} walk ${JSON.stringify(point)} from ${s.player.x},${s.player.y} hp=${s.player.hp}`).toBeLessThan(24); }
function object(s: GameState, id: string) { const e = s.worlds[s.scene].find(e => e.id === id); if (!e) throw Error(`missing ${s.scene}/${id}`); return e; }
function interact(s: GameState, id: string) { const e = object(s, id); walk(s, { x: e.x - 55, y: e.y + 25 }); expect(act(s, { type: 'interact', targetId: id }).ok).toBe(true); }
function choose(s: GameState, id: string) { while(s.dialogue&&!s.dialogue.choices.some(c=>c.id===id)&&s.dialogue.choices.some(c=>c.id==='more'))act(s,{type:'choose',choiceId:'more'}); expect(act(s, { type: 'choose', choiceId: id }).ok).toBe(true); resume(s); }
function exit(s: GameState, id: string, scene: SceneId) { interact(s, id); expect(s.scene).toBe(scene); }
function cast(s: GameState, id: string, point: Vec) { resume(s); const r=act(s, { type: 'cast', spell: 'pull', targetId: id, point }); expect(r.ok, r.message).toBe(true); run(s, 2); expect(act(s, { type: 'release' }).ok).toBe(true); }

function readyRing(origin: 'tinker'|'herbalist'='tinker', style:'long'|'hold'='long', companion=false) {
  const s=createGame({...profile,origin});
  if(companion){interact(s,'xu');choose(s,'invite');}
  exit(s,'to_creek','creek');interact(s,'rope');choose(s,origin==='tinker'?'fix':'cooperate');if(origin==='herbalist')run(s,1.5);interact(s,'bag');
  exit(s,'to_workshop','workshop');walk(s,{x:320,y:220});walk(s,{x:1450,y:220});interact(s,'ring');interact(s,'tao_work');choose(s,style);
  walk(s,style==='long'?{x:1210,y:600}:{x:1390,y:600});
  if(style==='long')cast(s,'trial',{x:1310,y:600});
  else {expect(act(s,{type:'cast',spell:'pull',targetId:'trial',point:{x:1430,y:580}}).ok).toBe(true);run(s,.6);expect(act(s,{type:'hold'}).ok).toBe(true);act(s,{type:'release'});}
  interact(s,'rest_workshop');walk(s,{x:1450,y:220});walk(s,{x:320,y:220});exit(s,'to_creek','creek');return s;
}
describe('deterministic spatial world', () => {
  it('invalid spell does not mutate anything or consume resources', () => {
    const s = createGame(profile), before = snapshot(s);
    expect(act(s, { type: 'cast', spell: 'pull', targetId: 'missing', point: { x: 0, y: 0 } }).ok).toBe(false);
    expect(snapshot(s)).toBe(before);
    expect(previewCast(s, 'pull', 'tao', { x: 400, y: 400 }).valid).toBe(false);
  });
  it('walks around solid geometry and rejects remote interaction', () => {
    const s = createGame(profile);
    expect(act(s, { type: 'interact', targetId: 'to_creek' }).ok).toBe(false);
    walk(s, { x: 1050, y: 690 });
    expect(s.player.hp).toBe(4);
    expect(nearbyEntity(s)?.id).not.toBe('to_creek');
  });
  it('pauses projectiles, durations and accepts only the last pending action', () => {
    const s = createGame(profile);
    act(s, { type: 'cast', spell: 'flame', point: { x: 680, y: 700 } }); run(s, .6);
    act(s, { type: 'pause', value: true }); const projectile = JSON.stringify(s.projectiles), time = s.time;
    act(s, { type: 'move', point: { x: 350, y: 750 } });
    act(s, { type: 'cast', spell: 'ward', point: { x: 800, y: 700 } });
    run(s, 5); expect(s.time).toBe(time); expect(JSON.stringify(s.projectiles)).toBe(projectile);
    expect(s.pending?.type).toBe('cast'); act(s, { type: 'pause', value: false }); expect(s.player.ward).toBe(6);
  });
  it('save restores exact full state; rejects corrupt, foreign and impossible saves', () => {
    const s = createGame(profile); run(s, .5); const saved = snapshot(s);
    expect(snapshot(restore(saved))).toBe(saved);
    for (const bad of ['{}', '{', saved.replace('return-stone-v1', 'other'), saved.replace('"hp":4', '"hp":999')]) expect(() => restore(bad)).toThrow();
  });
  it('same legal input frames produce identical state', () => {
    const a = createGame(profile), b = createGame(profile);
    for (const s of [a,b]) { act(s, { type: 'move', point: { x: 1000, y: 750 } }); run(s, 8); act(s, { type: 'cast', spell: 'ward', point: { x: 1300, y: 750 } }); run(s, 2); }
    expect(snapshot(a)).toBe(snapshot(b));
  });
  it('two-click pull selects the blocked entrance beam, moves it outside and opens only after hold',()=>{
    const s=readyRing('tinker','hold');walk(s,{x:1000,y:290});
    const beam=object(s,'platform_beam'),origin={x:beam.x,y:beam.y};
    expect(act(s,{type:'move',point:origin}).ok).toBe(false);
    const selected=act(s,{type:'cast',spell:'pull',targetId:beam.id,point:origin});
    expect(selected.ok,selected.message).toBe(true);
    expect(s.player.pullId).toBe(beam.id);
    expect(act(s,{type:'move',point:{x:1080,y:150}}).ok).toBe(false); // Adjacent stone wall remains solid to the beam.
    expect(act(s,{type:'move',point:{x:980,y:285}}).ok).toBe(true);run(s,.6);
    expect(beam.x).toBeLessThan(1000);expect(s.flags.platformOpen).not.toBe(true);
    // Moving the beam alone does not let the player walk through the entrance.
    for(let t=0;t<1;t+=.05)tick(s,.05,{x:1,y:0});
    expect(s.player.x).toBeLessThan(1054);
    expect(act(s,{type:'hold'}).ok).toBe(true);expect(s.flags.platformOpen).toBe(true);
    walk(s,{x:1170,y:230});expect(s.flags.platformVisited).toBe(true);
  });
  it('hold really frees the hand, pauses the remaining time and opens a reversible platform entrance',()=>{
    const s=readyRing('tinker','hold');walk(s,{x:1000,y:290});
    expect(act(s,{type:'cast',spell:'pull',targetId:'platform_beam',point:{x:980,y:285}}).ok).toBe(true);run(s,.6);
    expect(act(s,{type:'hold'}).ok).toBe(true);expect(s.flags.platformOpen).toBe(true);
    const left=s.player.hold;act(s,{type:'pause',value:true});run(s,10);expect(s.player.hold).toBe(left);
    act(s,{type:'pause',value:false});expect(act(s,{type:'cast',spell:'ward',point:{x:1200,y:290}}).ok).toBe(true);
    walk(s,{x:1170,y:230});expect(act(s,{type:'interact',targetId:'return_ladder'}).ok).toBe(true);
    run(s,9);expect(s.player.hold).toBe(0);expect(s.flags.platformOpen).toBe(true);
    interact(s,'chime');expect(s.flags.chime).toBe(true);expect(s.flags.platformShared).not.toBe(true);
    s.player.mana=0; // Boundary fixture: all escape movement remains legal with zero resources.
    walk(s,{x:1000,y:290});interact(s,'rest_creek');expect(s.player.mana).toBe(6);
  });
  it('records shared platform memory only after the actual companion walks onto it',()=>{
    const s=readyRing('herbalist','long',true);walk(s,{x:890,y:290});cast(s,'platform_ladder',{x:1010,y:290});
    walk(s,{x:1180,y:230});run(s,2);expect(s.flags.platformVisited).toBe(true);expect(s.flags.platformShared).toBe(true);
  });
  it('wet herbs stop cooperation and require physically restoring the board before repair',()=>{
    const s=createGame({...profile,origin:'herbalist'});exit(s,'to_creek','creek');
    walk(s,{x:940,y:710});cast(s,'board',{x:950,y:740});expect(s.flags.herbsWet).toBe(true);expect(s.flags.companion).toBe('refused');
    interact(s,'shelter');expect(act(s,{type:'choose',choiceId:'dry'}).ok).toBe(false);resume(s);
    walk(s,{x:1100,y:700});cast(s,'board',{x:945,y:510});interact(s,'shelter');choose(s,'dry');
    expect(s.flags.herbsWet).toBe(false);expect(s.flags.herbsRepaired).toBe(true);expect(s.flags.companion).toBe('following');
    interact(s,'shelter');choose(s,'bandage');expect(s.herbs).toBe(2);expect(s.flags.bandaged).toBe(true);
  });
  it('moving the basket under shelter first preserves herbs and cooperation',()=>{
    const s=createGame(profile);exit(s,'to_creek','creek');walk(s,{x:1080,y:740});cast(s,'basket',{x:1180,y:520});
    walk(s,{x:1060,y:710});cast(s,'board',{x:1080,y:740});expect(s.flags.basketSafe).toBe(true);expect(s.flags.herbsWet).not.toBe(true);expect(s.flags.shelterShared).toBe(true);
  });
  it('a borrowed board becomes an actual dry shortcut across the runoff',()=>{
    const s=createGame(profile);exit(s,'to_creek','creek');walk(s,{x:1120,y:740});
    expect(act(s,{type:'move',point:{x:1120,y:648}}).ok).toBe(false);
    cast(s,'basket',{x:1180,y:520});cast(s,'board',{x:1120,y:648});
    expect(s.flags.shelterBridge).toBe(true);walk(s,{x:1120,y:580});
  });
  it('validates save action, dialogue and flags instead of accepting malformed structures',()=>{
    const s=createGame(profile);const a=JSON.parse(snapshot(s));a.flags.bad={surprise:true};expect(()=>restore(JSON.stringify(a))).toThrow();
    const b=JSON.parse(snapshot(s));b.pending={type:'cast',spell:'unknown',point:{x:100,y:100}};expect(()=>restore(JSON.stringify(b))).toThrow();
    const c=JSON.parse(snapshot(s));c.selected='unknown';expect(()=>restore(JSON.stringify(c))).toThrow();
  });
  it('flame moves through the world, damages at collision and interrupts a real enemy windup',()=>{
    const s=readyRing();exit(s,'to_crossing','crossing');
    // Tactical fixture sets an observable windup, without moving any target or obstacle.
    s.player.x=950;s.player.y=830;const enemy=object(s,'raider_a');enemy.state='casting';enemy.data!.attack=1.1;
    const mana=s.player.mana;expect(act(s,{type:'cast',spell:'flame',targetId:enemy.id,point:{x:enemy.x,y:enemy.y}}).ok).toBe(true);
    expect(enemy.hp).toBe(3);run(s,.8);expect(enemy.hp).toBe(3);run(s,.35);expect(enemy.hp).toBe(2);expect(enemy.state).not.toBe('casting');expect(s.player.mana).toBe(mana-1);
  });
  it('a solid wall prevents enemy sensing and paused dialogue freezes incoming threats',()=>{
    const s=readyRing();exit(s,'to_crossing','crossing');s.player.x=850;s.player.y=400;
    const e=object(s,'raider_a');e.x=850;e.y=650;e.state='idle';e.data!.seen=0;run(s,2);expect(e.state).toBe('idle');
    s.player.x=520;s.player.y=780;act(s,{type:'interact',targetId:'negotiator'});
    const before=JSON.stringify({time:s.time,entities:s.worlds.crossing,projectiles:s.projectiles});run(s,5);
    expect(JSON.stringify({time:s.time,entities:s.worlds.crossing,projectiles:s.projectiles})).toBe(before);
    choose(s,'refuse');expect(s.flags.refusedDemand).toBe(true);expect(s.flags.route).toBeUndefined();
  });
  it('cannot finish by remote table interaction, promise, or a ring never personally tried',()=>{
    const s=createGame(profile);expect(act(s,{type:'interact',targetId:'table'}).ok).toBe(false);
    interact(s,'table');expect(s.dialogue?.id).not.toBe('ending');expect(s.ended).toBe(false);
  });
  it('a promise cannot pacify guards; a physical demonstration springs back without its wedge',()=>{
    const s=readyRing();exit(s,'to_crossing','crossing');interact(s,'negotiator');expect(act(s,{type:'choose',choiceId:'offer'}).ok).toBe(false);resume(s);
    walk(s,{x:700,y:900});cast(s,'gate',{x:1030,y:750});expect(s.flags.gateDemonstrated).toBe(true);expect(s.flags.gatePulled).toBe(false);expect(s.flags.gateOpen).not.toBe(true);expect(object(s,'gate').x).toBe(object(s,'gate').homeX);
  });
  it('retreat retains unresolved wet herbs, a refusal, consumed medicine and displaced objects',()=>{
    const s=createGame(profile);exit(s,'to_creek','creek');walk(s,{x:940,y:710});cast(s,'board',{x:950,y:740});
    s.player.hp=2;act(s,{type:'heal'});const board={x:object(s,'board').x,y:object(s,'board').y};act(s,{type:'retreat'});
    expect(s.flags.herbsWet).toBe(true);expect(s.flags.companion).toBe('refused');expect(s.herbs).toBe(1);expect({x:object(s,'board').x,y:object(s,'board').y}).toEqual(board);
  });
  it('directional ward blocks a front projectile but leaves the rear exposed',()=>{
    const s=createGame(profile);act(s,{type:'cast',spell:'ward',point:{x:800,y:710}});
    s.projectiles.push({id:90,x:410,y:710,vx:-180,vy:0,owner:'enemy',life:1});run(s,.25);expect(s.player.hp).toBe(4);expect(s.player.ward).toBe(0);
    run(s,3);act(s,{type:'cast',spell:'ward',point:{x:800,y:710}});s.projectiles.push({id:91,x:310,y:710,vx:180,vy:0,owner:'enemy',life:1});run(s,.25);expect(s.player.hp).toBe(3);expect(s.player.ward).toBeGreaterThan(0);
  });
  it('the ward intercepts an offset incoming projectile before it reaches Xu behind the player',()=>{
    const s=createGame(profile);s.flags.companion='following';const xu=object(s,'xu');xu.x=260;xu.y=745;
    act(s,{type:'cast',spell:'ward',point:{x:700,y:710}});
    s.projectiles.push({id:92,x:470,y:745,vx:-180,vy:0,owner:'enemy',life:2});run(s,1);
    expect(s.player.ward).toBe(0);expect(s.flags.companion).toBe('following');expect(s.projectiles).toHaveLength(0);
  });
  it('Xu advances behind a correctly oriented ward but waits when the same incoming ray is unprotected',()=>{
    const make=()=>{const s=createGame(profile);s.flags.companion='following';const xu=object(s,'xu');xu.x=274;xu.y=740;s.projectiles.push({id:93,x:420,y:755,vx:-50,vy:0,owner:'enemy',life:2});return s;};
    const bare=make();run(bare,.025);expect(object(bare,'xu').x).toBe(274);
    const guarded=make();act(guarded,{type:'cast',spell:'ward',point:{x:700,y:710}});run(guarded,.025);expect(object(guarded,'xu').x).toBeGreaterThan(274);
  });
  it('ridge stones give a paused warning, then a real projectile that can be blocked or avoided without mana',()=>{
    const s=readyRing();exit(s,'to_crossing','crossing');s.player.x=1390;s.player.y=280;s.flags.ridgeOpen=true;
    const rock=s.worlds.crossing.find(e=>e.id==='ridge_rock_source');expect(rock).toBeDefined();run(s,.1);
    expect(s.events.some(e=>e.type==='warning'&&e.targetId==='ridge_rock_source')).toBe(true);expect(s.projectiles).toHaveLength(0);
    act(s,{type:'pause',value:true});const frozen=snapshot(s);run(s,3);expect(snapshot(s)).toBe(frozen);resume(s);
    act(s,{type:'cast',spell:'ward',point:{x:1390,y:160}});run(s,1.6);expect(s.player.hp).toBe(4);expect(s.player.ward).toBe(0);
    s.player.mana=0;walk(s,{x:1450,y:310});run(s,8);expect(s.player.hp).toBe(4);walk(s,{x:1050,y:310});expect(s.defeated).toBe(false);
  });
  it('repairing after the ridge ending updates the returning cart without inventing main-bank traversal',()=>{
    const s=readyRing();exit(s,'to_crossing','crossing');s.flags.ridgeUsed=true;s.flags.route='ridge';s.flags.returned=true;s.ended=true;
    s.flags.gateWedge=true;s.player.x=1020;s.player.y=790;cast(s,'gate',{x:1030,y:750});
    expect(s.flags.gateOpen).toBe(true);expect(s.flags.mainTraversed).not.toBe(true);
    walk(s,{x:400,y:900});exit(s,'to_creek','creek');exit(s,'to_home','home');
    expect(object(s,'return_cart').state).toBe('arrived');expect(s.flags.ridgeUsed).toBe(true);expect(s.flags.route).toBe('ridge');
  });
  it('opening the gate preserves withdrawn and hostile guards; unseen drainage does not become witnessed knowledge',()=>{
    const s=readyRing();exit(s,'to_crossing','crossing');const a=object(s,'raider_a'),b=object(s,'raider_b');
    a.state='retreated';a.hp=0;b.x=170;b.y=170;b.state='chasing';s.flags.gateWedge=true;s.player.x=1020;s.player.y=790;
    cast(s,'gate',{x:1030,y:750});expect(s.flags.gateOpen).toBe(true);expect(a.state).toBe('retreated');expect(b.state).not.toBe('peaceful');expect(s.flags.gateDemonstrated).not.toBe(true);
  });
  it('every visible dialogue page has at most three valid responses',()=>{
    const s=createGame(profile);interact(s,'tao');expect(s.dialogue!.choices.length).toBeLessThanOrEqual(3);
    if(s.dialogue!.choices.some(c=>c.id==='more')){act(s,{type:'choose',choiceId:'more'});expect(s.dialogue!.choices.length).toBeLessThanOrEqual(3);}
  });
  it('herbalist cooperation settles only after Xu physically reaches the boat while you steady it',()=>{
    const s=createGame({...profile,origin:'herbalist'});exit(s,'to_creek','creek');interact(s,'rope');choose(s,'cooperate');expect(s.flags.boatSecured).not.toBe(true);
    walk(s,{x:560,y:680});run(s,1);expect(s.flags.boatSecured).toBe(true);expect(s.flags.boatShared).toBe(true);
  });
  it('the narrow runoff passage has a real falling stone that a north-facing ward can stop',()=>{
    const s=createGame(profile);exit(s,'to_creek','creek');s.player.x=1380;s.player.y=680;
    act(s,{type:'cast',spell:'ward',point:{x:1380,y:540}});run(s,1.2);expect(s.player.hp).toBe(4);expect(s.player.ward).toBe(0);
    expect(s.events.some(e=>e.type==='warning'&&e.text.includes('碎石'))).toBe(true);
  });
  it.each(['main', 'ridge'] as const)('finishes actual %s traversal and returns home with personally tried ring', route => {
    const s = createGame(profile);
    exit(s, 'to_creek', 'creek');
    interact(s, 'rope'); choose(s, 'fix'); interact(s, 'bag');
    exit(s, 'to_workshop', 'workshop');
    // Upper path keeps away from the animals; no test teleport or state injection.
    walk(s, { x: 320, y: 220 }); walk(s, { x: 1450, y: 220 }); interact(s, 'ring');
    interact(s, 'tao_work'); choose(s, 'long');
    walk(s, { x: 1210, y: 600 }); cast(s, 'trial', { x: 1310, y: 600 });
    expect(s.flags.ringTrained).toBe(true); expect(s.ringStyle).toBe('long');
    walk(s, { x: 1450, y: 220 }); walk(s, { x: 320, y: 220 }); exit(s, 'to_creek', 'creek');
    expect(s.flags.platformShared).not.toBe(true);
    exit(s, 'to_crossing', 'crossing');
    walk(s, { x: 700, y: 900 });
    if (route === 'main') {
      cast(s,'gate',{x:1030,y:750});expect(s.flags.gateDemonstrated).toBe(true);expect(s.flags.gateOpen).not.toBe(true);
      interact(s, 'negotiator'); choose(s, 'offer');interact(s,'gate_slot');
      walk(s, { x: 950, y: 760 }); cast(s, 'gate', { x: 1030, y: 750 });
      expect(s.flags.gateOpen).toBe(true); walk(s, { x: 1420, y: 760 }); interact(s, 'far_bank');
      walk(s, { x: 1050, y: 760 });
    } else {
      walk(s, { x: 320, y: 170 }); walk(s, { x: 680, y: 170 }); cast(s, 'ridge_rope', { x: 800, y: 180 });
      expect(s.flags.ridgeOpen).toBe(true); walk(s, { x: 1430, y: 280 }); interact(s, 'ridge_marker');
      walk(s, { x: 1050, y: 220 }); walk(s, { x: 680, y: 170 }); walk(s, { x: 320, y: 170 });
    }
    expect(s.flags.route).toBe(route); expect(s.ended).toBe(false);
    walk(s, { x: 400, y: 900 }); exit(s, 'to_creek', 'creek'); exit(s, 'to_home', 'home');
    interact(s, 'table'); choose(s, 'travel'); expect(s.ended).toBe(true);
    expect(s.flags.platformShared).not.toBe(true);
  });
});
