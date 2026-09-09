import { describe, expect, it } from 'vitest';
import type { GameState, SceneId, Vec } from '../src/game/contracts';
import { act, createGame, snapshot, tick } from '../src/game/model';
import { inspectObject, nearbyEncounter, placementAnchors } from '../src/game/encounters';

function at(scene: SceneId, point: Vec): GameState {
  const s = createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});
  s.scene=scene; Object.assign(s.player,point); return s;
}
const object = (s: GameState, id: string) => s.worlds[s.scene].find(e=>e.id===id)!;
function pull(s: GameState,id:string,point:Vec) {
  const result=act(s,{type:'cast',spell:'pull',targetId:id,point});
  expect(result.ok,result.message).toBe(true);
  for(let i=0;i<50;i++)tick(s,.05,{x:0,y:0});
  act(s,{type:'release'});
}

describe('local encounter observations',()=>{
  it('only presents the encounter physically near the player',()=>{
    const s=at('creek',{x:170,y:760});
    expect(nearbyEncounter(s)).toBeUndefined();
    Object.assign(s.player,{x:1120,y:740});
    expect(nearbyEncounter(s)?.id).toBe('rain-shelter');
    Object.assign(s.player,{x:1000,y:290});
    expect(nearbyEncounter(s)?.id).toBe('lookout');
    s.scene='home';Object.assign(s.player,{x:1640,y:690});
    expect(nearbyEncounter(s)).toBeUndefined();
  });

  it('changes the rain advice after actually protecting the basket and laying the bridge',()=>{
    const s=at('creek',{x:1120,y:740});
    expect(nearbyEncounter(s)?.options.join('')).toContain('药筐');
    pull(s,'basket',{x:1180,y:520});
    expect(s.flags.basketSafe).toBe(true);
    expect(nearbyEncounter(s)?.fact).toContain('棚内');
    pull(s,'board',{x:1120,y:648});
    expect(s.flags.shelterBridge).toBe(true);
    expect(nearbyEncounter(s)?.fact).toContain('近路');
    expect(nearbyEncounter(s)?.options.join('')).not.toContain('先牵');
    expect(inspectObject(s,object(s,'board'))).toContain('搭稳');
  });

  it('requires replacing the board before suggesting wet-herb repair',()=>{
    const s=at('creek',{x:1100,y:710});
    pull(s,'board',{x:1080,y:740});
    expect(s.flags.herbsWet).toBe(true);
    expect(nearbyEncounter(s)?.options[0]).toContain('放回');
    pull(s,'board',{x:945,y:510});
    expect(nearbyEncounter(s)?.fact).toContain('导水板已归位');
    expect(nearbyEncounter(s)?.options[0]).toContain('整理');
    Object.assign(s.player,{x:1200,y:560});
    expect(act(s,{type:'interact',targetId:'shelter'}).ok).toBe(true);
    while(!s.dialogue?.choices.some(c=>c.id==='dry'))act(s,{type:'choose',choiceId:'more'});
    expect(act(s,{type:'choose',choiceId:'dry'}).ok).toBe(true);
    expect(nearbyEncounter(s)?.fact).toContain('晾好');
    expect(inspectObject(s,object(s,'basket'))).not.toContain('受潮');
  });

  it('distinguishes long pull, temporary hold and the permanent zero-mana return ladder',()=>{
    const s=at('creek',{x:1000,y:290});s.ringStyle='long';
    expect(nearbyEncounter(s)?.options[0]).toContain('长牵');
    s.ringStyle='hold';
    expect(nearbyEncounter(s)?.options[0]).toContain('留势');
    Object.assign(s.player,{x:1170,y:230,hold:4,pullId:'platform_beam'});
    s.flags.platformOpen=true;s.flags.platformVisited=true;
    expect(nearbyEncounter(s)?.options[0]).toContain('回程梯');
    expect(act(s,{type:'interact',targetId:'return_ladder'}).ok).toBe(true);
    s.player.mana=0;
    expect(nearbyEncounter(s)?.fact).toContain('不耗灵力');
    expect(nearbyEncounter(s)?.options.join('')).not.toContain('放下回程梯');
  });

  it('never conflates witnessed drainage, agreement, an open crossing and actual traversal',()=>{
    const s=at('crossing',{x:1040,y:850});
    expect(nearbyEncounter(s)?.fact).toContain('回弹');
    s.flags.gateDemonstrated=true;
    expect(nearbyEncounter(s)?.fact).toContain('看见排水');
    expect(nearbyEncounter(s)?.fact).not.toContain('已让出');
    s.flags.deal=true;
    expect(nearbyEncounter(s)?.fact).toContain('已让出');
    expect(nearbyEncounter(s)?.fact).toContain('尚未修通');
    s.flags.gateWedge=true;s.flags.gateOpen=true;s.flags.mainRepaired=true;
    expect(nearbyEncounter(s)?.fact).toContain('还未走到');
    s.flags.mainTraversed=true;s.flags.route='main';
    expect(nearbyEncounter(s)?.fact).toContain('亲自走过');
    expect(nearbyEncounter(s)?.options.join('')).not.toContain('安楔');
  });

  it('only calls a following companion present when she is physically nearby',()=>{
    const s=at('crossing',{x:1040,y:850});s.flags.companion='following';
    expect(nearbyEncounter(s)?.fact).not.toContain('许照就在身旁');
    Object.assign(object(s,'xu_crossing'),{x:1000,y:840});
    expect(nearbyEncounter(s)?.fact).toContain('许照就在身旁');
    s.flags.companion='refused';
    expect(nearbyEncounter(s)?.fact).not.toContain('许照就在身旁');
  });

  it('updates training and does not recommend reusing spent environmental distractions',()=>{
    const s=at('workshop',{x:1400,y:580});
    expect(nearbyEncounter(s)?.options[0]).toContain('取回引环');
    s.flags.ringOwned=true;s.flags.trialStyle='hold';
    expect(nearbyEncounter(s)?.options[0]).toContain('留势');
    s.flags.trialStyle='';s.flags.ringTrained=true;s.ringStyle='hold';
    expect(nearbyEncounter(s)?.title).toContain('已稳');
    Object.assign(s.player,{x:650,y:790});
    object(s,'decoy').data={noiseUsed:true};object(s,'straw').state='burned';
    const spent=nearbyEncounter(s)!;
    expect(spent.fact).toContain('烧尽');
    expect(spent.options.join('')).not.toMatch(/点燃|空筐/);
  });

  it.each([
    ['home','lamp',{x:450,y:730},'lampFixed'],
    ['creek','basket',{x:1120,y:740},'basketSafe'],
    ['creek','platform_ladder',{x:990,y:290},'platformLong'],
    ['crossing','gate',{x:1050,y:850},'gatePulled'],
    ['crossing','ridge_rope',{x:900,y:220},'ridgeOpen'],
  ] as const)('the %s/%s purpose anchor really triggers its model use', (scene,id,point,flag)=>{
    const s=at(scene,point);s.player.pullId=id;
    const anchor=placementAnchors(s)[0];s.player.pullId=null;
    const result=act(s,{type:'cast',spell:'pull',targetId:id,point:anchor});
    expect(result.ok,result.message).toBe(true);
    for(let i=0;i<30;i++)tick(s,.05,{x:0,y:0});
    expect(s.flags[flag]).toBe(true);
  });

  it('only exposes anchors for the actively movable object and keeps all helpers read-only',()=>{
    const s=at('creek',{x:1120,y:740});
    expect(placementAnchors(s)).toEqual([]);
    s.player.pullId='basket';
    expect(placementAnchors(s)).toEqual([{id:'basket-shelter',title:'棚内干处',x:1180,y:520}]);
    s.player.pullId='board';
    expect(placementAnchors(s).map(({x,y})=>({x,y}))).toEqual([{x:1120,y:648},{x:945,y:510}]);
    const before=snapshot(s);
    for(let i=0;i<3;i++){
      nearbyEncounter(s);placementAnchors(s);
      for(const e of s.worlds[s.scene])inspectObject(s,e);
    }
    expect(snapshot(s)).toBe(before);
    s.player.hold=3;
    expect(placementAnchors(s)).toEqual([]);
    s.player.hold=0;s.player.pullId='lamp';
    expect(placementAnchors(s)).toEqual([]); // A different scene's object is not present.
  });
});
