import Phaser from 'phaser';
import type { Entity, GameAction, GameState, Spell, Vec } from './contracts';
import { createGame, act, tick, nearbyEntity, previewCast, snapshot } from './model';
import { SCENES } from './content';
import { GameUI, type Settings } from './ui';
import { Soundscape } from './audio';

const FONT = '"Noto Serif SC", "Songti SC", "Microsoft YaHei", serif';
const COLORS = {ink:0x314b42,outline:0x42573e,stone:0x879887,stoneLight:0xb0baa6,wood:0x897755,woodLight:0xb4a17a,roof:0x576f68,leaf:0x628267};
function seeded(seed: number) { return () => { seed=(seed*1664525+1013904223)>>>0;return seed/4294967296; }; }
interface RenderEntity { container: Phaser.GameObjects.Container; art: Phaser.GameObjects.Graphics; image?: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; stateKey:string; }

export class WorldScene extends Phaser.Scene {
  public state!: GameState;
  private ui!: GameUI;
  private soundscape = new Soundscape();
  private landscape!: Phaser.GameObjects.Container;
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
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private casting=false;
  private hovered?: Entity;
  private queuedInteract:string|null=null;
  private cameraManual=false;
  private dragStart: {x:number;y:number;cx:number;cy:number}|null=null;
  private settings:Settings={reduced:false,contrast:false,large:false,volume:.45,music:.25};
  constructor(){super('world');}
  preload(){
    this.load.image('title-source',new URL('art/title.png',document.baseURI).href);
    this.load.image('characters-source',new URL('art/characters.png',document.baseURI).href);
    this.load.image('environment-source',new URL('art/environment.png',document.baseURI).href);
    this.load.on('loaderror',(file:Phaser.Loader.File)=>{document.body.dataset.assetError=file.key;});
  }
  create(){
    if(['title-source','characters-source','environment-source'].some(key=>!this.textures.exists(key))){
      const root=document.querySelector('#interface')!;
      root.innerHTML='<div class="veil"><section class="paper modal-paper" role="alert"><h2>山道画卷尚未展开</h2><p>部分画面未能载入，重新连接后可以再试一次。</p><button class="primary" id="retry-assets">重新载入</button></section></div>';
      document.querySelector('#retry-assets')!.addEventListener('click',()=>window.location.reload());
      return;
    }
    document.documentElement.style.setProperty('--title-image',`url("${new URL('art/title.png',document.baseURI).href}")`);
    this.keyCharacters();
    this.keyEnvironment();
    this.state=createGame({name:'行舟',origin:'herbalist',wish:'travel',appearance:0});
    this.landscape=this.add.container(0,0);
    this.worldLabels=this.add.container(0,0).setDepth(15000);
    this.effects=this.add.graphics().setDepth(12000);
    this.hoverLabel=this.add.text(0,0,'',{fontFamily:FONT,fontSize:'13px',color:'#f5f3df',backgroundColor:'#2d4944',padding:{x:12,y:8},align:'center'}).setOrigin(.5,1).setDepth(25000).setVisible(false);
    this.player=this.makeCharacter('player',0,0,0);this.playerHand=this.add.graphics();this.player.add(this.playerHand);
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ONE,TWO,THREE,E,R,C,J,I,M,ESC',false) as Record<string,Phaser.Input.Keyboard.Key>;
    this.ui=new GameUI({get:()=>this.state,act:a=>this.dispatch(a),replace:s=>this.replace(s),select:s=>this.select(s),center:()=>this.center(),settings:s=>{this.settings=s;}},this.soundscape);
    window.addEventListener('keydown',e=>{
      const typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName||'');
      if(!typing&&!this.ui.blocked&&[' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
    });
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>this.pointerDown(p));
    this.input.on('pointerup',()=>{this.dragStart=null;});
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.dragStart){this.cameraManual=true;this.cameras.main.scrollX=this.dragStart.cx-(p.x-this.dragStart.x);this.cameras.main.scrollY=this.dragStart.cy-(p.y-this.dragStart.y);}});
    window.addEventListener('blur',()=>{this.dispatch({type:'pause',value:true});this.keys&&Object.values(this.keys).forEach(k=>k.reset());});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.dispatch({type:'pause',value:true});});
    this.scale.on('resize',()=>this.center());
    this.refreshScene();this.center();
    // Read-only runtime evidence. QA must operate through real input; no state setters.
    Object.defineProperty(window,'__XIAN_NI__',{configurable:true,value:{
      inspect:()=>JSON.parse(snapshot(this.state)),
      screenPoint:(x:number,y:number)=>({x:x-this.cameras.main.scrollX,y:y-this.cameras.main.scrollY}),
      scene:()=>SCENES[this.state.scene],
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
    }
    ctx.putImageData(image,0,0);canvas.refresh();
    return canvas;
  }
  private replace(s:GameState){
    this.state=s;this.renderedScene='';this.groundVersion='';this.queuedInteract=null;this.casting=false;this.accumulator=0;
    this.refreshScene();this.center();
  }
  private dispatch(a:GameAction){
    const result=act(this.state,a);
    if(!result.ok&&result.message)this.ui?.notify(result.message);
    if(a.type==='retry'||a.type==='retreat'){this.renderedScene='';this.queuedInteract=null;this.refreshScene();this.center();}
    if(a.type==='interact'||a.type==='choose'||a.type==='release'||a.type==='hold')this.casting=false;
    this.ui?.update();
  }
  private select(spell:Spell){this.casting=true;this.queuedInteract=null;this.dispatch({type:'select',spell});this.ui?.notify({pull:'引力术：点轻物牵起，再点地面放下。',flame:'火焰球：对准干物或威胁，点击施术。',ward:'护符·障：朝需要保护的方向点击。'}[spell]);}
  private center(){this.cameraManual=false;if(this.state)this.cameras.main.centerOn(this.state.player.x,this.state.player.y-65);}
  private pointerDown(p:Phaser.Input.Pointer){
    if(this.ui?.blocked||this.state.dialogue||this.state.defeated)return;
    this.soundscape.start();
    if(p.middleButtonDown()||(p.leftButtonDown()&&p.event.shiftKey)){
      this.dragStart={x:p.x,y:p.y,cx:this.cameras.main.scrollX,cy:this.cameras.main.scrollY};return;
    }
    if(p.rightButtonDown()){this.casting=false;this.queuedInteract=null;this.dispatch({type:'release'});return;}
    const point={x:p.worldX,y:p.worldY};
    const entity=this.entityAt(point);
    if(this.state.player.pullId&&this.state.player.hold<=0&&this.state.selected==='pull'){
      this.dispatch({type:'move',point});
      return;
    }
    if(this.casting){
      this.dispatch({type:'cast',spell:this.state.selected,targetId:entity?.id,point});
      if(this.state.selected!=='pull'||!this.state.player.pullId)this.casting=false;
    }else if(entity&&entity.kind!=='scenery'){
      const d=Phaser.Math.Distance.Between(this.state.player.x,this.state.player.y,entity.x,entity.y);
      if(d<100)this.dispatch({type:'interact',targetId:entity.id});
      else{this.queuedInteract=entity.id;this.dispatch({type:'move',point:this.approachPoint(entity)});this.ui.notify(`走近${entity.name}后互动；也可用术法作用于它。`);}
    }else{this.queuedInteract=null;this.dispatch({type:'move',point});}
  }
  private approachPoint(e:Entity):Vec {
    const dx=this.state.player.x-e.x,dy=this.state.player.y-e.y,d=Math.hypot(dx,dy)||1;
    return {x:e.x+dx/d*74,y:e.y+dy/d*74};
  }
  private entityAt(p:Vec){
    return this.state.worlds[this.state.scene].filter(e=>!['taken','gone','hidden'].includes(e.state)&&e.kind!=='scenery')
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
        if(just('R'))this.dispatch({type:'hold'});
        if(just('E')){const e=nearbyEntity(this.state);if(e)this.dispatch({type:'interact',targetId:e.id});}
        input={x:Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),y:Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown)};
        if(input.x||input.y){this.queuedInteract=null;this.cameraManual=false;}
      }
    }
    this.accumulator+=Math.min(delta,100)/1000;
    while(this.accumulator>=1/60){tick(this.state,1/60,input);this.accumulator-=1/60;}
    if(this.queuedInteract&&!this.state.paused&&!this.state.dialogue){
      const e=this.state.worlds[this.state.scene].find(e=>e.id===this.queuedInteract);
      if(e&&Math.hypot(e.x-this.state.player.x,e.y-this.state.player.y)<96){this.queuedInteract=null;this.dispatch({type:'interact',targetId:e.id});}
    }
    if(this.renderedScene!==this.state.scene)this.refreshScene();
    const ground=`${this.state.scene}:${this.state.flags.gateOpen}:${this.state.flags.ridgeOpen}:${this.state.flags.platformOpen}`;
    if(ground!==this.groundVersion){this.groundVersion=ground;this.paintLandscape();}
    this.drawEntities(delta);this.drawEffects();
    const p=this.state.player;
    const moving=Math.hypot(p.x-this.lastX,p.y-this.lastY)>.01;
    if(moving)this.walking+=delta*.012;
    this.player.setPosition(p.x,p.y+(!this.settings.reduced&&moving?Math.sin(this.walking*2)*1.8:0)).setDepth(p.y+100);
    const targetScale=this.textures.exists('characters')? .13 : 1;
    if(this.playerImage){this.playerImage.setFrame(String(this.state.profile.appearance));this.playerImage.setFlipX(Math.cos(p.facing)<0);this.playerImage.setAngle(!this.settings.reduced&&moving?Math.sin(this.walking)*2:0);this.playerImage.setScale(targetScale);this.playerImage.setAlpha(p.invulnerable>0&&Math.sin(this.state.time*25)>0?.5:1);}
    this.playerHand.clear();
    if(p.pullId||this.casting){this.playerHand.lineStyle(3,0xf0e4bb,.9);const side=Math.cos(p.facing)>0?1:-1;this.playerHand.lineBetween(side*15,-35,side*26,-42);}
    this.lastX=p.x;this.lastY=p.y;
    if(!this.cameraManual){
      const camera=this.cameras.main;const tx=p.x-camera.width/2,ty=p.y-camera.height/2-55;
      camera.scrollX=Phaser.Math.Linear(camera.scrollX,tx,this.settings.reduced?1:.1);
      camera.scrollY=Phaser.Math.Linear(camera.scrollY,ty,this.settings.reduced?1:.1);
    }
    this.uiClock+=delta;if(this.uiClock>110){this.uiClock=0;this.ui.update();}
  }
  private refreshScene(){
    this.renderedScene=this.state.scene;
    this.renders.forEach(r=>r.container.destroy());this.renders.clear();
    this.worldLabels.removeAll(true);
    const map=SCENES[this.state.scene];this.cameras.main.setBounds(0,0,map.width,map.height);
    this.paintLandscape();
    for(const e of this.state.worlds[this.state.scene])this.makeEntity(e);
    this.soundscape.setScene(this.state.scene);this.center();
  }
  private polygon(g:Phaser.GameObjects.Graphics,points:number[],color:number,alpha=1){
    g.fillStyle(color,alpha);g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.closePath();g.fillPath();
  }
  private paintLandscape(){
    this.landscape.removeAll(true);
    const m=SCENES[this.state.scene],g=this.add.graphics();this.landscape.add(g);
    const rand=seeded(['home','creek','workshop','crossing'].indexOf(m.id)*43+83);
    g.fillStyle(m.palette.ground);g.fillRect(0,0,m.width,m.height);
    for(let i=0;i<2100;i++){const x=rand()*m.width,y=rand()*m.height;g.fillStyle(rand()>.5?0xd6dfbb:0x638461,.04+rand()*.06);g.fillEllipse(x,y,15+rand()*62,5+rand()*26);}
    for(const s of m.ground){
      const colors={path:m.palette.path,water:m.palette.water,grass:0x8eaa80,stone:0xc0c3b0,cliff:0x829084,floor:0xc1b997};
      this.polygon(g,s.points,colors[s.type]);
      if(s.type==='path'||s.type==='floor'||s.type==='stone'){
        const xs=s.points.filter((_,i)=>i%2===0),ys=s.points.filter((_,i)=>i%2===1);
        const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
        for(let i=0;i<(maxx-minx)*(maxy-miny)/220;i++){const x=minx+rand()*(maxx-minx),y=miny+rand()*(maxy-miny);g.fillStyle(rand()>.5?0xe4ddbc:0x928e70,.08+rand()*.12);g.fillEllipse(x,y,4+rand()*16,2+rand()*5);}
        if(s.type==='floor'){g.lineStyle(1,0x8c8d71,.18);for(let x=minx+15;x<maxx;x+=38)g.lineBetween(x,miny,x,maxy);}
      }
      if(s.type==='water'){
        g.lineStyle(3,0xd4ded2,.28);for(let j=0;j<30;j++){let x=s.points[0]+rand()*(s.points[2]-s.points[0]),y=s.points[1]+rand()*(s.points[5]-s.points[1]);g.lineBetween(x,y,x+12+rand()*24,y+2);}
      }
    }
    // Ground-level borders and deliberate scenery occupy only non-walkway margins.
    for(let i=0;i<34;i++){const x=50+i*52,y=i%2?995:65;this.bush(g,x,y,30+rand()*25,rand);}
    if(m.id==='home')this.paintHome(g,rand);
    if(m.id==='creek')this.paintCreek(g,rand);
    if(m.id==='workshop')this.paintWorkshop(g,rand);
    if(m.id==='crossing')this.paintCrossing(g,rand);
    for(const ob of m.obstacles){
      if(ob.flag&&this.state.flags[ob.flag])continue;
      // All collision rectangles have visible geometry, never invisible walls.
      if(m.id==='crossing'&&ob.x===1180)continue;
      if(m.id==='home'&&ob.y===240)continue;
      if(m.id==='home'&&ob.x===660){this.landscapeRock(g,ob.x+ob.w/2,ob.y+ob.h/2,ob.w*.5,ob.h*.5);continue;}
      if(m.id==='creek'){g.fillStyle(0x748e76,.7);g.fillRoundedRect(ob.x,ob.y,ob.w,ob.h,9);g.lineStyle(2,0xc2cdb0,.65);g.strokeRoundedRect(ob.x,ob.y,ob.w,ob.h,9);}
      else if(m.id==='workshop'&&ob.w<40){g.fillStyle(0x776b50);g.fillRect(ob.x,ob.y,ob.w,ob.h);for(let y=ob.y;y<ob.y+ob.h;y+=25){g.lineStyle(2,0xad9c72);g.lineBetween(ob.x,y,ob.x+ob.w,y);}}
      else{this.landscapeRock(g,ob.x+ob.w/2,ob.y+ob.h/2,ob.w*.5,ob.h*.5);}
    }
    g.lineStyle(2,0x647e5d,.16);g.strokeRect(28,28,m.width-56,m.height-56);
    // Bake immutable brushwork once; replaying thousands of paths every frame stalls software WebGL.
    const groundKey='ground-baked';
    if(this.textures.exists(groundKey))this.textures.remove(groundKey);
    g.generateTexture(groundKey,m.width,m.height);
    this.landscape.remove(g,true);
    // Keep the keyed prop images above the baked ground; only the brushwork is replaced.
    this.landscape.addAt(this.add.image(0,0,groundKey).setOrigin(0),0);
    this.landscape.setDepth(-1000);
  }
  private environmentProp(frame:string,x:number,y:number,width:number,height?:number){
    if(!this.textures.exists('environment'))return;
    const image=this.add.image(x,y,'environment',frame).setOrigin(.5,1);
    image.setDisplaySize(width,height??width*image.height/image.width);
    this.landscape.add(image);
    return image;
  }
  private landscapeRock(g:Phaser.GameObjects.Graphics,x:number,y:number,rx:number,ry:number){
    // The low stone plinth marks the entire blocking footprint, including the painted rock's inset corners.
    g.fillStyle(0x919b90);g.fillRoundedRect(x-rx,y-ry,rx*2,ry*2,6);
    // Small dressed stones make the rectangular collision edge read as a laid stone bed.
    for(let xx=x-rx;xx<x+rx;xx+=24){
      g.fillStyle(0xb2baaa);g.fillRoundedRect(xx,y-ry,Math.min(22,x+rx-xx),10,3);
      g.fillStyle(0xa4ae9e);g.fillRoundedRect(xx,y+ry-10,Math.min(22,x+rx-xx),10,3);
    }
    for(let yy=y-ry+12;yy<y+ry-10;yy+=22){g.fillStyle(0xa8b1a3);g.fillRoundedRect(x-rx,yy,10,19,3);g.fillRoundedRect(x+rx-10,yy,10,19,3);}
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
    if(this.textures.exists('environment')){
      // Two compact buildings flank a low covered gallery. Their continuous foundation is the actual obstacle.
      g.fillStyle(0x899083);g.fillRect(240,240,870,95);
      g.fillStyle(0xc4b698);g.fillRect(250,250,850,74);
      g.fillStyle(0x786849);g.fillRect(240,322,870,13);
      g.lineStyle(3,0x72654d);for(let x=250;x<1110;x+=44){g.lineBetween(x,265,x,322);g.lineBetween(x,282,Math.min(x+44,1110),282);}
      this.environmentProp('inn',392,340,318,303);
      this.environmentProp('inn',951,340,318,303);
      this.roof(g,548,224,245,48);
      // The accessible annex is an open canopy, so its art does not suggest an unmodelled solid building.
      this.environmentProp('shelter',1280,355,196,171);
    }else{
      this.house(g,240,240,870,105);
      this.house(g,1210,275,180,75);
    }
    g.fillStyle(0x817a58);g.fillRect(242,344,865,7);
    g.lineStyle(2,0x74815e);for(let x=240;x<1590;x+=35){g.lineBetween(x,885,x,905);if(x<560||x>780)g.lineBetween(x,890,x+35,890);}
    for(const [x,y] of [[145,415],[1460,350],[1510,470],[138,920]])this.bush(g,x,y,55,rand);
    this.environmentProp('rocks',1510,960,156,100)||this.rock(g,1510,930,78,30);
    g.fillStyle(0xd2bea0);g.fillRoundedRect(280,600,220,30,7);
    g.lineStyle(1,0x9b997e,.5);for(let x=220;x<1190;x+=75)g.lineBetween(x,565,x+40,565);
    // Returning route states are painted where players remember them.
    if(this.state.flags.gateOpen){g.fillStyle(0xbcb18f);g.fillRoundedRect(1230,700,170,50,8);}
    if(this.state.flags.ridgeUsed||this.state.flags.ridge_used){g.lineStyle(3,0x849b6b);g.lineBetween(1300,830,1440,970);}
  }
  private paintCreek(g:Phaser.GameObjects.Graphics,rand:()=>number){
    if(!this.environmentProp('shelter',1080,605,366,280)){
      this.roof(g,900,430,360,50);
      g.fillStyle(0x857752);g.fillRect(916,480,7,95);g.fillRect(1240,480,7,95);
    }
    g.lineStyle(4,0xcbd4bc,.8);g.lineBetween(632,430,620,660);
    for(let i=0;i<6;i++){g.fillStyle(0xbbc7ae);g.fillEllipse(653+i*25,697,35,19);}
    for(const [x,y] of [[450,200],[520,500],[850,210],[1580,130],[1720,580],[130,980]])this.bush(g,x,y,60,rand);
    // A low outcrop at the back of the lookout leaves the climb and chime interaction clear.
    this.environmentProp('rocks',1340,154,220,90)||this.rock(g,1340,137,145,32);
    g.lineStyle(2,0x6f855f,.55);for(let x=1120;x<1480;x+=50)g.lineBetween(x,316,x+35,316);
  }
  private paintWorkshop(g:Phaser.GameObjects.Graphics,rand:()=>number){
    if(!this.environmentProp('shelter',1420,418,338,205))this.house(g,1160,365,485,85);
    for(const [x,y] of [[120,450],[420,380],[560,280],[800,310],[1110,230],[1700,730],[800,960],[1380,960]])this.bush(g,x,y,68,rand);
    g.lineStyle(5,0x776c4c);for(let y=490;y<655;y+=37){g.lineBetween(1110,y,1170,y+4);g.lineBetween(1120,y-17,1120,y+20);}
    g.fillStyle(0x4c604d,.12);g.fillEllipse(800,723,340,70);
    for(let i=0;i<9;i++){g.fillStyle(0xa7b89c,.8);g.fillEllipse(350+i*80,244,23,9);}
  }
  private paintCrossing(g:Phaser.GameObjects.Graphics,rand:()=>number){
    g.fillStyle(0x6e8580);g.fillRect(1180,0,9,1100);g.fillRect(1313,0,8,1100);
    g.fillStyle(0x627a6c);g.fillRect(1090,590,16,170);g.fillRect(1200,590,16,170);
    g.fillStyle(0x948061);g.fillRect(1070,580,165,16);g.fillRect(1110,610,100,9);
    for(let x=1100;x<1200;x+=19){g.lineStyle(3,0x5a6351);g.lineBetween(x,605,x,727);}
    if(this.state.flags.gateOpen){
      g.fillStyle(0xc9c8ae);g.fillRoundedRect(1175,660,151,182,9);
      for(let y=680;y<840;y+=28){g.lineStyle(2,0x989f85,.55);g.lineBetween(1188,y,1310,y+3);}
      g.fillStyle(0x7fa6a8);g.fillRect(1280,875,160,27);
    }
    if(this.state.flags.ridgeOpen){g.fillStyle(0xaa9470);g.fillRect(1170,229,163,55);for(let x=1170;x<1330;x+=16){g.lineStyle(2,0x715f46);g.lineBetween(x,232,x,280);}g.lineStyle(3,0xc1b28c);g.lineBetween(1155,224,1345,224);g.lineBetween(1155,288,1345,288);}
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
  private makeEntity(e:Entity){
    const art=this.add.graphics(),label=this.add.text(0,15,e.name,{fontFamily:FONT,fontSize:'11px',color:'#344d3d',backgroundColor:'#eaf0d9cc',padding:{x:6,y:3}}).setOrigin(.5,0);
    let container:Phaser.GameObjects.Container;let image:Phaser.GameObjects.Image|undefined;
    if(e.kind==='npc'){
      container=this.makeCharacter(e.type,e.x,e.y,e.type==='tao'?2:3);
      image=container.list.find(o=>o instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image|undefined;
      container.add(art);container.add(label);
    }else{container=this.add.container(e.x,e.y,[art,label]);}
    container.setDepth(e.y);const r={container,art,label,image,stateKey:''};this.renders.set(e.id,r);this.drawObject(e,art);return r;
  }
  private drawObject(e:Entity,g:Phaser.GameObjects.Graphics){
    g.clear();const w=e.w,h=e.h;
    if(e.kind==='npc')return;
    g.fillStyle(0x354d33,.16);g.fillEllipse(4,6,w*.95,Math.min(22,h*.4));
    if(e.kind==='exit'){
      g.fillStyle(0x7b7253);g.fillRect(-3,-45,6,48);
      const right=e.name.includes('→');const pts=right?[-34,-50,30,-50,43,-36,30,-22,-34,-22]:[-43,-36,-30,-50,34,-50,34,-22,-30,-22];
      this.polygon(g,pts,0xddd0a0);g.lineStyle(1,0x8e8960);g.strokePoints(pts.reduce<Phaser.Geom.Point[]>((a,n,i)=>{if(i%2===0)a.push(new Phaser.Geom.Point(n,pts[i+1]));return a;},[]),true);
      return;
    }
    if(e.kind==='rest'){g.fillStyle(0xa9b597);g.fillEllipse(0,0,w,25);g.lineStyle(2,0x72876a);g.strokeEllipse(0,0,w,25);g.fillStyle(0x768a65);g.fillEllipse(0,-4,w*.7,15);g.lineStyle(1,0xd2d7b0,.8);g.strokeEllipse(0,-4,w*.58,10);return;}
    if(e.kind==='enemy'){
      if(e.type==='beast'){
        g.fillStyle(e.state==='retreated'||e.state==='defeated'?0x938d70:0x7d8464);g.fillEllipse(0,-14,58,28);g.fillTriangle(17,-23,36,-12,19,-6);g.fillTriangle(11,-23,14,-37,25,-25);g.fillStyle(0x4e644a);g.fillRect(-18,-2,7,9);g.fillRect(15,-2,7,9);g.lineStyle(7,0x788361);g.lineBetween(-25,-13,-38,-26);g.fillStyle(0xe5ce81);g.fillCircle(27,-16,2.5);
      }else{
        g.fillStyle(0x645e4f);g.fillTriangle(-20,-2,20,-2,0,-49);g.fillStyle(0xaaa28a);g.fillTriangle(-14,-6,5,-6,0,-45);g.fillStyle(0xc5a984);g.fillCircle(0,-53,11);g.fillStyle(0x354332);g.fillEllipse(0,-63,24,12);g.lineStyle(4,0x85765b);g.lineBetween(13,-30,30,-16);
      }
      if((e.hp??3)>0){for(let i=0;i<3;i++){g.fillStyle(i<(e.hp??3)?0xa36c52:0x8a9173,.9);g.fillRoundedRect(-15+i*11,-79,8,3,1);}}
      return;
    }
    switch(e.type){
      case 'lamp':g.fillStyle(e.state==='lit'?0xf3d68c:0xd9ba74);g.fillRoundedRect(-11,-35,22,26,4);g.lineStyle(2,0x82734f);g.strokeRoundedRect(-11,-35,22,26,4);g.lineBetween(-12,-35,12,-35);g.lineBetween(0,-35,0,-46);break;
      case 'lamp_stand':g.lineStyle(7,0x817453);g.lineBetween(0,0,-4,-69);g.lineBetween(-5,-68,28,-66);g.lineStyle(2,0xc4b28a);g.lineBetween(-1,-66,1,-5);if(this.state.flags.lampFixed){g.fillStyle(0xe8bf65);g.fillRoundedRect(19,-67,20,25,3);g.fillStyle(0xf6d582,.16);g.fillCircle(29,-52,36);}break;
      case 'table':case 'workbench':g.fillStyle(0x6a6549);g.fillRect(-w/2+9,-4,7,17);g.fillRect(w/2-16,-4,7,17);g.fillStyle(0x938360);g.fillRoundedRect(-w/2,-28,w,35,3);g.lineStyle(2,0xbdab7f);g.lineBetween(-w/2+5,-24,w/2-5,-24);g.fillStyle(0xe8e0b9);g.fillEllipse(-20,-15,22,10);g.fillStyle(0x93856a);g.fillEllipse(-20,-16,15,6);if(e.type==='workbench'){g.fillStyle(0x636f5b);g.fillRect(10,-24,16,15);g.lineStyle(3,0x8d7452);g.lineBetween(30,-20,48,-7);}break;
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
      case 'herb_rack':g.lineStyle(5,0x8e7f53);g.lineBetween(-40,-36,-40,6);g.lineBetween(40,-36,40,6);g.lineBetween(-43,-29,43,-29);g.lineBetween(-43,-9,43,-9);g.lineStyle(6,0x6b8b4f);for(let i=-32;i<38;i+=14)g.lineBetween(i,-29,i+5,-16);break;
      case 'shelter':g.fillStyle(0xadac84);g.fillEllipse(0,-3,55,24);g.fillStyle(0x867e56);g.fillRoundedRect(-24,-20,48,12,3);break;
      case 'return_cart':g.fillStyle(0x8e7952);g.fillRect(-48,-28,96,30);g.lineStyle(4,0x736848);g.strokeCircle(-32,0,13);g.strokeCircle(32,0,13);g.lineBetween(-44,-20,44,-20);g.lineBetween(42,-18,71,-26);break;
      case 'room':g.fillStyle(0x7a805c);g.fillRect(-33,-54,66,55);g.fillStyle(0x9f9a70);g.fillRect(-29,-51,28,50);g.fillStyle(0xc8b681);g.fillCircle(-5,-22,3);break;
      case 'marks':case 'far_bank':case 'ridge_marker':case 'negotiator':this.rock(g,0,-15,w*.5,h*.55);g.lineStyle(2,0xdce0bd);g.lineBetween(-10,-25,9,-31);g.lineBetween(-9,-18,7,-23);g.lineBetween(-7,-10,10,-16);break;
      default:this.rock(g,0,-10,w*.4,h*.4);
    }
  }
  private drawEntities(delta:number){
    for(const e of this.state.worlds[this.state.scene]){
      const r=this.renders.get(e.id)||this.makeEntity(e);
      const isGone=['taken','gone','hidden'].includes(e.state);
      r.container.setVisible(!isGone);if(isGone)continue;
      const key=`${e.state}:${e.hp}:${this.state.flags.lampFixed}:${this.state.flags.gateOpen}:${this.state.flags.ridgeOpen}`;
      if(r.stateKey!==key){r.stateKey=key;this.drawObject(e,r.art);}
      r.container.setPosition(e.x,e.y).setDepth(e.y+(e.kind==='npc'?100:0));
      const near=Math.hypot(this.state.player.x-e.x,this.state.player.y-e.y)<180;
      r.label.setVisible(near||e.kind==='exit'||e.id==='ring');
      r.label.setText(e.name);r.label.setAlpha(e.kind==='enemy'?.8:1);
      if(r.image){r.image.setFlipX((e.facing??0)>Math.PI/2&&(e.facing??0)<Math.PI*1.5);r.image.setAngle(e.state==='following'&&!this.state.paused&&!this.settings.reduced?Math.sin(this.state.time*9)*1.5:0);}
      if(['defeated','retreated'].includes(e.state))r.container.setAlpha(.45);else r.container.setAlpha(1);
    }
    const p=this.input.activePointer;this.hovered=this.entityAt({x:p.worldX,y:p.worldY});
    if(!this.ui.blocked&&!this.state.dialogue&&(this.hovered||this.casting)){
      let text=this.hovered?.name||'';
      if(this.state.player.pullId&&this.state.player.hold<=0&&this.state.selected==='pull'){text='点击地面调整落点\n按 Esc 放下；R 留势';}
      else if(this.casting){const preview=previewCast(this.state,this.state.selected,this.hovered?.id,{x:p.worldX,y:p.worldY});text=`${this.hovered?.name||'施术落点'}\n${preview.valid?'点击施术 · 灵力 '+preview.cost:preview.reason}`;}
      else if(this.hovered){text+=`\n${this.hovered.hint||'走近后按 E 察看'}`;}
      this.hoverLabel.setText(text).setPosition(p.worldX,p.worldY-25).setVisible(true);
    }else this.hoverLabel.setVisible(false);
  }
  private drawEffects(){
    const g=this.effects,p=this.state.player,t=this.state.time;g.clear();
    if(this.state.scene==='creek'||this.state.scene==='crossing'){
      for(const water of SCENES[this.state.scene].ground.filter(s=>s.type==='water')){
        const minx=water.points[0],maxx=water.points[2],miny=water.points[1],maxy=water.points[5];
        g.lineStyle(2,0xd8e8d7,.32);for(let i=0;i<24;i++){const x=minx+((i*47+16)%(maxx-minx)),y=miny+(i*71+t*17)%(maxy-miny);if(this.state.flags.gateOpen&&this.state.scene==='crossing'&&y>650&&y<860)continue;g.lineBetween(x,y,Math.min(maxx,x+17),y+2);}
      }
    }
    if(this.hovered&&!this.ui.blocked&&!this.state.dialogue){
      const e=this.hovered;g.lineStyle(this.settings.contrast?3:1.5,0xf1e5aa,.85);g.strokeEllipse(e.x,e.y+4,Math.max(45,e.w+12),Math.max(18,e.h*.35));
    }
    if(this.casting&&!this.ui.blocked&&!this.state.dialogue){
      const mouse=this.input.activePointer;const preview=previewCast(this.state,this.state.selected,this.hovered?.id,{x:mouse.worldX,y:mouse.worldY});
      g.lineStyle(1,preview.valid?0xe7e8b6:0xb56955,.3);g.strokeCircle(p.x,p.y,preview.range);
      g.lineStyle(2,preview.valid?0xebf4cb:0xb96551,.8);g.lineBetween(p.x,p.y-28,mouse.worldX,mouse.worldY);
      g.strokeEllipse(mouse.worldX,mouse.worldY,27,13);
    }
    if(p.pullId){const e=this.state.worlds[this.state.scene].find(e=>e.id===p.pullId);if(e){g.lineStyle(7,0xd0e8dc,.12);g.lineBetween(p.x,p.y-35,e.x,e.y-15);g.lineStyle(2,0xe3f8e4,.9);g.lineBetween(p.x,p.y-35,e.x,e.y-15);g.lineStyle(1,0x5e9b89,.8);g.strokeEllipse(e.x,e.y+6,e.w+15,20);if(p.hold>0){g.lineStyle(3,0xf0d18b);g.beginPath();g.arc(e.x,e.y-25,25,-Math.PI/2,-Math.PI/2+Math.PI*2*p.hold/8);g.strokePath();}}}
    if(p.ward>0){const a=p.wardFacing;g.fillStyle(0xd3c790,.15);g.slice(p.x,p.y-15,65,a-.8,a+.8,false);g.fillPath();g.lineStyle(4,0xf0d693,.85);g.beginPath();g.arc(p.x,p.y-15,65,a-.8,a+.8);g.strokePath();g.lineStyle(1,0xfcf0bb,.9);g.beginPath();g.arc(p.x,p.y-15,58,a-.8,a+.8);g.strokePath();}
    for(const ball of this.state.projectiles){g.fillStyle(ball.owner==='player'?0xd6a068:0x9c7657,.15);g.fillCircle(ball.x,ball.y,19);g.fillStyle(ball.owner==='player'?0xe7a459:0xb48155,.8);g.fillCircle(ball.x,ball.y,8);g.fillStyle(0xffe7ad,.95);g.fillCircle(ball.x,ball.y,3);}
    for(const e of this.state.worlds[this.state.scene]){
      if(e.state==='burning'){for(let i=0;i<7;i++){g.fillStyle(i%2?0xf3cd83:0xd89858,.75);g.fillTriangle(e.x-29+i*9,e.y-6,e.x-17+i*9,e.y-6,e.x-21+i*9,e.y-23-Math.sin(t*7+i)*9);}}
      if(e.kind==='enemy'&&['alert','chasing','attacking','searching','windup','casting'].includes(e.state)){
        const color=e.state==='windup'||e.state==='attacking'||e.state==='casting'?0xc78256:0xd4b86f;g.lineStyle(2,color,.9);g.strokeCircle(e.x,e.y-e.h-27,8);g.lineBetween(e.x,e.y-e.h-31,e.x,e.y-e.h-26);g.fillStyle(color);g.fillCircle(e.x,e.y-e.h-22,1.5);
        if(e.state==='windup'||e.state==='attacking'||e.state==='casting'){g.lineStyle(2,0xb96d4f,.65);g.lineBetween(e.x,e.y-25,p.x,p.y-20);}
      }
    }
    if(this.state.player.path.length&&!this.casting){const end=this.state.player.path.at(-1)!;g.lineStyle(1,0xecedc4,.65);g.strokeEllipse(end.x,end.y,18,8);}
    if(this.state.scene==='creek'&&!this.settings.reduced){g.lineStyle(1,0xe5eee0,.22);const camera=this.cameras.main;for(let i=0;i<35;i++){const x=(i*83+t*16)%camera.width+camera.scrollX,y=(i*123+t*150)%camera.height+camera.scrollY;g.lineBetween(x,y,x-4,y+13);}}
  }
}
