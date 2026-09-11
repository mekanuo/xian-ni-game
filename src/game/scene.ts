import {registerMarketFrames,paintMarketLandscape,createMarketVisual,updateMarketVisual,drawMarketHomeRecord} from './market-art';
import { registerKilnFrames, paintKilnLandscape, createKilnVisual, updateKilnVisual } from './kiln-art';
import { registerCanalFrames, paintCanalLandscape, createCanalVisual, updateCanalVisual, drawCanalWater, drawCanalHomeRecord } from './canal-art';
import Phaser from 'phaser';
import type { Entity, GameAction, GameState, Spell, Vec } from './contracts';
import { companionAvailable,createGame, act, tick, nearbyEntity, previewCast, previewPullMove, interactionPoint, canInteract, snapshot } from './model';
import { SCENES } from './content';
import { GameUI, type Settings } from './ui';
import { Soundscape } from './audio';
import { display } from './display';
import { Feedback } from './feedback';
import { playerPose, visibleLabels, castTargetPoint, type LabelBox } from './presentation';
import { paintTerrain } from './terrain';
import { inspectObject, placementAnchors } from './encounters';
import { drawWayfinding, configureWayfindingLabel } from './wayfinding';
import { registerLifeFrames, createLifeVisual, updateLifeVisual } from './life-art';
import { guideAngle, drawJourneyMark, drawJourneyHomeRecord, type GuideMotion } from './journey-art';

const FONT = '"Noto Serif SC", "Songti SC", "Microsoft YaHei", serif';
const COLORS = {ink:0x314b42,outline:0x42573e,stone:0x879887,stoneLight:0xb0baa6,wood:0x897755,woodLight:0xb4a17a,roof:0x576f68,leaf:0x628267};
function seeded(seed: number) { return () => { seed=(seed*1664525+1013904223)>>>0;return seed/4294967296; }; }
interface RenderEntity { guideMotion?:GuideMotion; propImage?:Phaser.GameObjects.Image; lifeVisual?:Phaser.GameObjects.Container; container: Phaser.GameObjects.Container; art: Phaser.GameObjects.Graphics; image?: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; stateKey:string; }

