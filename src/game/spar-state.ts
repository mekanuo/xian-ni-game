import type {SparStance} from './spar-geometry';
export type {SparStance} from './spar-geometry';

export type SparOutcome='hit'|'dodged'|'blocked'|'stopped'|'outside';
export interface SparRun {
  phase:'positioning'|'active'|'settling';
  stance:SparStance;
  positionPath:{x:number;y:number}[];
  positionWaiting:boolean;
  startHp:number;
  startSeq:number;
  shots:0|1;
  blocked:boolean;
  stopReason:'stopped'|'outside'|null;
}
export interface SparLast {stance:SparStance;outcome:SparOutcome;hurt:boolean;}
export type SparFact=`${SparStance}:${'dodged'|'blocked'|'hit'}`;
export interface SparState {run:SparRun|null;last:SparLast|null;facts:SparFact[];reported:SparFact[];}

export function createSparState():SparState {return {run:null,last:null,facts:[],reported:[]};}

/** The combat model has already settled the hand and any residual projectile. */
export function recordSparResult(state:SparState,last:SparLast,shots:0|1):void {
  state.last={...last};state.run=null;
  if(shots!==1)return;
  const outcome=last.hurt?'hit':last.outcome;
  if(outcome!=='hit'&&outcome!=='dodged'&&outcome!=='blocked')return;
  const fact:SparFact=`${last.stance}:${outcome}`;
  if(!state.facts.includes(fact))state.facts.push(fact);
}

export function pendingSparFacts(state:SparState):SparFact[] {
  return [...new Set(state.facts)].filter(fact=>!state.reported.includes(fact));
}

export function reportSparFacts(state:SparState):SparFact[] {
  const fresh=pendingSparFacts(state);
  state.reported=[...new Set([...state.reported,...fresh])];
  return fresh;
}
