import {describe,expect,it} from 'vitest';
import {
  createSparState,pendingSparFacts,recordSparResult,reportSparFacts,
  type SparLast,type SparOutcome,type SparRun,
} from '../src/game/spar-state';

// These are already-adjudicated local results, not fabricated act/tick replays.
const run=():SparRun=>({phase:'settling',stance:'left',positionPath:[],positionWaiting:false,
  startHp:4,startSeq:7,shots:1,blocked:false,stopReason:null});

describe('finite spar results and reports',()=>{
  it('new games have no practice facts and never share their record arrays',()=>{
    const first=createSparState(),second=createSparState();
    expect(first).toEqual({run:null,last:null,facts:[],reported:[]});
    first.facts.push('front:hit');first.reported.push('front:hit');
    expect(second).toEqual({run:null,last:null,facts:[],reported:[]});
  });

  it('settlement clears only the current run and retains an independent last result',()=>{
    const state=createSparState();state.run=run();state.facts=['front:dodged'];state.reported=['front:dodged'];
    const last:SparLast={stance:'left',outcome:'blocked',hurt:false};
    recordSparResult(state,last,1);
    expect(state.run).toBeNull();
    expect(state.last).toEqual({stance:'left',outcome:'blocked',hurt:false});
    expect(state.facts).toEqual(['front:dodged','left:blocked']);
    expect(state.reported).toEqual(['front:dodged']);
    last.outcome='outside';
    expect(state.last?.outcome).toBe('blocked');
  });

  for(const outcome of ['dodged','blocked','hit','stopped','outside'] as SparOutcome[]){
    it(`no emitted shot grants no fact even for an adjudicated ${outcome} label`,()=>{
      const state=createSparState();state.run=run();
      recordSparResult(state,{stance:'right',outcome,hurt:outcome==='hit'},0);
      expect(state.run).toBeNull();expect(state.last).toEqual({stance:'right',outcome,hurt:outcome==='hit'});
      expect(state.facts).toEqual([]);expect(reportSparFacts(state)).toEqual([]);
    });
  }

  for(const outcome of ['stopped','outside'] as const){
    it(`${outcome} followed by a real residual hit records injury without success`,()=>{
      const state=createSparState();
      recordSparResult(state,{stance:'left',outcome,hurt:true},1);
      expect(state.last).toEqual({stance:'left',outcome,hurt:true});
      expect(state.facts).toEqual(['left:hit']);
    });
    it(`${outcome} with no injury records no success even after a real shot`,()=>{
      const state=createSparState();recordSparResult(state,{stance:'right',outcome,hurt:false},1);
      expect(state.last).toEqual({stance:'right',outcome,hurt:false});expect(state.facts).toEqual([]);
    });
  }

  it('an explicit hit outcome is itself sufficient evidence for the hit fact',()=>{
    const state=createSparState();recordSparResult(state,{stance:'front',outcome:'hit',hurt:false},1);
    expect(state.facts).toEqual(['front:hit']);
  });

  it('actual injury cannot grant success through a contradictory success label',()=>{
    const state=createSparState();
    recordSparResult(state,{stance:'right',outcome:'dodged',hurt:true},1);
    recordSparResult(state,{stance:'right',outcome:'blocked',hurt:true},1);
    expect(state.facts).toEqual(['right:hit']);
  });

  it('different outcomes remain separate facts while repeats do not append duplicates',()=>{
    const state=createSparState();
    recordSparResult(state,{stance:'left',outcome:'dodged',hurt:false},1);
    recordSparResult(state,{stance:'left',outcome:'dodged',hurt:false},1);
    recordSparResult(state,{stance:'left',outcome:'blocked',hurt:false},1);
    recordSparResult(state,{stance:'right',outcome:'dodged',hurt:false},1);
    recordSparResult(state,{stance:'left',outcome:'hit',hurt:true},1);
    expect(state.facts).toEqual(['left:dodged','left:blocked','right:dodged','left:hit']);
    expect(state.last).toEqual({stance:'left',outcome:'hit',hurt:true});
  });

  it('a new positioning run preserves the previous hand until the next actual settlement',()=>{
    const state=createSparState();recordSparResult(state,{stance:'front',outcome:'dodged',hurt:false},1);
    reportSparFacts(state);
    state.run={...run(),phase:'positioning',shots:0,stance:'right',positionPath:[{x:1120,y:940}]};
    expect(state.last).toEqual({stance:'front',outcome:'dodged',hurt:false});
    expect(pendingSparFacts(state)).toEqual([]);
    expect(state.run.phase).toBe('positioning');
    recordSparResult(state,{stance:'right',outcome:'stopped',hurt:false},0);
    expect(state.last).toEqual({stance:'right',outcome:'stopped',hurt:false});
    expect(state.facts).toEqual(['front:dodged']);expect(state.reported).toEqual(['front:dodged']);
  });

  it('observing pending facts neither reports them nor exposes the stored array',()=>{
    const state=createSparState();state.facts=['right:hit','front:blocked'];state.reported=['right:hit'];
    const pending=pendingSparFacts(state);expect(pending).toEqual(['front:blocked']);
    pending.push('left:dodged');
    expect(state.facts).toEqual(['right:hit','front:blocked']);expect(state.reported).toEqual(['right:hit']);
    expect(pendingSparFacts(state)).toEqual(['front:blocked']);
  });

  it('reporting returns only new actual facts, and a later hand can still be reported',()=>{
    const state=createSparState();
    recordSparResult(state,{stance:'front',outcome:'blocked',hurt:false},1);
    const first=reportSparFacts(state);expect(first).toEqual(['front:blocked']);
    first.push('left:hit');
    expect(state.reported).toEqual(['front:blocked']);expect(reportSparFacts(state)).toEqual([]);
    recordSparResult(state,{stance:'front',outcome:'blocked',hurt:false},1);
    recordSparResult(state,{stance:'right',outcome:'outside',hurt:true},1);
    expect(pendingSparFacts(state)).toEqual(['right:hit']);
    expect(reportSparFacts(state)).toEqual(['right:hit']);
    expect(state.reported).toEqual(['front:blocked','right:hit']);
    expect(state.facts).toEqual(['front:blocked','right:hit']);
    expect(reportSparFacts(state)).toEqual([]);
  });
});
