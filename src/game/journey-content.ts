import type {Entity,GameState,SceneId,Vec} from './contracts';
export const JOURNEY_POINTS={start:{x:1440,y:720},exit:{x:220,y:780},southProbe:{x:1250,y:860},rest:{x:1250,y:550}} satisfies Record<string,Vec>;
export const JOURNEY_NORTH:ReadonlyArray<Vec>=[JOURNEY_POINTS.start,{x:1600,y:720},{x:1600,y:330},{x:1450,y:250},{x:320,y:250},{x:300,y:700},JOURNEY_POINTS.exit];
export const JOURNEY_SOUTH:ReadonlyArray<Vec>=[JOURNEY_POINTS.start,{x:1440,y:860},JOURNEY_POINTS.southProbe,{x:1080,y:860},{x:740,y:860},{x:300,y:860},JOURNEY_POINTS.exit];
export const JOURNEY_GATES={north:{x:850,y:200,w:250,h:120},south:{x:850,y:800,w:250,h:110}};
export function getJourneyRoute(run:NonNullable<GameState['journey']['run']>):ReadonlyArray<Vec>{
 if(run.plan==='south')return JOURNEY_SOUTH;
 return run.viaSouth?[JOURNEY_POINTS.southProbe,{x:1440,y:860},...JOURNEY_NORTH]:JOURNEY_NORTH;
}
const mark=(id:string,name:string,x:number,y:number):Entity=>({id,kind:'object',type:id,name,x,y,w:36,h:34,state:'hidden'});
export const JOURNEY_ENTITIES:Record<SceneId,Entity[]>={
 home:[],crossing:[],canal:[],kiln:[],market:[],
 workshop:[mark('journey_north_mark','北弯回程石刻',320,285),mark('journey_south_mark','南林旧绳结',1250,885)],
 creek:[{id:'journey_rest_shelter',kind:'rest',type:'rest',name:'雨棚干地坐垫',...JOURNEY_POINTS.rest,w:65,h:36,state:'hidden'}],
};
export function initialJourneyEntities(scene:SceneId):Entity[]{return JOURNEY_ENTITIES[scene].map(e=>({...e,homeX:e.x,homeY:e.y}));}
