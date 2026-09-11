import type {GameState} from './contracts';
/** A waiting companion belongs to the market until a real reunion and departure. */
export function companionAvailable(s:GameState):boolean {
 const xu=s.worlds.market?.find(e=>e.id==='xu_market');
 return s.scene==='market'?!!xu&&xu.state!=='hidden':!xu||xu.state==='hidden';
}