export class WorldScene extends Phaser.Scene {
  public state!: GameState;
  private ui!: GameUI;
  private soundscape = new Soundscape();
  private feedback=new Feedback();
  private impactLabels=new Map<number,Phaser.GameObjects.Text>();
  private stepClock=0;
  private landscape!: Phaser.GameObjects.Container;
  private homeFacade?:Phaser.GameObjects.Image;
  private canalWater!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private worldLabels!: Phaser.GameObjects.Container;
  private hoverLabel!: Phaser.GameObjects.Text;
  private player!: Phaser.GameObjects.Container;
  private playerImage?: Phaser.GameObjects.Image;
  private playerHand!: Phaser.GameObjects.Graphics;
  private renders=new Map<string,RenderEntity>();
  private renderedScene='';
  private groundVersion='';
  private accumulator=0;
  private uiClock=0;
  private lastX=0;
  private lastY=0;
  private walking=0;
  private motionMoving=false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private casting=false;
  private hovered?: Entity;
  private pointerOverWorld=false;
  private anchorLabels:Phaser.GameObjects.Text[]=[];
  private queuedInteract:string|null=null;
  private cameraManual=false;
  private panMode=false;
  private dragStart: {x:number;y:number;cx:number;cy:number}|null=null;
  private settings:Settings={reduced:false,contrast:false,large:false,volume:.45,music:.25};
  constructor(){super('world');}
  preload(){
    this.load.image('title-source',new URL('art/title.png',document.baseURI).href);
    this.load.image('characters-source',new URL('art/characters.png',document.baseURI).href);
    this.load.image('enemies-source',new URL('art/enemies.png',document.baseURI).href);
    this.load.image('environment-source',new URL('art/environment.png',document.baseURI).href);
    this.load.image('home-inn-source',new URL('art/home-inn.png',document.baseURI).href);
    this.load.image('home-props-source',new URL('art/home-props.png',document.baseURI).href);
    this.load.image('home-ground',new URL('art/home-ground.png',document.baseURI).href);
    for(const key of ['creek-ground','workshop-ground','crossing-ground','canal-ground','water-surface'])this.load.image(key,new URL(`art/${key}.png`,document.baseURI).href);
    for(const key of ['region-architecture','journey-props','detail-props','life-props','canal-architecture','canal-props'])this.load.image(`${key}-source`,new URL(`art/${key}.png`,document.baseURI).href);
    for(const key of ['market-environment','market-props','market-shenyan'])this.load.image(`${key}-source`,new URL(`assets/${key}.png`,document.baseURI).href);
    this.load.image('market-ground',new URL('assets/market-ground.png',document.baseURI).href);
    for(const key of ['kiln-environment','kiln-props','kiln-duqin'])this.load.image(`${key}-source`,new URL(`assets/${key}.png`,document.baseURI).href);
    this.load.image('kiln-ground',new URL('assets/kiln-ground.png',document.baseURI).href);
    this.load.on('loaderror',(file:Phaser.Loader.File)=>{document.body.dataset.assetError=file.key;});
  }
  create(){
    if(['market-environment-source','market-props-source','market-shenyan-source','market-ground','kiln-environment-source','kiln-props-source','kiln-duqin-source','kiln-ground','title-source','characters-source','environment-source','enemies-source','home-inn-source','home-props-source','home-ground','creek-ground','workshop-ground','crossing-ground','water-surface','region-architecture-source','journey-props-source','detail-props-source','life-props-source','canal-ground','canal-architecture-source','canal-props-source'].some(key=>!this.textures.exists(key))){
      const root=document.querySelector('#interface')!;
      root.innerHTML='<div class="veil"><section class="paper modal-paper" role="alert"><h2>山道画卷尚未展开</h2><p>部分画面未能载入，重新连接后可以再试一次。</p><button class="primary" id="retry-assets">重新载入</button></section></div>';
      document.querySelector('#retry-assets')!.addEventListener('click',()=>window.location.reload());
      return;
    }
    document.documentElement.style.setProperty('--title-image',`url("${new URL('art/title.png',document.baseURI).href}")`);
    this.keyCharacters();
    this.keyEnvironment();
    const inn=this.keyAtlas('home-inn');
    inn?.add('facade',0,12,45,2026,635);
    const furnishings=this.keyAtlas('home-props');
    const furnitureFrames:Record<string,number[]>={table:[44,62,441,376],workbench:[541,89,453,342],herb_rack:[1053,54,450,391],return_cart:[15,581,482,339],room:[523,535,486,406],rest_home:[1044,671,468,259]};
    for(const [name,b] of Object.entries(furnitureFrames))furnishings?.add(name,0,b[0],b[1],b[2],b[3]);
    const architecture=this.keyAtlas('region-architecture');
    const architectureFrames:Record<string,number[]>={workshop:[20,145,683,335],shelter:[722,140,512,349],sluice:[69,624,521,493],parapet:[747,998,333,108]};
    for(const [name,b] of Object.entries(architectureFrames))architecture?.add(name,0,b[0],b[1],b[2],b[3]);
    const props=this.keyAtlas('journey-props');
    const propFrames:Record<string,number[]>={boat:[12,118,405,175],basket:[466,78,312,256],board:[832,143,410,136],ladder:[135,394,159,411],stele:[484,423,277,360],rope:[845,487,379,265],trial:[60,842,306,356],straw:[430,852,388,347],bag:[865,891,352,263]};
    for(const [name,b] of Object.entries(propFrames))props?.add(name,0,b[0],b[1],b[2],b[3]);
    const details=this.keyAtlas('detail-props');
    const detailFrames:Record<string,number[]>={decoy:[35,132,349,342],gate:[486,32,283,482],gate_slot:[932,20,276,536],fence:[82,570,248,644],rest:[426,735,399,305],shelter:[846,696,389,410]};
    for(const [name,b] of Object.entries(detailFrames))details?.add(name,0,b[0],b[1],b[2],b[3]);
    const lifeAtlas=this.keyAtlas('life-props');if(lifeAtlas)registerLifeFrames(lifeAtlas);
    const canalArchitecture=this.keyAtlas('canal-architecture'),canalProps=this.keyAtlas('canal-props');if(canalArchitecture&&canalProps)registerCanalFrames(canalArchitecture,canalProps);
    const kilnEnvironment=this.keyAtlas('kiln-environment'),kilnProps=this.keyAtlas('kiln-props'),kilnDuqin=this.keyAtlas('kiln-duqin');if(kilnEnvironment&&kilnProps&&kilnDuqin)registerKilnFrames(kilnEnvironment,kilnProps,kilnDuqin);
    const marketEnvironment=this.keyAtlas('market-environment'),marketProps=this.keyAtlas('market-props'),marketShenyan=this.keyAtlas('market-shenyan');if(marketEnvironment&&marketProps&&marketShenyan)registerMarketFrames(marketEnvironment,marketProps,marketShenyan);
    const enemies=this.keyAtlas('enemies');
    if(enemies){const boxes=[[120,19,428,688],[734,66,458,628],[68,774,489,396],[690,784,493,385]];boxes.forEach((b,i)=>enemies.add(String(i),0,b[0],b[1],b[2],b[3]));}
    this.state=createGame({name:'行舟',origin:'herbalist',wish:'travel',appearance:0});
    this.landscape=this.add.container(0,0);
    this.worldLabels=this.add.container(0,0).setDepth(15000);
    this.effects=this.add.graphics().setDepth(12000);
    this.canalWater=this.add.graphics().setDepth(-900);
    this.hoverLabel=this.add.text(0,0,'',{fontFamily:FONT,fontSize:'13px',color:'#f5f3df',backgroundColor:'#2d4944',padding:{x:12,y:8},align:'center'}).setResolution(display.density).setOrigin(.5,1).setDepth(25000).setVisible(false);
    this.player=this.makeCharacter('player',0,0,0);this.playerHand=this.add.graphics();this.player.add(this.playerHand);
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ONE,TWO,THREE,E,R,C,Q,J,I,M,ESC',false) as Record<string,Phaser.Input.Keyboard.Key>;
    this.ui=new GameUI({get:()=>this.state,act:a=>this.dispatch(a),replace:s=>this.replace(s),select:s=>this.select(s),center:()=>this.center(),pan:()=>{this.panMode=!this.panMode;this.dragStart=null;},panning:()=>this.panMode,settings:s=>{this.settings=s;},aiming:()=>this.casting,cancel:()=>this.cancelAim()},this.soundscape);
    window.addEventListener('pointermove',e=>{this.pointerOverWorld=e.target===this.game.canvas;});
    window.addEventListener('pointerdown',e=>{this.pointerOverWorld=e.target===this.game.canvas;});
    window.addEventListener('keydown',e=>{
      const typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName||'');
      if(!typing&&!this.ui.blocked&&[' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
    });
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>this.pointerDown(p));
    const endCameraDrag=()=>{this.dragStart=null;};
    this.input.on('pointerup',endCameraDrag);
    this.input.on('pointerupoutside',endCameraDrag);
    // DOM controls can receive mouseup instead of the canvas. Release globally
    // so returning to the world never continues a finished camera gesture.
    const dragReleaseEvents=['mouseup','touchend','touchcancel','pointercancel','blur'] as const;
    for(const event of dragReleaseEvents)window.addEventListener(event,endCameraDrag,true);
    this.events.once('shutdown',()=>{for(const event of dragReleaseEvents)window.removeEventListener(event,endCameraDrag,true);});
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.dragStart){this.cameraManual=true;this.cameras.main.scrollX=this.dragStart.cx-(p.x-this.dragStart.x)/this.cameras.main.zoom;this.cameras.main.scrollY=this.dragStart.cy-(p.y-this.dragStart.y)/this.cameras.main.zoom;}});
    window.addEventListener('blur',()=>{this.dispatch({type:'pause',value:true});this.keys&&Object.values(this.keys).forEach(k=>k.reset());});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.dispatch({type:'pause',value:true});});
    this.scale.on('resize',()=>{this.updateCameraScale();this.hoverLabel.setResolution(display.density);this.renders.forEach(r=>r.label.setResolution(display.density));this.center();});
    this.updateCameraScale();
    this.events.once('shutdown',()=>this.soundscape.dispose());
    this.refreshScene();this.center();
    // Read-only runtime evidence. QA must operate through real input; no state setters.
    Object.defineProperty(window,'__XIAN_NI__',{configurable:true,value:{
      inspect:()=>JSON.parse(snapshot(this.state)),
      screenPoint:(x:number,y:number)=>{const c=this.cameras.main,o=c.getWorldPoint(0,0);return{x:(x-o.x)*c.zoom/display.density,y:(y-o.y)*c.zoom/display.density};},
      scene:()=>SCENES[this.state.scene],
      presentation:()=>({actors:[...this.renders.entries()].filter(([,r])=>r.container.visible&&(r.image||r.lifeVisual?.getData('image'))).map(([id,r])=>{const image=r.image||r.lifeVisual!.getData('image') as Phaser.GameObjects.Image;return{id,x:r.container.x,y:r.container.y,angle:image.angle,flipX:image.flipX,frame:image.frame.name};}),player:{x:this.playerImage?.x,y:this.playerImage?.y,angle:this.playerImage?.angle,scaleY:this.playerImage?.scaleY,flipX:this.playerImage?.flipX},labels:[...this.renders.entries()].filter(([,r])=>r.container.visible&&r.label.visible).map(([id,r])=>({id,text:r.label.text,bounds:{x:r.label.getBounds().x,y:r.label.getBounds().y,w:r.label.width,h:r.label.height}}))}),
      audio:()=>this.soundscape.inspect(),
      feedback:()=>({active:this.feedback.active.map(e=>({...e})),recent:this.feedback.recent.map(e=>({...e}))}),
    }});
  }
  private keyCharacters(){
    const canvas=this.keyAtlas('characters');
    if(!canvas)return;
    const boxes=[[182,0,325,627],[771,0,317,627],[178,627,351,627],[754,627,327,627]];
    boxes.forEach((b,i)=>canvas.add(String(i),0,b[0],b[1],b[2],b[3]));
    document.documentElement.style.setProperty('--character-image',`url("${canvas.getCanvas().toDataURL()}")`);
  }
  private keyEnvironment(){
    const canvas=this.keyAtlas('environment');
    if(!canvas)return;
    const frames:Record<string,number[]>={inn:[15,28,621,591],shelter:[654,109,584,510],rocks:[31,696,582,447],shrubs:[631,689,605,468]};
    for(const [name,b] of Object.entries(frames))canvas.add(name,0,b[0],b[1],b[2],b[3]);
  }
  private keyAtlas(key:string){
    if(!this.textures.exists(`${key}-source`))return;
    const source=this.textures.get(`${key}-source`).getSourceImage() as HTMLImageElement;
    const canvas=this.textures.createCanvas(key,source.width,source.height);
    if(!canvas)return;
    const ctx=canvas.getContext();ctx.drawImage(source,0,0);
    const image=ctx.getImageData(0,0,source.width,source.height);
    for(let i=0;i<image.data.length;i+=4){
      const r=image.data[i],g=image.data[i+1],b=image.data[i+2];
      const excess=Math.min(r-g,b-g);
      if(excess>85&&r>140&&b>140)image.data[i+3]=0;
      else if(excess>40&&r>120&&b>120){image.data[i+3]=Math.round(255*(85-excess)/45);image.data[i]=Math.min(r,g+40);image.data[i+2]=Math.min(b,g+40);}
      else if(excess>18){image.data[i]=Math.min(r,g+16);image.data[i+2]=Math.min(b,g+16);}
    }
    ctx.putImageData(image,0,0);canvas.refresh();
    return canvas;
  }
  private replace(s:GameState){
    this.ui?.resetObservation();
    this.state=s;this.renderedScene='';this.groundVersion='';this.queuedInteract=null;this.casting=false;this.accumulator=0;
    this.feedback.reset(s.events.at(-1)?.seq??0);this.impactLabels.forEach(label=>label.destroy());this.impactLabels.clear();
    this.refreshScene();this.center();
  }
  private dispatch(a:GameAction){
    const queuedCast=a.type==='pause'&&!a.value&&this.state.pending?.type==='cast'?this.state.pending:undefined;
    const result=act(this.state,a);
    if(queuedCast&&result.ok&&(queuedCast.spell!=='pull'||!this.state.player.pullId))this.casting=false;
    if(!result.ok&&result.message)this.ui?.notify(result.message);
    if(a.type==='retry'||a.type==='retreat'){this.feedback.reset(this.state.events.at(-1)?.seq??0);this.renderedScene='';this.queuedInteract=null;this.refreshScene();this.center();}
    if(a.type==='interact'||a.type==='choose'||a.type==='release'||a.type==='hold'){this.casting=false;this.panMode=false;this.dragStart=null;}
    this.ui?.update();
    return result;
  }
  private cancelAim(){this.casting=false;this.queuedInteract=null;this.dispatch({type:'cancel'});}
  private select(spell:Spell){this.panMode=false;this.dragStart=null;this.casting=true;this.queuedInteract=null;this.dispatch({type:'select',spell});this.ui?.notify({pull:'引力术：点轻物牵起，再点地面放下。',flame:'火焰球：对准干物或威胁，点击施术。',ward:'护符·障：朝需要保护的方向点击。'}[spell]);}
  private updateCameraScale(){
    const width=this.scale.width/display.density,height=this.scale.height/display.density;
    const homeDesktop=this.state.scene==='home'&&width>=1000;
    const scale=homeDesktop?Math.min(1,height/900):display.worldScale;
    // Cover the whole viewport even when it exceeds the map's native world dimensions.
    const map=SCENES[this.state.scene];
    this.cameras.main.setZoom(display.density*Math.max(scale,width/map.width,height/map.height));
  }
  private cameraLead(){
    // Tall desktop views include the inn facade; shorter views keep the player above the controls.
    if(this.state.scene!=='home'||this.scale.width/display.density<1000)return 55;
    const height=this.scale.height/display.density,zoom=this.cameras.main.zoom/display.density;
    return Math.min(190,Math.max(0,(height/2-135)/zoom));
  }
  private center(){this.panMode=false;this.dragStart=null;this.cameraManual=false;if(this.state)this.cameras.main.centerOn(this.state.player.x,this.state.player.y-this.cameraLead());}
  private pointerDown(p:Phaser.Input.Pointer){
    if(this.ui?.blocked||this.state.defeated)return;
    this.soundscape.start();
    if(this.panMode||p.middleButtonDown()||(p.leftButtonDown()&&p.event.shiftKey)){
      this.dragStart={x:p.x,y:p.y,cx:this.cameras.main.scrollX,cy:this.cameras.main.scrollY};return;
    }
    if(this.state.dialogue)return;
    if(p.rightButtonDown()){this.casting=false;this.queuedInteract=null;this.dispatch({type:'release'});return;}
    const point={x:p.worldX,y:p.worldY};
    const entity=this.entityAt(point);
    if(this.state.player.pullId&&this.state.player.hold<=0&&this.state.selected==='pull'){
      this.dispatch({type:'move',point:this.pullLanding(point)});
      return;
    }
    if(this.casting){
      const cast=this.dispatch({type:'cast',spell:this.state.selected,targetId:entity?.id,point:castTargetPoint(this.state.selected,point,entity)});
      if(cast.ok&&!this.state.paused&&(this.state.selected!=='pull'||!this.state.player.pullId))this.casting=false;
      this.ui.update();
    }else if(entity&&entity.kind!=='scenery'){
      const d=Phaser.Math.Distance.Between(this.state.player.x,this.state.player.y,entity.x,entity.y);
      this.queuedInteract=null;
      if(entity.kind==='enemy'){this.ui.notify('留意对方起手；可选火焰球打断，或护符挡住来袭。');return;}
      const destination=interactionPoint(this.state,entity.id);
      if(!destination){this.ui.notify('暂时走不到它身边，先找一条可通行的路。');return;}
      if(d<96&&Math.hypot(destination.x-this.state.player.x,destination.y-this.state.player.y)<1)this.dispatch({type:'interact',targetId:entity.id});
      else{const moving=this.dispatch({type:'move',point:destination});if(moving.ok){this.queuedInteract=entity.id;this.ui.notify(`走近${entity.name}后互动；点别处可改变打算。`);}}
    }else{this.queuedInteract=null;this.dispatch({type:'move',point});}
  }
  private pullLanding(point:Vec):Vec {
    const anchor=placementAnchors(this.state).filter(a=>Math.hypot(a.x-point.x,a.y-point.y)<=32).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
    // A helper never snaps an otherwise legal click onto an invalid authored landing.
    return anchor&&previewPullMove(this.state,anchor).valid?{x:anchor.x,y:anchor.y}:point;
  }
  private entityAt(p:Vec){
    return this.state.worlds[this.state.scene].filter(e=>(e.type!=='xu'||companionAvailable(this.state))&&!['taken','gone','hidden'].includes(e.state)&&e.kind!=='scenery'&&!(e.id==='lamp'&&this.state.flags.lampFixed)&&!(e.id==='market_door'&&e.state==='open'))
      .filter(e=>!this.casting||this.state.selected!=='pull'||Boolean(this.state.player.pullId)||e.movable)
      .map(e=>({e,d:Math.hypot(e.x-p.x,(e.y-p.y)*.9)}))
      .filter(({e,d})=>d<Math.max(34,Math.max(e.w,e.h)*.65)||Math.abs(e.x-p.x)<e.w*.6&&p.y<e.y&&p.y>e.y-e.h)
      .sort((a,b)=>a.d-b.d)[0]?.e;
  }
  update(_time:number,delta:number){
    if(!this.state||!this.ui)return;
    const focused=document.activeElement?.tagName;
    const typing=focused==='INPUT'||focused==='TEXTAREA';
    let input={x:0,y:0};
    if(!typing&&!this.ui.isTitle){
      const just=(name:string)=>Phaser.Input.Keyboard.JustDown(this.keys[name]);
      if(just('ESC')){this.ui.shortcut('Escape');this.casting=false;this.queuedInteract=null;this.dispatch({type:'release'});}
      if(just('J'))this.ui.shortcut('j');if(just('I'))this.ui.shortcut('i');if(just('M'))this.ui.shortcut('m');
      if(!this.ui.blocked&&!this.state.dialogue&&!this.state.defeated){
        if(just('SPACE'))this.dispatch({type:'pause',value:!this.state.paused});
        if(just('ONE'))this.select('pull');if(just('TWO'))this.select('flame');if(just('THREE'))this.select('ward');
        if(just('C'))this.center();
        if(just('Q'))this.ui.toggleObservation();
        if(just('R'))this.dispatch({type:'hold'});
        if(just('E')){const e=nearbyEntity(this.state);if(e)this.dispatch({type:'interact',targetId:e.id});}
        input={x:Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),y:Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown)};
        if(input.x||input.y){this.panMode=false;this.dragStart=null;this.queuedInteract=null;this.cameraManual=false;}
      }
    }
    this.accumulator+=Math.min(delta,100)/1000;
    while(this.accumulator>=1/60){tick(this.state,1/60,input);this.accumulator-=1/60;}
    if(this.queuedInteract&&!this.state.paused&&!this.state.dialogue){
      const e=this.state.worlds[this.state.scene].find(e=>e.id===this.queuedInteract);
      if(e&&canInteract(this.state,e.id)){this.queuedInteract=null;this.dispatch({type:'interact',targetId:e.id});}
      else if(!e||!this.state.player.path.length){this.queuedInteract=null;this.ui.notify('还没走到可互动的位置；请沿近处的路重新点选。');}
    }
    if(this.renderedScene!==this.state.scene)this.refreshScene();
    const ground=`${this.state.scene}:${this.state.flags.gateOpen}:${this.state.flags.ridgeOpen}:${this.state.flags.platformOpen}:${this.state.flags.returned}:${this.state.flags.chime}:${this.state.flags.endingWish}:${this.state.flags.roomTalk}:${this.state.flags.herbsWet}:${this.state.flags.herbsRepaired}:${this.state.canal.stage}:${this.state.canal.cleared}`;
    if(ground!==this.groundVersion){this.groundVersion=ground;this.paintLandscape();}
    if(!this.state.paused&&!this.state.dialogue&&!this.state.defeated)this.feedback.advance(delta);
    for(const event of this.feedback.ingest(this.state.events,this.state.player)){
      if(this.ui.isTitle)continue;
      this.soundscape.play(event.targetId==='market_door'&&event.type==='change'?'market-gate':event.type);
      if(['hit','hurt','block'].includes(event.type)&&!this.settings.reduced)this.cameras.main.shake(event.type==='hurt'?100:65,event.type==='hurt'?.0022:.0012,false);
    }
    this.drawEntities(delta);this.drawEffects();
    const p=this.state.player;
    const moving=Math.hypot(p.x-this.lastX,p.y-this.lastY)>.01;
    if(!this.state.paused&&!this.state.dialogue){this.motionMoving=moving;if(moving)this.walking+=delta*.012;}
    if(moving&&!this.state.paused){this.stepClock+=delta;if(this.stepClock>340){this.stepClock=0;this.soundscape.play('step');}}else this.stepClock=250;
    this.player.setPosition(p.x,p.y).setDepth(p.y+100);
    const targetScale=this.textures.exists('characters')? .13 : 1;
    if(this.playerImage){
      const hit=this.feedback.active.filter(e=>e.kind==='hurt'&&e.age<240).at(-1);
      const pose=playerPose(this.state,this.motionMoving,this.walking,this.settings.reduced,hit?.age??null);
      this.playerImage.setFrame(String(this.state.profile.appearance)).setFlipX(pose.flipX);
      this.playerImage.setPosition(pose.x,pose.y).setAngle(pose.angle);
      this.playerImage.setScale(targetScale,targetScale*pose.scaleY).setAlpha(p.invulnerable>0&&Math.sin(this.state.time*25)>0?.65:1);
      if(hit&&hit.age<120)this.playerImage.setTintFill(0xffdfcd);else this.playerImage.clearTint();
    }
    this.playerHand.clear();
    if(this.state.life.harvest.picking){const side=this.playerImage?.flipX?-1:1;this.playerHand.lineStyle(2,0xa0ae88,.8);this.playerHand.lineBetween(side*12,-23,side*21,-19);this.playerHand.lineBetween(side*16,-23,side*22,-26);}
    if((p.pullId&&p.hold<=0)||this.casting){const side=Math.cos(p.facing)>0?1:-1;this.playerHand.fillStyle(0xa9c9b8,.2);this.playerHand.fillCircle(side*20,-36,6);}
    this.lastX=p.x;this.lastY=p.y;
    if(!this.cameraManual){
      const camera=this.cameras.main;const tx=p.x-camera.width/2,ty=p.y-camera.height/2-this.cameraLead();
      camera.scrollX=Phaser.Math.Linear(camera.scrollX,tx,this.settings.reduced?1:.1);
      camera.scrollY=Phaser.Math.Linear(camera.scrollY,ty,this.settings.reduced?1:.1);
    }
    this.uiClock+=delta;if(this.uiClock>110){this.uiClock=0;this.ui.update();}
  }
  private refreshScene(){
    this.renderedScene=this.state.scene;this.motionMoving=false;this.walking=0;this.lastX=this.state.player.x;this.lastY=this.state.player.y;
    this.renders.forEach(r=>r.container.destroy());this.renders.clear();
    this.worldLabels.removeAll(true);
    this.feedback.active=[];this.impactLabels.forEach(label=>label.destroy());this.impactLabels.clear();
    const map=SCENES[this.state.scene];this.cameras.main.setBounds(0,0,map.width,map.height);this.updateCameraScale();
    this.paintLandscape();
    for(const e of this.state.worlds[this.state.scene])this.makeEntity(e);
    this.soundscape.setScene(this.state.scene);this.center();
  }
  private polygon(g:Phaser.GameObjects.Graphics,points:number[],color:number,alpha=1){
    g.fillStyle(color,alpha);g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.closePath();g.fillPath();
  }
  private paintLandscape(){
    this.homeFacade?.destroy();this.homeFacade=undefined;
    this.landscape.removeAll(true);
    const m=SCENES[this.state.scene],g=this.add.graphics();this.landscape.add(g);
    const rand=seeded(['home','creek','workshop','crossing','canal','kiln','market'].indexOf(m.id)*43+83);
    const terrainKey='terrain-detail';
    if(this.textures.exists(terrainKey))this.textures.remove(terrainKey);
    const terrain=this.textures.createCanvas(terrainKey,m.width*2,m.height*2)!;
    const context=terrain.getContext();context.scale(2,2);paintTerrain(context,m,this.textures.get(`${m.id}-ground`).getSourceImage() as HTMLImageElement,this.textures.get('water-surface').getSourceImage() as HTMLImageElement);
    if(m.id==='crossing'&&this.state.flags.gateOpen){
      const source=this.textures.get('crossing-ground').getSourceImage() as HTMLImageElement;
      context.drawImage(source,1180/1800*source.width,650/1100*source.height,140/1800*source.width,210/1100*source.height,1180,650,140,210);
    }
    terrain.refresh();
    this.landscape.addAt(this.add.image(0,0,terrainKey).setOrigin(0).setScale(.5),0);
    // Vegetation belongs to edges and landmarks, with open lanes between groups.
    if(m.id!=='kiln'&&m.id!=='market')for(const [x,y] of [[70,90],[150,67],[490,48],[1210,75],[1660,65],[1740,135],[95,1025],[170,1010],[560,1050],[1430,1040],[1630,1010]])this.bush(g,x,y,26+rand()*24,rand);
    if(m.id==='home')this.paintHome(g,rand);
    if(m.id==='creek')this.paintCreek(g,rand);
    if(m.id==='workshop')this.paintWorkshop(g,rand);
    if(m.id==='crossing')this.paintCrossing(g,rand);
    if(m.id==='canal')paintCanalLandscape(this,this.landscape,g);
    if(m.id==='market')paintMarketLandscape(this,this.landscape,g);
    if(m.id==='kiln')paintKilnLandscape(this,this.landscape,g);
    for(const ob of m.obstacles){
      if(m.id==='kiln'||m.id==='market')continue; // Kiln art draws exact wall rectangles including top and end faces.
      if(ob.flag&&this.state.flags[ob.flag])continue;
      // All collision rectangles have visible geometry, never invisible walls.
      if(m.id==='crossing'&&ob.x===1180)continue;
      if(m.id==='home'&&ob.y===240)continue;
      if(m.id==='home'&&ob.x===660){this.environmentProp('rocks',770,660,229,165);continue;}
      if(m.id==='canal'){
        // A bank consists of overlapping natural rock groups; stretching one sprite
        // across a tall collision rectangle turns it into a featureless pillar.
        const rows=Math.max(1,Math.ceil(ob.h/(ob.w*.65)));
        for(let row=0;row<rows;row++){
          const width=ob.w-(row%2)*5,height=Math.min(ob.h,width*.77);
          const foot=ob.y+height+(ob.h-height)*row/Math.max(1,rows-1);
          this.environmentProp('rocks',ob.x+ob.w/2,foot,width,height)?.setFlipX(row%2===1);
        }
        continue;
      }
      if(m.id==='creek'){
        if(ob.y>=425)continue; // These obstacles are water, whose shoreline is already painted at its actual footprint.
        this.parapet(ob.x,ob.y,ob.w,ob.h);
      }
      else if(m.id==='workshop'&&ob.w<40){const fence=this.add.image(ob.x+ob.w/2,ob.y+ob.h,'detail-props','fence').setOrigin(.5,1).setDisplaySize(ob.w+8,ob.h+15);this.landscape.add(fence);}
      else{this.landscapeRock(g,ob.x+ob.w/2,ob.y+ob.h/2,ob.w*.5,ob.h*.5);}
    }
    // Bake immutable brushwork once; replaying thousands of paths every frame stalls software WebGL.
    const groundKey='ground-baked';
    if(this.textures.exists(groundKey))this.textures.remove(groundKey);
    g.setScale(2);g.generateTexture(groundKey,m.width*2,m.height*2);
    this.landscape.remove(g,true);
    // Keep the keyed prop images above the baked ground; only the brushwork is replaced.
    this.landscape.addAt(this.add.image(0,0,groundKey).setOrigin(0).setScale(.5),1);
    this.landscape.setDepth(-1000);
  }
  private environmentProp(frame:string,x:number,y:number,width:number,height?:number){
    if(!this.textures.exists('environment'))return;
    const image=this.add.image(x,y,'environment',frame).setOrigin(.5,1);
    image.setDisplaySize(width,height??width*image.height/image.width);
    this.landscape.add(image);
    return image;
  }
  private regionalProp(frame:string,x:number,y:number,w:number,h:number){
    const image=this.add.image(x,y,'region-architecture',frame).setOrigin(.5,1).setDisplaySize(w,h);
    this.landscape.add(image);return image;
  }
  private parapet(x:number,y:number,w:number,h:number){
    if(w>=h){for(let left=x;left<x+w;left+=100)this.regionalProp('parapet',left+Math.min(100,x+w-left)/2,y+h,Math.min(100,x+w-left),42);}
    else{for(let top=y;top<y+h;top+=90){const length=Math.min(90,y+h-top);this.regionalProp('parapet',x+w/2,top+length/2,length,w).setOrigin(.5).setAngle(90);}}
  }
  private landscapeRock(g:Phaser.GameObjects.Graphics,x:number,y:number,rx:number,ry:number){
    if(!this.environmentProp('rocks',x,y+ry,rx*2.08,Math.max(ry*2,rx*1.5)))this.rock(g,x,y,rx,ry);
  }
  private bush(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number,rand:()=>number){
    if(this.textures.exists('environment')){this.environmentProp('shrubs',x,y+r*.35,r*1.8)?.setFlipX(rand()>.5);return;}
    g.fillStyle(0x466542,.13);g.fillEllipse(x+8,y+14,r*2.1,r*.9);
    for(let i=0;i<7;i++){const a=i*.9;g.fillStyle([0x78976b,0x678765,0x89a779][i%3],.8);g.fillEllipse(x+Math.cos(a)*r*.48,y+Math.sin(a)*r*.21,r*(.9+rand()*.35),r*.65);}
    g.lineStyle(1,0xc1cd9c,.3);for(let i=0;i<5;i++)g.lineBetween(x-15+i*7,y-8,x-8+i*7,y-14);
  }
  private rock(g:Phaser.GameObjects.Graphics,x:number,y:number,rx:number,ry:number){
    g.fillStyle(0x3e5b45,.16);g.fillEllipse(x+9,y+ry*.6,rx*2.1,ry*.9);
    this.polygon(g,[x-rx,y+ry*.5,x-rx*.85,y-ry*.2,x-rx*.25,y-ry,x+rx*.6,y-ry*.7,x+rx,y+ry*.2,x+rx*.7,y+ry*.7,x-rx*.5,y+ry*.8],0x879986);
    this.polygon(g,[x-rx*.85,y-ry*.2,x-rx*.25,y-ry,x+rx*.6,y-ry*.7,x+rx*.3,y,x-rx*.3,y+ry*.25],0xa6b29d);
    g.lineStyle(2,0xc6ccb2,.5);g.lineBetween(x-rx*.65,y-ry*.22,x-rx*.1,y-ry*.55);g.lineStyle(2,0x526d56,.4);g.lineBetween(x+rx*.3,y,x+rx*.7,y+ry*.65);
    g.fillStyle(0x647f56,.8);g.fillEllipse(x-rx*.3,y+ry*.65,rx*.5,ry*.22);
  }
  private roof(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number){
    g.fillStyle(0x253f35,.12);g.fillRoundedRect(x+12,y+14,w,h,4);
    this.polygon(g,[x-18,y+h*.5,x+20,y,x+w-20,y,x+w+18,y+h*.5,x+w,y+h,x,y+h],0x516b61);
    this.polygon(g,[x+20,y,x+w-20,y,x+w+18,y+h*.5,x-18,y+h*.5],0x698276);
    g.lineStyle(2,0xa6b59b,.55);g.lineBetween(x+20,y+3,x+w-20,y+3);
    for(let xx=x+15;xx<x+w;xx+=16){g.lineStyle(1,0x263f35,.26);g.lineBetween(xx,y+6,xx-10,y+h*.5);g.lineBetween(xx-10,y+h*.5,xx,y+h-4);}
    for(let yy=y+12;yy<y+h;yy+=14){g.lineStyle(1,0xb8c3a5,.25);g.lineBetween(x+5,yy,x+w-5,yy);}
    g.lineStyle(4,0x405c4e);g.lineBetween(x-18,y+h*.5,x+w+18,y+h*.5);
  }
  private house(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number){
    g.fillStyle(0xada486);g.fillRect(x,y,w,h);
    for(let xx=x+12;xx<x+w;xx+=55){g.fillStyle(0x716b51);g.fillRect(xx,y+10,6,h-10);g.fillStyle(0xd6bd7f);g.fillRect(xx+13,y+20,24,38);g.lineStyle(2,0x776c4d);g.strokeRect(xx+13,y+20,24,38);g.lineBetween(xx+25,y+20,xx+25,y+58);}
    this.roof(g,x-20,y-60,w+40,90);
  }
  private paintHome(g:Phaser.GameObjects.Graphics,rand:()=>number){
    // One continuous facade occupies the existing solid foundation, with an open working apron below.
    if(this.textures.exists('home-inn')){
      this.homeFacade=this.add.image(675,337,'home-inn','facade').setOrigin(.5,1).setDisplaySize(947,310).setDepth(435);
    }else this.house(g,240,240,870,95);
    // Planting belongs to the edges of the yard; the southern route stays visually open.
    for(const [x,y,r] of [[174,335,67],[153,450,48],[1472,325,60],[1503,418,43],[163,960,75],[260,1000,64],[1515,1010,75],[1380,1040,57]])this.bush(g,x,y,r,rand);
    this.environmentProp('rocks',1510,1030,156,100)||this.rock(g,1510,1000,78,30);
    // Low broken rail sections frame the garden, rather than a ruler across the entire screen.
    for(const [left,right,y] of [[120,250,910],[430,565,952],[1150,1300,987],[1520,1660,900]]){
      for(let x=left;x<right;x+=48){
        g.lineStyle(6,0x665d46);g.lineBetween(x,y-26,x,y+12);
        g.lineStyle(2,0xb6a27d);g.lineBetween(x-2,y-26,x-2,y+9);
        if(x+48<right){g.lineStyle(5,0x85765a);g.lineBetween(x,y-17,x+48,y-14);g.lineBetween(x,y+1,x+48,y+4);}
      }
    }
    // The returned cart and ridge sign carry route changes on the finished yard.
    if(this.state.flags.returned){
      g.fillStyle(0xf3d99e,.055);g.fillRect(0,0,1800,390);
      if(this.state.flags.chime){
        g.lineStyle(3,0x816e4c);g.lineBetween(1138,321,1138,347);g.lineStyle(2,0xb7a679);g.lineBetween(1138,347,1138,374);
        g.fillStyle(0xc7b77c);g.fillTriangle(1125,387,1151,387,1138,366);g.lineStyle(1,0x6b7558);g.lineBetween(1138,386,1138,408);g.fillStyle(0xc9d9bf);g.fillRect(1133,407,10,22);
      }
      if(this.state.flags.ridgeUsed){
        g.lineStyle(5,0x807052);g.lineBetween(1340,817,1340,875);g.fillStyle(0xc9b68a);g.fillRoundedRect(1307,821,69,24,3);g.lineStyle(2,0x5c7258);g.lineBetween(1318,838,1329,828);g.lineBetween(1329,828,1340,838);g.lineBetween(1340,838,1354,830);
      }
    }
  }
  private paintCreek(g:Phaser.GameObjects.Graphics,rand:()=>number){
    this.regionalProp('shelter',1090,600,420,220);
    for(const [x,y] of [[450,200],[520,500],[850,210],[1580,130],[1720,580],[130,980]])this.bush(g,x,y,60,rand);
    // A low outcrop at the back of the lookout leaves the climb and chime interaction clear.
    this.environmentProp('rocks',1340,154,220,90)||this.rock(g,1340,137,145,32);
    g.lineStyle(2,0x6f855f,.55);for(let x=1120;x<1480;x+=50)g.lineBetween(x,316,x+35,316);
  }
  private paintWorkshop(g:Phaser.GameObjects.Graphics,rand:()=>number){
    this.regionalProp('workshop',1400,435,535,248);
    for(const [x,y] of [[120,450],[420,380],[560,280],[800,310],[1110,230],[1700,730],[800,960],[1380,960]])this.bush(g,x,y,68,rand);
    g.fillStyle(0x4c604d,.12);g.fillEllipse(800,723,340,70);
  }
  private paintCrossing(g:Phaser.GameObjects.Graphics,rand:()=>number){

    this.regionalProp('sluice',1152,752,196,230);
    if(this.state.flags.ridgeOpen){
      for(let y=193;y<340;y+=24){const plank=this.add.image(1250,y,'journey-props','board').setDisplaySize(148,27);this.landscape.add(plank);}
      g.lineStyle(3,0x72664b);g.lineBetween(1175,180,1325,180);g.lineBetween(1175,339,1325,339);
      g.lineStyle(1,0xc2ac7e);g.lineBetween(1175,178,1325,178);g.lineBetween(1175,337,1325,337);
    }
    for(const [x,y] of [[130,250],[350,350],[1650,400],[1730,670],[640,1040]])this.bush(g,x,y,55,rand);
    this.environmentProp('rocks',1500,1062,180,110)||this.rock(g,1500,1030,90,32);
    this.environmentProp('rocks',900,192,210,100)||this.rock(g,900,160,105,32);
  }
  private makeCharacter(type:string,x:number,y:number,frame:number){
    const container=this.add.container(x,y);
    const shadow=this.add.ellipse(0,0,42,14,0x264b38,.22);container.add(shadow);
    if(this.textures.exists('characters')){
      const image=this.add.image(0,5,'characters',String(frame)).setOrigin(.5,1).setScale(.13);container.add(image);
      if(type==='player')this.playerImage=image;
    }else{
      const g=this.add.graphics();g.fillStyle(frame===3?0x68875d:frame===2?0x86705a:0x617e82);g.fillTriangle(-15,-6,15,-6,0,-43);g.fillStyle(0xd7b99a);g.fillCircle(0,-49,13);g.fillStyle(0x344437);g.fillEllipse(0,-57,27,14);container.add(g);
    }
    return container;
  }
  private journeyFrame(e:Entity):string|undefined {
    if(e.id==='journey_north_mark')return 'stele';
    if(e.id==='journey_south_mark')return 'rope';
    const frames:Record<string,string>={boat:'boat',basket:'basket',board:'board',shield_board:'board',platform_beam:'board',platform_ladder:'ladder',return_ladder:'ladder',ridge_rope:'ladder',rope:'rope',trial:'trial',straw:'straw',bag:'bag',marks:'stele',negotiator:'stele',far_bank:'stele',ridge_marker:'stele'};
    return frames[e.type];
  }
  private makeEntity(e:Entity){
    const art=this.add.graphics(),label=this.add.text(0,15,e.name,{fontFamily:FONT,fontSize:'12px',color:'#344d3d',backgroundColor:'#eaf0d9cc',padding:{x:6,y:3}}).setResolution(display.density).setOrigin(.5,0);
    if(e.kind==='exit')configureWayfindingLabel(label,e.name,display.density);
    let container:Phaser.GameObjects.Container;let image:Phaser.GameObjects.Image|undefined;let propImage:Phaser.GameObjects.Image|undefined;
    const canalVisual=this.state.scene==='canal'?createCanalVisual(this,e):undefined;
    const kilnVisual=this.state.scene==='kiln'?createKilnVisual(this,e):undefined;
    const marketVisual=this.state.scene==='market'?createMarketVisual(this,e):undefined;
    if(marketVisual){container=this.add.container(e.x,e.y,[marketVisual,art,label]);}
    else if(kilnVisual){container=this.add.container(e.x,e.y,[kilnVisual,art,label]);if(e.id==='duqin')image=kilnVisual.getData('image') as Phaser.GameObjects.Image|undefined;}
    else if(canalVisual){container=this.add.container(e.x,e.y,[canalVisual,art,label]);}
    else if(e.kind==='npc'){
      container=this.makeCharacter(e.type,e.x,e.y,e.type==='tao'?2:3);
      image=container.list.find(o=>o instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
      if(e.type==='keeper'&&image)image.setTexture('canal-props','keeper').setDisplaySize(36,84);
      container.add(art);container.add(label);
    }else if(e.kind==='enemy'&&this.textures.exists('enemies')){
      const frame=(e.type==='beast'?2:0)+(e.id.endsWith('_b')?1:0);
      image=this.add.image(0,5,'enemies',String(frame)).setOrigin(.5,1);
      image.setScale((e.type==='beast'?48:82)/image.height);
      container=this.add.container(e.x,e.y,[art,image,label]);
    }else if(this.state.scene==='home'&&this.textures.get('home-props').has(e.id)){
      const sprite=this.add.image(0,7,'home-props',e.id).setOrigin(.5,1);
      const sizes:Record<string,[number,number]>={table:[142,78],workbench:[138,76],herb_rack:[112,85],return_cart:[156,91],room:[210,175],rest_home:[104,48]};
      sprite.setDisplaySize(...sizes[e.id]);
      container=this.add.container(e.x,e.y,[sprite,art,label]);
    }else if(['decoy','gate','gate_slot','shelter'].includes(e.type)||e.kind==='rest'){
      propImage=this.add.image(0,0,'detail-props',e.kind==='rest'?'rest':e.type).setOrigin(.5,1);
      container=this.add.container(e.x,e.y,[propImage,art,label]);
    }else if(e.type==='rock_source'){
      propImage=this.add.image(0,0,'environment','rocks').setOrigin(.5,1);
      container=this.add.container(e.x,e.y,[propImage,art,label]);
    }else if(e.id.startsWith('life_')){
      const lifeVisual=createLifeVisual(this,e);
      container=lifeVisual?this.add.container(e.x,e.y,[lifeVisual,art,label]):this.add.container(e.x,e.y,[art,label]);
      if(lifeVisual)lifeVisual.setPosition(0,0);
    }else if(this.journeyFrame(e)){
      propImage=this.add.image(0,0,'journey-props',this.journeyFrame(e)).setOrigin(.5,1);
      container=this.add.container(e.x,e.y,[propImage,art,label]);
    }else{container=this.add.container(e.x,e.y,[art,label]);}
    if(this.state.scene==='home'&&['workbench','herb_rack'].includes(e.id)){const extra=createLifeVisual(this,e);if(extra)container.addAt(extra,1);}
    container.setDepth(e.y);const lifeVisual=container.list.find(o=>o instanceof Phaser.GameObjects.Container) as Phaser.GameObjects.Container|undefined;const r:RenderEntity={container,art,label,image,propImage,lifeVisual,stateKey:'',...(e.type==='xu'?{guideMotion:{x:e.x,y:e.y,time:this.state.time,step:0,angle:0}}:{})};this.renders.set(e.id,r);this.drawObject(e,art);return r;
  }
  private drawObject(e:Entity,g:Phaser.GameObjects.Graphics){
    g.clear();const w=e.w,h=e.h;
    if(this.state.scene==='market'&&['market_merchant','market_door','decoy'].includes(e.id))return;
    if(this.state.scene==='kiln'&&['shield_board','duqin','kiln_rest'].includes(e.id))return;
    if(e.type==='gate_slot'&&(e.state==='wedged'||e.state==='fixed')){
      this.polygon(g,[-14,-38,15,-45,18,-38,-12,-31],0x987344);
      g.lineStyle(1.5,0xc4a774);g.lineBetween(-12,-37,14,-43);
      g.lineStyle(2,0x524e40);g.lineBetween(-9,-34,-7,-39);
    }
    if(e.kind==='npc'||e.type==='rock_source'||['decoy','gate','gate_slot','shelter'].includes(e.type)||(e.kind==='rest'&&this.state.scene!=='home'))return;
    if(e.id.startsWith('life_')||(e.id.startsWith('canal_')&&e.kind!=='exit'))return;
    if(this.journeyFrame(e)){
      drawJourneyMark(e,g);
      if(['marks','negotiator','far_bank','ridge_marker'].includes(e.type)){
        g.lineStyle(1.7,0xcfd4b8,.9);g.lineBetween(-10,-33,10,-38);g.lineBetween(-9,-25,8,-29);g.lineBetween(-6,-17,6,-19);
      }
      return;
    }
    if(this.state.scene==='home'&&this.textures.get('home-props').has(e.id)){this.drawHomeState(e,g);return;}
    g.fillStyle(0x354d33,.16);g.fillEllipse(4,6,w*.95,Math.min(22,h*.4));
    if(e.kind==='exit'){drawWayfinding(g,e.name);return;}
    if(e.kind==='rest'){g.fillStyle(0xa9b597);g.fillEllipse(0,0,w,25);g.lineStyle(2,0x72876a);g.strokeEllipse(0,0,w,25);g.fillStyle(0x768a65);g.fillEllipse(0,-4,w*.7,15);g.lineStyle(1,0xd2d7b0,.8);g.strokeEllipse(0,-4,w*.58,10);return;}
    if(e.kind==='enemy'){
      const top=e.type==='beast'?-60:-94;
      if((e.hp??3)>0){for(let i=0;i<3;i++){g.fillStyle(i<(e.hp??3)?0xa36c52:0x8a9173,.9);g.fillRoundedRect(-15+i*11,top,8,3,1);}}
      return;
    }
    switch(e.type){
      case 'lamp':this.lantern(g,0,-20,false);break;
      case 'lamp_stand':
        g.fillStyle(0x586a5c);g.fillEllipse(0,2,34,14);g.lineStyle(8,0x594b37);g.lineBetween(0,0,-4,-70);g.lineBetween(-6,-70,31,-68);
        g.lineStyle(3,0xb29b71);g.lineBetween(-2,-5,-6,-72);g.lineBetween(-5,-73,31,-71);g.lineStyle(2,0xcbb78c);for(let yy=-65;yy<-52;yy+=3)g.lineBetween(-8,yy,2,yy-2);
        g.lineStyle(2,0x554b35);g.lineBetween(29,-68,29,-53);
        if(this.state.flags.lampFixed)this.lantern(g,29,-38,true);break;
      case 'table':case 'workbench':g.fillStyle(0x6a6549);g.fillRect(-w/2+9,-4,7,17);g.fillRect(w/2-16,-4,7,17);g.fillStyle(0x938360);g.fillRoundedRect(-w/2,-28,w,35,3);g.lineStyle(2,0xbdab7f);g.lineBetween(-w/2+5,-24,w/2-5,-24);g.fillStyle(0xe8e0b9);g.fillEllipse(-20,-15,22,10);g.fillStyle(0x93856a);g.fillEllipse(-20,-16,15,6);if(e.type==='workbench'){g.fillStyle(0x636f5b);g.fillRect(10,-24,16,15);g.lineStyle(3,0x8d7452);g.lineBetween(30,-20,48,-7);
        if(this.state.flags.roomTalk||this.state.flags.endingWish==='stay'){g.fillStyle(0x698471);g.fillRect(-47,-23,27,17);g.lineStyle(2,0xd2c49a);g.lineBetween(-40,-18,-28,-18);g.lineBetween(-34,-21,-34,-10);}
        if(this.state.flags.endingWish==='stay'){g.lineStyle(4,0x8a7954);g.lineBetween(37,-18,37,-61);g.lineBetween(37,-61,24,-61);g.lineStyle(3,0xbdae75);g.lineBetween(24,-61,24,-49);g.strokeCircle(24,-42,8);}
      }
      if(e.type==='table'&&this.state.flags.endingWish==='travel'){
        g.fillStyle(0xe9dfb7);g.fillRoundedRect(-42,-29,85,37,2);g.lineStyle(1,0xa7a180);g.strokeRoundedRect(-42,-29,85,37,2);g.lineStyle(2,0x718784);
        const route=this.state.flags.route==='main'?[-33,-17,-8,-14,5,-22,34,-12]:[-33,-16,-17,-25,-7,-11,6,-23,19,-10,34,-16];g.strokePoints(route.reduce<Phaser.Geom.Point[]>((a,n,i)=>{if(i%2===0)a.push(new Phaser.Geom.Point(n,route[i+1]));return a;},[]),false);
        if(this.state.flags.travelInvited){g.lineStyle(2,0x889c5c);g.lineBetween(-28,-4,2,-7);g.lineBetween(2,-7,26,-2);g.fillStyle(0x889c5c);g.fillCircle(26,-2,2);}
        g.fillStyle(0x9e8662);g.fillCircle(-38,-26,3);g.fillCircle(40,5,3);
      }break;
      case 'boat':g.fillStyle(0x746b4b);g.fillEllipse(0,-9,w,36);g.fillStyle(0xb3a176);g.fillEllipse(0,-12,w-12,24);g.fillStyle(0x87734e);g.fillEllipse(0,-13,w-27,15);g.lineStyle(4,0xc0af80);g.lineBetween(-25,-20,-25,-5);g.lineBetween(25,-20,25,-5);break;
      case 'board':case 'shield_board':case 'platform_beam':g.fillStyle(0x847757);g.fillRoundedRect(-w/2,-h*.5,w,h*.58,3);g.lineStyle(2,e.type==='board'?0xa3b7a0:0xbbae87);g.lineBetween(-w/2+5,-h*.4,w/2-4,-h*.4);g.lineStyle(1,0x665f43,.5);g.lineBetween(-w/2+7,-h*.2,w/2-8,-h*.2);break;
      case 'basket':case 'decoy':case 'bag':g.fillStyle(e.state==='wet'?0x6f7354:0xb69c62);g.fillRoundedRect(-w*.42,-29,w*.84,29,6);g.lineStyle(2,0x827951);for(let y=-25;y<0;y+=7)g.lineBetween(-w*.42,y,w*.42,y);g.strokeEllipse(0,-29,w*.84,14);if(e.type==='basket'){g.fillStyle(0x6b8750);g.fillEllipse(-7,-31,19,11);g.fillStyle(0x93a760);g.fillEllipse(7,-33,17,12);}break;
      case 'platform_ladder':case 'return_ladder':case 'ridge_rope':g.lineStyle(3,0xd3c291);g.lineBetween(-14,-60,-14,4);g.lineBetween(14,-60,14,4);g.lineStyle(5,0x9e8b5b);for(let y=-52;y<5;y+=13)g.lineBetween(-14,y,14,y);break;
      case 'rope':g.lineStyle(4,0xc5b07a);g.strokeCircle(0,-10,15);g.lineBetween(12,-18,27,-30);break;
      case 'ring':g.fillStyle(0xe0cc89,.25);g.fillCircle(0,-20,23);g.lineStyle(5,0xa89156);g.strokeCircle(0,-20,12);g.lineStyle(2,0xedda9b);g.strokeCircle(0,-20,9);g.lineStyle(2,0x8f6b51);g.lineBetween(0,-6,8,10);break;
      case 'trial':g.fillStyle(0xb3a37a);g.fillRoundedRect(-18,-29,36,29,2);this.polygon(g,[-18,-29,-7,-38,28,-38,18,-29],0xd6c99d);g.fillStyle(0x8d8260);g.fillRect(15,-27,7,27);break;
      case 'trial_mark':g.lineStyle(2,0xcbd3ae,.7);g.strokeEllipse(0,-5,w,32);g.lineBetween(-12,-5,12,-5);break;
      case 'straw':g.lineStyle(3,e.state==='burning'?0xc17d4a:0xc6b277);for(let i=0;i<18;i++){const a=i*.7;g.lineBetween(Math.cos(a)*30,3,Math.cos(a)*20-8,-10-(i%4)*7);}break;
      case 'gate':g.fillStyle(0x82957b);g.fillCircle(0,-15,19);g.lineStyle(4,0xc9bd8c);g.strokeCircle(0,-15,17);g.lineBetween(0,-32,0,-65);break;
      case 'gate_slot':g.fillStyle(0x776d4f);g.fillRect(-14,-45,28,45);g.fillStyle(0xaa9870);g.fillEllipse(0,-45,30,12);g.lineStyle(4,0xd1bc81);g.lineBetween(-18,-28,18,-28);break;
      case 'chime':g.lineStyle(2,0xa09d73);g.lineBetween(0,-50,0,-24);g.fillStyle(0xb8b17b);g.fillTriangle(-10,-10,10,-10,0,-27);g.lineStyle(1,0x607665);g.lineBetween(0,-10,0,8);break;
      case 'herb_rack':g.lineStyle(5,0x8e7f53);g.lineBetween(-40,-36,-40,6);g.lineBetween(40,-36,40,6);g.lineBetween(-43,-29,43,-29);g.lineBetween(-43,-9,43,-9);g.lineStyle(6,this.state.flags.herbsWet?0x637568:0x6b8b4f);for(let i=-32;i<38;i+=14)g.lineBetween(i,-29,i+5,-16);if(this.state.flags.herbsRepaired){g.fillStyle(0xd5c69e);g.fillRect(-31,-6,62,13);g.lineStyle(3,0x8f995f);for(let x=-23;x<27;x+=12)g.lineBetween(x,-5,x+5,3);}break;
      case 'shelter':break;
      case 'return_cart':g.fillStyle(0x8e7952);g.fillRect(-48,-28,96,30);g.lineStyle(4,0x736848);g.strokeCircle(-32,0,13);g.strokeCircle(32,0,13);g.lineBetween(-44,-20,44,-20);g.lineBetween(42,-18,71,-26);break;
      case 'room':g.fillStyle(0x7a805c);g.fillRect(-33,-54,66,55);g.fillStyle(0x9f9a70);g.fillRect(-29,-51,28,50);g.fillStyle(0xc8b681);g.fillCircle(-5,-22,3);break;
      case 'marks':case 'far_bank':case 'ridge_marker':case 'negotiator':this.rock(g,0,-15,w*.5,h*.55);g.lineStyle(2,0xdce0bd);g.lineBetween(-10,-25,9,-31);g.lineBetween(-9,-18,7,-23);g.lineBetween(-7,-10,10,-16);break;
      default:this.rock(g,0,-10,w*.4,h*.4);
    }
  }
  private drawHomeState(e:Entity,g:Phaser.GameObjects.Graphics){
    // Only state-driven additions live here; the original furniture stays a single detailed sprite.
    if(e.type==='table'&&this.state.flags.endingWish==='travel'){
      g.fillStyle(0xe9dfb7);g.fillRoundedRect(-37,-55,72,20,2);g.lineStyle(1,0xa7a180);g.strokeRoundedRect(-37,-55,72,20,2);
      g.lineStyle(2,0x718784);
      const route=this.state.flags.route==='main'?[-30,-46,-9,-44,5,-50,29,-43]:[-30,-44,-18,-51,-8,-41,5,-50,18,-40,29,-45];
      g.strokePoints(route.reduce<Phaser.Geom.Point[]>((points,n,i)=>{if(i%2===0)points.push(new Phaser.Geom.Point(n,route[i+1]));return points;},[]),false);
      if(this.state.flags.travelInvited){g.lineStyle(2,0x889c5c);g.lineBetween(-25,-38,23,-38);}
    }
    if(e.id==='table'){drawCanalHomeRecord(g,this.state);drawJourneyHomeRecord(g,this.state);drawMarketHomeRecord(g,this.state);}
    if(e.type==='workbench'&&(this.state.flags.roomTalk||this.state.flags.endingWish==='stay')){
      g.fillStyle(0x718977);g.fillRect(-22,-52,23,13);g.lineStyle(1,0xd5c794);g.lineBetween(-18,-48,-5,-48);
      if(this.state.flags.endingWish==='stay'){g.lineStyle(3,0x8a7954);g.lineBetween(43,-38,43,-93);g.lineBetween(43,-93,28,-93);g.lineStyle(2,0xcab57a);g.lineBetween(28,-93,28,-83);g.strokeCircle(28,-76,7);}
    }
    if(e.type==='herb_rack'){
      if(this.state.flags.herbsWet){g.fillStyle(0x426f75,.27);g.fillEllipse(0,-61,87,20);}
      if(this.state.flags.herbsRepaired){g.fillStyle(0xd5c69e);g.fillRoundedRect(-34,-56,68,16,2);g.lineStyle(2,0x80965c);for(let x=-27;x<27;x+=10)g.lineBetween(x,-52,x+5,-44);}
    }
  }
  private lantern(g:Phaser.GameObjects.Graphics,x:number,y:number,lit:boolean){
    if(lit){for(let i=4;i>=1;i--){g.fillStyle(0xffcf78,.028);g.fillCircle(x,y,15+i*11);}}
    g.fillStyle(0x66523b);g.fillEllipse(x,y+1,28,34);g.fillStyle(lit?0xf7ce78:0xd9bc87);g.fillEllipse(x,y,23,30);
    g.fillStyle(lit?0xffe7a2:0xebd5a8,.85);g.fillEllipse(x-3,y-2,10,23);
    g.lineStyle(1.2,0x84613b,.85);for(const dx of [-8,-3,3,8]){g.beginPath();g.moveTo(x+dx*.65,y-13);g.lineTo(x+dx,y);g.lineTo(x+dx*.65,y+13);g.strokePath();}
    g.fillStyle(0x68513a);g.fillRoundedRect(x-10,y-17,20,5,2);g.fillRoundedRect(x-9,y+13,18,4,2);
    g.lineStyle(1.5,0xb99b66);g.lineBetween(x-8,y-16,x+8,y-16);g.lineStyle(2,0x5d4e35);g.strokeEllipse(x,y-21,9,10);
    g.lineStyle(1.5,0xb59056);g.lineBetween(x,y+17,x,y+27);g.fillStyle(0xa57743);g.fillEllipse(x,y+28,4,8);
  }
  private drawEntities(delta:number){
    for(const e of this.state.worlds[this.state.scene]){
      const r=this.renders.get(e.id)||this.makeEntity(e);
      const isGone=(e.type==='xu'&&!companionAvailable(this.state))||['taken','gone','hidden'].includes(e.state)||(e.id==='lamp'&&Boolean(this.state.flags.lampFixed));
      r.container.setVisible(!isGone);if(isGone)continue;
      const key=`${e.state}:${e.hp}:${this.state.flags.lampFixed}:${this.state.life?.repair?.stage}:${this.state.life?.repair?.softened}:${this.state.life?.repair?.latched}:${this.state.life?.repair?.tested}:${this.state.life?.harvest?.sun}:${this.state.life?.harvest?.shade}:${this.state.life?.clamp}:${this.state.flags.gateOpen}:${this.state.flags.ridgeOpen}:${this.state.flags.endingWish}:${this.state.flags.travelInvited}:${this.state.flags.roomTalk}:${this.state.flags.herbsWet}:${this.state.flags.herbsRepaired}:${this.state.canal.stage}:${this.state.canal.cleared}:${this.state.journey.stage}:${this.state.journey.soloRoute}:${this.state.journey.sharedRoute}:${this.state.journey.recordedShared}:${this.state.journey.restOpened}:${JSON.stringify(this.state.market.reported)}`;
      if(r.stateKey!==key){r.stateKey=key;this.drawObject(e,r.art);}
      if(r.lifeVisual){if(this.state.scene==='market')updateMarketVisual(r.lifeVisual,e,this.state,this.settings.reduced);else if(this.state.scene==='kiln'&&['shield_board','duqin','kiln_rest'].includes(e.id))updateKilnVisual(r.lifeVisual,e,this.state,this.settings.reduced);else if(e.id.startsWith('canal_'))updateCanalVisual(r.lifeVisual,e,this.state,this.settings.reduced);else updateLifeVisual(r.lifeVisual,e,this.state,this.settings.reduced);}
      r.container.setPosition(e.x,e.y).setDepth(e.y+(e.kind==='npc'?100:0));
      if(r.propImage){
        const flat=['board','shield_board','platform_beam','boat'].includes(e.type);
        r.propImage.setOrigin(.5,flat?.5:1).setPosition(0,flat?-e.h*.2:3);
        r.propImage.setDisplaySize(e.w,Math.max(25,e.h));
        if(e.type==='platform_beam')r.propImage.setDisplaySize(e.h,e.w).setAngle(90);
        if(e.type==='gate')r.propImage.setDisplaySize(32,55);
        if(e.type==='gate_slot')r.propImage.setDisplaySize(37,66);
        if(e.type==='shelter')r.propImage.setDisplaySize(61,44);
        if(e.id==='journey_north_mark')r.propImage.setDisplaySize(33,43);
        if(e.id==='journey_south_mark')r.propImage.setDisplaySize(36,25);
        if(e.state==='burned')r.propImage.setTint(0x524b3c).setAlpha(.65);
        else if(e.state==='wet')r.propImage.setTint(0x77969b).setAlpha(1);
        else r.propImage.clearTint().setAlpha(1);
      }
      const near=Math.hypot(this.state.player.x-e.x,this.state.player.y-e.y)<180;
      r.label.setVisible((near||e.kind==='exit'||e.id==='ring')&&!(e.id==='market_door'&&e.state==='open'));
      if(e.kind!=='exit')r.label.setText(e.id==='lamp_stand'&&this.state.flags.lampFixed?'挂好的灯盏':e.name);r.label.setAlpha(e.kind==='enemy'?.8:1);
      if(r.image){
        const hit=this.feedback.active.filter(f=>f.kind==='hit'&&f.targetId===e.id&&f.age<260).at(-1);
        const kick=hit&&!this.settings.reduced?Math.sin(Math.PI*hit.age/260)*13:0;
        const leading=r.guideMotion?guideAngle(e,this.state,r.guideMotion,this.settings.reduced):undefined;
        r.image.setPosition(hit?Math.cos(hit.angle)*kick:0,5+(hit?Math.sin(hit.angle)*kick:0));
        r.image.setFlipX(Math.cos(e.facing??0)<0);
        r.image.setAngle(!this.settings.reduced?(hit?kick*.7:e.state==='casting'?-7:leading??(['following','chasing','helping'].includes(e.state)?Math.sin(this.state.time*9)*2:0)):0);
        if(hit&&hit.age<100)r.image.setTintFill(0xffe8b8);else r.image.clearTint();
      }
      if(['defeated','retreated'].includes(e.state))r.container.setAlpha(.45);else r.container.setAlpha(1);
    }
    const boxes:LabelBox[]=[];
    const focus=this.pointerOverWorld&&!this.ui.blocked?this.entityAt({x:this.input.activePointer.worldX,y:this.input.activePointer.worldY})?.id:undefined;
    for(const e of this.state.worlds[this.state.scene]){const r=this.renders.get(e.id);if(!r?.container.visible||!r.label.visible||e.kind==='exit')continue;
      const b=r.label.getBounds();boxes.push({id:e.id,x:b.x,y:b.y,w:b.width,h:b.height,priority:e.id===focus?-1000:Math.hypot(e.x-this.state.player.x,e.y-this.state.player.y)});}
    const shown=new Set(visibleLabels(boxes));for(const box of boxes)this.renders.get(box.id)!.label.setVisible(shown.has(box.id));
    const p=this.input.activePointer,pointerVisible=this.pointerOverWorld&&(!p.wasTouch||p.isDown);
    this.hovered=pointerVisible?this.entityAt({x:p.worldX,y:p.worldY}):undefined;
    if(pointerVisible&&!this.ui.blocked&&!this.state.dialogue&&(this.hovered||this.casting)){
      let text=this.hovered?.name||'';
      let location={x:p.worldX,y:p.worldY},offset=25;
      if(this.state.player.pullId&&this.state.player.hold<=0&&this.state.selected==='pull'){
        location=this.pullLanding(location);const preview=previewPullMove(this.state,location);
        offset=Math.min(100,Math.max(48,(preview.target?.h??30)+16));
        text=this.state.player.pullId==='lamp'&&this.state.flags.lampFixed?'已归架 · 按放下收术':preview.valid?'点击调整 · 到位后放下':preview.reason;
      }
      else if(this.casting){const preview=previewCast(this.state,this.state.selected,this.hovered?.id,castTargetPoint(this.state.selected,{x:p.worldX,y:p.worldY},this.hovered));text=`${this.hovered?.name||'施术落点'}\n${preview.valid?'点击施术 · 灵力 '+preview.cost:preview.reason}`;}
      else if(this.hovered){text+=`\n${inspectObject(this.state,this.hovered)||'走近后按 E 察看'}`;}
      this.hoverLabel.setText(text).setPosition(location.x,location.y-offset).setVisible(true);
    }else this.hoverLabel.setVisible(false);
  }
  private drawEffects(){
    const g=this.effects,p=this.state.player,t=this.state.time;g.clear();
    drawCanalWater(this.canalWater,this.state,this.settings.reduced);
    this.soundscape.setWaterFlow(this.state.scene==='canal'?(this.state.canal.flow>=3?1:1-this.state.canal.drain):0);
    this.drawPlacement();
    if(this.state.scene==='creek'||this.state.scene==='crossing'){
      for(const water of SCENES[this.state.scene].ground.filter(s=>s.type==='water')){
        const minx=water.points[0],maxx=water.points[2],miny=water.points[1],maxy=water.points[5];
        g.lineStyle(2,0xd8e8d7,.32);for(let i=0;i<24;i++){const x=minx+((i*47+16)%(maxx-minx)),y=miny+(i*71+t*17)%(maxy-miny);if(this.state.scene==='crossing'&&((this.state.flags.gateOpen&&y>648&&y<862)||(this.state.flags.ridgeOpen&&y>178&&y<342)))continue;if(this.state.scene==='creek'&&this.state.flags.shelterBridge&&x>1060&&x<1180&&y>612&&y<685)continue;g.lineBetween(x,y,Math.min(maxx,x+17),y+2);}
      }
    }
    if(this.hovered&&!this.ui.blocked&&!this.state.dialogue){
      const e=this.hovered;g.lineStyle(this.settings.contrast?3:1.5,0xf1e5aa,.85);g.strokeEllipse(e.x,e.y+4,Math.max(45,e.w+12),Math.max(18,e.h*.35));
    }
    const mouse=this.input.activePointer;
    if(this.casting&&!(p.pullId&&this.state.selected==='pull')&&this.pointerOverWorld&&!this.ui.blocked&&!this.state.dialogue&&(!mouse.wasTouch||mouse.isDown)){
      const preview=previewCast(this.state,this.state.selected,this.hovered?.id,castTargetPoint(this.state.selected,{x:mouse.worldX,y:mouse.worldY},this.hovered));
      const color=preview.valid?this.state.selected==='flame'?0xd5a167:0x9dbfac:0xb1836c;
      g.lineStyle(this.settings.contrast?2:1.2,color,this.settings.contrast?.9:.65);
      if(this.state.selected==='ward'){
        const angle=Math.atan2(mouse.worldY-p.y,mouse.worldX-p.x);
        g.beginPath();g.arc(p.x,p.y-15,48,angle-.45,angle+.45);g.strokePath();
      }else{
        // A small landing cue keeps attention on the target, without a screen-wide ruler.
        g.strokeEllipse(mouse.worldX,mouse.worldY,20,9);
        g.fillStyle(color,.7);g.fillCircle(mouse.worldX,mouse.worldY,1.5);
      }
    }
    if(p.pullId&&!(p.pullId==='lamp'&&this.state.flags.lampFixed)){
      const e=this.state.worlds[this.state.scene].find(e=>e.id===p.pullId);
      if(e){
        if(p.hold<=0){
          const start={x:p.x+(e.x>=p.x?20:-20),y:p.y-36},end={x:e.x,y:e.y-15};
          const bend=Math.min(34,Math.hypot(end.x-start.x,end.y-start.y)*.12);
          const control={x:(start.x+end.x)/2,y:(start.y+end.y)/2-bend};
          const along=(q:number)=>({x:(1-q)*(1-q)*start.x+2*(1-q)*q*control.x+q*q*end.x,y:(1-q)*(1-q)*start.y+2*(1-q)*q*control.y+q*q*end.y});
          g.lineStyle(this.settings.contrast?1.8:1,0x95bfa9,this.settings.contrast?.7:.36);
          g.beginPath();g.moveTo(start.x,start.y);
          for(let i=1;i<=24;i++){const point=along(i/24);g.lineTo(point.x,point.y);}g.strokePath();
          if(!this.settings.reduced){for(let i=0;i<3;i++){const q=(t*.35+i/3)%1,point=along(q);g.fillStyle(0xb7d1b9,Math.sin(q*Math.PI)*.45);g.fillCircle(point.x,point.y,1.4);}}
        }
        g.lineStyle(1,0x8db39e,.65);g.strokeEllipse(e.x,e.y+6,e.w+12,17);
        if(p.hold>0){g.lineStyle(2,0xd1b477,.8);g.beginPath();g.arc(e.x,e.y-25,25,-Math.PI/2,-Math.PI/2+Math.PI*2*p.hold/8);g.strokePath();}
      }
    }
    if(p.ward>0){const a=p.wardFacing;g.fillStyle(0xd3c790,.15);g.slice(p.x,p.y-15,65,a-.8,a+.8,false);g.fillPath();g.lineStyle(4,0xf0d693,.85);g.beginPath();g.arc(p.x,p.y-15,65,a-.8,a+.8);g.strokePath();g.lineStyle(1,0xfcf0bb,.9);g.beginPath();g.arc(p.x,p.y-15,58,a-.8,a+.8);g.strokePath();}
    if(this.state.flags.casting){
      const q=1-Number(this.state.flags.castTime)/.5,hx=p.x+Math.cos(p.facing)*23,hy=p.y-27+Math.sin(p.facing)*12;
      g.fillStyle(0xf5a34c,.13+q*.12);g.fillCircle(hx,hy,14+q*15);g.lineStyle(1.5,0xffd08c,.8);g.strokeCircle(hx,hy,17-q*10);
      g.fillStyle(0xffe6b0,.95);g.fillCircle(hx,hy,3+q*5);
    }
    for(const ball of this.state.projectiles){
      const speed=Math.hypot(ball.vx,ball.vy),nx=ball.vx/speed,ny=ball.vy/speed;
      for(let i=5;i>=1;i--){g.fillStyle(ball.owner==='player'?0xe57a35:0xb5a890,(6-i)*.045);g.fillCircle(ball.x-nx*i*5,ball.y-ny*i*5,Math.max(2,10-i));}
      g.fillStyle(ball.owner==='player'?0xe9a251:0x9c8c73,.18);g.fillCircle(ball.x,ball.y,21);
      g.fillStyle(ball.owner==='player'?0xf8ad4b:0xb49872,.95);g.fillCircle(ball.x,ball.y,9);g.fillStyle(0xfff1c7);g.fillEllipse(ball.x-nx*2,ball.y-ny*2,8,7);
    }
    for(const e of this.state.worlds[this.state.scene]){
      if(e.id==='ridge_rock_source'&&e.state==='warning'){g.lineStyle(3,0xc18453,.95);g.strokeCircle(e.x,e.y-15,39);g.lineStyle(2,0xdbab69,.8);g.lineBetween(e.x,e.y+20,1390,320);g.strokeEllipse(1390,300,36,72);g.fillStyle(0xe9c383,.8);g.fillTriangle(e.x-5,e.y-63,e.x+5,e.y-63,e.x,e.y-53);}
      if(e.state==='burning'){for(let i=0;i<7;i++){g.fillStyle(i%2?0xf3cd83:0xd89858,.75);g.fillTriangle(e.x-29+i*9,e.y-6,e.x-17+i*9,e.y-6,e.x-21+i*9,e.y-23-Math.sin(t*7+i)*9);}}
      if(e.kind==='enemy'&&['alert','chasing','attacking','searching','windup','casting'].includes(e.state)){
        const color=e.state==='windup'||e.state==='attacking'||e.state==='casting'?0xc78256:0xd4b86f;g.lineStyle(2,color,.9);g.strokeCircle(e.x,e.y-e.h-27,8);g.lineBetween(e.x,e.y-e.h-31,e.x,e.y-e.h-26);g.fillStyle(color);g.fillCircle(e.x,e.y-e.h-22,1.5);
        if(e.state==='windup'||e.state==='attacking'||e.state==='casting'){g.lineStyle(2,0xb96d4f,.65);g.lineBetween(e.x,e.y-25,p.x,p.y-20);}
      }
    }
    const ending=this.state.events.filter(e=>e.type==='ending').at(-1);
    if(this.state.scene==='home'&&ending){const elapsed=t-ending.time;if(elapsed>=0&&elapsed<1.2&&!this.settings.reduced){const q=Math.min(1,elapsed/1.2),stay=this.state.flags.endingWish==='stay';const x=Phaser.Math.Linear(760,stay?1084:760,q),y=Phaser.Math.Linear(390,stay?388:390,q)-Math.sin(q*Math.PI)*65;g.lineStyle(3,0xe3cf91,.9);if(stay)g.strokeCircle(x,y,8);else{g.fillStyle(0xe9dfb7,.8);g.fillRect(x-35*q,y-14,70*q,30);}}}
    if(this.state.player.path.length&&!this.casting){const end=this.state.player.path.at(-1)!;g.lineStyle(1,0xecedc4,.65);g.strokeEllipse(end.x,end.y,18,8);}
    if(this.state.scene==='creek'&&!this.settings.reduced){g.lineStyle(1,0xe5eee0,.22);const view=this.cameras.main.worldView;for(let i=0;i<35;i++){const x=(i*83+t*16)%view.width+view.x,y=(i*123+t*150)%view.height+view.y;g.lineBetween(x,y,x-4,y+13);}}
    this.drawImpactFeedback();
  }
  private drawPlacement(){
    this.anchorLabels.forEach(label=>label.setVisible(false));
    const p=this.state.player,mouse=this.input.activePointer,g=this.effects;
    if(!p.pullId||p.hold>0||this.state.selected!=='pull'||this.ui.blocked||this.state.dialogue)return;
    const e=this.state.worlds[this.state.scene].find(e=>e.id===p.pullId);
    if(!e||(e.id==='lamp'&&this.state.flags.lampFixed))return;
    placementAnchors(this.state).forEach((anchor,i)=>{
      const valid=previewPullMove(this.state,anchor).valid,color=valid?0x91b198:0xb09473;
      g.lineStyle(this.settings.contrast?2:1,color,valid?.75:.4);
      g.strokeEllipse(anchor.x,anchor.y,34,13);g.lineBetween(anchor.x-5,anchor.y,anchor.x+5,anchor.y);
      const label=this.anchorLabels[i]??(this.anchorLabels[i]=this.add.text(0,0,'',{fontFamily:FONT,fontSize:'12px',color:'#31574b',backgroundColor:'#eeeadd',padding:{x:6,y:4}}).setOrigin(.5,0).setDepth(14500));
      label.setResolution(display.density).setText(anchor.title).setPosition(anchor.x,anchor.y+11).setAlpha(valid?.9:.6).setVisible(true);
    });
    if(!this.pointerOverWorld||(mouse.wasTouch&&!mouse.isDown))return;
    const point=this.pullLanding({x:mouse.worldX,y:mouse.worldY}),preview=previewPullMove(this.state,point),color=preview.valid?0x94bdab:0xb57b60;
    const width=Math.min(100,Math.max(30,e.w)),height=Math.min(64,Math.max(24,e.h));
    g.fillStyle(color,.09);g.fillRoundedRect(point.x-width/2,point.y-height,width,height,4);
    g.lineStyle(this.settings.contrast?2:1.3,color,.7);
    for(const side of [-1,1]){const x=point.x+side*width/2;g.lineBetween(x,point.y-height,x-side*8,point.y-height);g.lineBetween(x,point.y-height,x,point.y-height+8);g.lineBetween(x,point.y,x-side*8,point.y);g.lineBetween(x,point.y,x,point.y-8);}
    g.strokeEllipse(point.x,point.y+3,width,12);
  }
  private drawImpactFeedback(){
    const g=this.effects;
    for(const [seq,label] of this.impactLabels)if(!this.feedback.active.some(f=>f.seq===seq)){label.destroy();this.impactLabels.delete(seq);}
    for(const f of this.feedback.active){
      if(f.kind==='cast')continue;
      const q=f.age/f.life,alpha=1-q,x=f.x,y=f.y-(f.kind==='impact'?0:25);
      const striking=['hit','hurt','block','impact'].includes(f.kind);
      const color=f.kind==='hurt'?0xf19576:f.kind==='block'||f.kind==='ward'?0xf5daa0:f.kind==='steam'?0xe4f3ed:['hit','fire','impact'].includes(f.kind)?0xffbd69:0xc6eddf;
      if(striking||['steam','fire'].includes(f.kind)){
        if(f.age<125){g.fillStyle(0xfff4d9,alpha*.85);g.fillCircle(x,y,Math.max(2,16*(1-f.age/125)));}
        const spread=this.settings.reduced?15:15+q*48;
        g.lineStyle(Math.max(1,3*(1-q)),color,alpha*.85);g.strokeEllipse(x,y,spread*2,spread*(f.kind==='block'?1.8:.8));
        if(!this.settings.reduced){
          for(let i=0;i<12;i++){
            const a=f.angle+i*Math.PI*2/12+(f.seq%7)*.2,r=(18+(i%4)*8)*Math.sqrt(q)*2;
            const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.7+q*q*18;
            if(f.kind==='steam'){g.fillStyle(color,alpha*.18);g.fillCircle(px,py-q*24,5+q*9);}
            else{g.lineStyle(i%3?1.5:2.5,i%2?color:0xfff1ce,alpha);g.lineBetween(px,py,px+Math.cos(a)*(3+alpha*6),py+Math.sin(a)*(3+alpha*6));}
          }
        }
      }else{g.lineStyle(1.5,color,alpha*.7);g.strokeEllipse(x,y+22,25+q*45,10+q*16);}
      const caption:Record<string,string>={hit:'命中 · 打断',hurt:'−1',block:'挡下',steam:'湿物 · 熄灭',impact:'受阻'};
      if(caption[f.kind]){
        let label=this.impactLabels.get(f.seq);
        if(!label){label=this.add.text(x,y-25,caption[f.kind],{fontFamily:'"PingFang SC", "Microsoft YaHei", sans-serif',fontSize:f.kind==='hurt'?'22px':'15px',fontStyle:'bold',color:f.kind==='hurt'?'#ffe0cc':'#fff4d5',stroke:'#334943',strokeThickness:4}).setResolution(display.density).setOrigin(.5).setDepth(26000);this.impactLabels.set(f.seq,label);}
        label.setPosition(x,y-27-(this.settings.reduced?0:q*22)).setAlpha(Math.min(1,alpha*2));
      }
    }
  }
}
