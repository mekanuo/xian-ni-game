import {describe,it,expect} from 'vitest';
import {createGame,snapshot,restore} from '../src/game/model';
import {migrateSave} from '../src/game/save';
const p={name:'测',origin:'tinker' as const,wish:'stay' as const,appearance:0 as const};
describe('life save compatibility',()=>{
it('round trips current life state',()=>{const s=createGame(p);expect(restore(snapshot(s)).life.repair.stage).toBe('unaccepted');expect(()=>migrateSave(snapshot(s))).not.toThrow();});
it('rejects nested checkpoint',()=>{const s=createGame(p);const n=JSON.parse(snapshot(s));n.checkpoint=snapshot(s);s.checkpoint=JSON.stringify(n);expect(()=>migrateSave(snapshot(s))).toThrow();});
it('rejects inconsistent reward state',()=>{const s=createGame(p);s.life.sachets=2;expect(()=>migrateSave(snapshot(s))).toThrow();});
});
