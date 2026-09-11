import { journeyObjective } from './journey';
import { canalObjective } from './canal';
import type { GameAction, GameState, Profile, Spell } from './contracts';
import { createGame, snapshot, restore, objective, nearbyEntity } from './model';
import { SCENES } from './content';
import type { Soundscape } from './audio';
import { nearbyEncounter } from './encounters';

const SAVE = 'xian-ni-return-stone-save-v1';
const AUTO = 'xian-ni-return-stone-safe-v1';
const SETTINGS = 'xian-ni-return-stone-settings-v1';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export interface Settings { reduced: boolean; contrast: boolean; large: boolean; volume: number; music: number; }
export interface UiHooks {
  get: () => GameState;
  act: (a: GameAction) => void;
  replace: (s: GameState) => void;
  select: (s: Spell) => void;
  center: () => void;
  settings: (settings: Settings) => void;
  aiming: () => boolean;
  cancel: () => void;
}
export class GameUI {
  private root: HTMLElement;
  private modal: HTMLElement;
  private hud: HTMLElement;
  private dialogues: HTMLElement;
  private notices: HTMLElement;
  private observations: HTMLElement;
  private observationOpen = false;
  private observationKey = '';
  private observationScene = '';
  private lastHud = '';
  private lastDialogue = '';
  private lastEvent = -1;
  private lastAuto = '';
  private screen: string = 'title';
  private endingShown = false;
  private started = false;
  private noticeTimer = 0;
  private pauseBeforeMenu: boolean | null = null;
  private lastAudioCheck = 0;
  private audioState = 'locked';
  public settings: Settings = { reduced: false, contrast: false, large: false, volume: .45, music: .55 };
  constructor(private hooks: UiHooks, private sound: Soundscape) {
    this.root = document.querySelector('#interface')!;
    this.root.innerHTML = '<div id="hud"></div><div id="observations"></div><div id="dialogues"></div><div id="notices" role="status" aria-live="polite"></div><div id="modal"></div>';
    this.hud = document.querySelector('#hud')!; this.modal = document.querySelector('#modal')!;
    this.dialogues = document.querySelector('#dialogues')!; this.notices = document.querySelector('#notices')!;
    this.observations = document.querySelector('#observations')!;
    try { const saved = JSON.parse(localStorage.getItem(SETTINGS) || '{}'); this.settings = {...this.settings, ...saved}; } catch { /* retain defaults */ }
    this.applySettings();
    this.root.addEventListener('click', e => this.click(e));
    this.root.addEventListener('change', e => this.change(e));
    this.showTitle();
  }
  get blocked() { return Boolean(this.screen); }
  get isTitle() { return this.screen === 'title' || this.screen === 'create'; }
  private audioButton() {
    const muted = this.sound.inspect().muted;
    const label = muted ? '声音已关' : this.audioState === 'running' ? '声音已开' : '开启声音';
    return `<button class="audio-toggle" data-ui="audio" data-audio="${muted?'muted':this.audioState}" aria-label="${muted?'开启声音':this.audioState==='running'?'关闭声音':'开启背景音乐和音效'}" aria-pressed="${!muted && this.audioState==='running'}">${label}</button>`;
  }
  private button(label: string, action: string, cls = '') { return `<button class="${cls}" data-ui="${action}">${label}</button>`; }
  private shell(title: string, contents: string, cls = '') {
    this.modal.innerHTML = `<div class="veil"><section class="paper modal-paper ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-heading"><span class="eyebrow">山门之外</span>${this.button('×','close','close')}<h2>${title}</h2></div>${contents}</section></div>`;
  }
  showTitle() {
    this.pauseBeforeMenu = null; this.screen = 'title'; this.hooks.act({type:'pause',value:true});
    let canContinue = false; try { canContinue = Boolean(localStorage.getItem(SAVE) || localStorage.getItem(AUTO)); } catch { /* private mode */ }
    this.modal.innerHTML = `<main class="title-screen"><div class="title-mist"></div><div class="title-copy"><div class="title-kicker"><span class="seal">仙逆</span><span>一段关于修行与归处的冒险</span></div><h1>山门之外</h1><p class="title-poem">雨停之前，先把灯扶正。<br>路还很远，总有个地方记得你。</p><div class="title-actions">${this.button('入 山','create','primary')}${canContinue ? this.button('继续前行','load','secondary') : ''}${this.button('行路须知','help','text-button')}</div><p class="title-caption">空间冒险 · 随时暂停 · 简体中文</p><div class="title-audio">${this.audioButton()}</div></div><div class="title-foot"><span>回石驿 · 雨后</span><span>原创修士的山道故事</span></div></main>`;
  }
  private showCreate() {
    this.screen = 'create';
    this.shell('你从哪里来', `<p class="muted">你在回石驿住了半年，今日要去取回自己的控物环。</p><form id="new-game"><label class="name-label">姓名 <input name="name" maxlength="12" value="行舟" autocomplete="off" aria-label="修士姓名"></label><div class="creation-layout"><div><h3>已有的手艺</h3><div class="option-row"><label class="choice-tile"><input type="radio" name="origin" value="herbalist" checked><strong>药铺帮工</strong><span>认草药，会包扎。许照常与你同路。</span></label><label class="choice-tile"><input type="radio" name="origin" value="tinker"><strong>修器学徒</strong><span>懂绳扣和受力。陶七给你留着工位。</span></label></div><h3>眼下的心愿</h3><div class="option-row"><label class="choice-tile"><input type="radio" name="wish" value="travel" checked><strong>有本领走出去</strong><span>想看看山外的路。</span></label><label class="choice-tile"><input type="radio" name="wish" value="stay"><strong>有自己的修行处</strong><span>想留下一盏自己的灯。</span></label></div><div class="appearance-choice"><span>形象</span><label><input type="radio" name="appearance" value="0" checked> 束发青衫</label><label><input type="radio" name="appearance" value="1"> 挽髻短襟</label></div></div><div class="character-preview"><div class="portrait portrait-player"></div><small>凝气三层 · 初走远路</small></div></div><div class="modal-actions">${this.button('回到山外','title','secondary')}<button type="submit" class="primary">去回石驿</button></div></form>`, 'creation-paper');
    document.querySelector('#new-game')!.addEventListener('submit', e => {
      e.preventDefault(); const f = new FormData(e.target as HTMLFormElement);
      const profile: Profile = {name: String(f.get('name') || '').trim().slice(0,12) || '行舟', origin:f.get('origin')==='tinker'?'tinker':'herbalist',wish:f.get('wish')==='stay'?'stay':'travel',appearance:f.get('appearance')==='1'?1:0};
      this.endingShown = false; this.lastEvent = -1; this.lastAuto = '';
      this.hooks.replace(createGame(profile)); this.started=true; this.lastAuto=''; this.close(true); this.sound.start();
      this.notify('点地面行走，点下方「引」再点灯盏，试试引力术。');
    });
  }
  close(resume = false) {
    if (!this.started) { this.showTitle(); return; }
    const restorePause = resume ? false : this.pauseBeforeMenu;
    this.screen = ''; this.modal.innerHTML = ''; this.pauseBeforeMenu = null;
    const s = this.hooks.get();
    if (restorePause !== null && !s.dialogue && !s.defeated && !document.hidden) this.hooks.act({type:'pause',value:restorePause});
    this.hooks.center();
  }
  private open(screen: string) {
    if (this.pauseBeforeMenu === null) this.pauseBeforeMenu = this.hooks.get().paused;
    this.screen = screen; if(!this.hooks.get().paused)this.hooks.act({type:'pause',value:true}); this.drawModal();
  }
  private drawModal() {
    const s = this.hooks.get();
    if (this.screen==='journal') {
      const entries = s.events.filter(e=>e.text).slice(-50).reverse();
      this.shell('行路记事',`<div class="journal-goal"><span>眼下要做</span><p>${esc(objective(s))}</p></div><div class="scroll-page">${entries.map(e=>`<article class="journal-entry"><span>${Math.floor(e.time/60).toString().padStart(2,'0')} · ${Math.floor(e.time%60).toString().padStart(2,'0')}</span><p>${esc(e.text)}</p></article>`).join('') || '<p>今日的路，从回石驿开始。</p>'}</div>`);
    } else if (this.screen==='bag') {
      const life=s.life;
      const leafPlace={unpicked:'尚未采到',bag:'行囊中',upper:'晒架上层',lower:'晒架下层'};
      const repairCard=life.repair.stage==='unaccepted'?'':`<article><span class="item-glyph">扣</span><h3>陶七的挂扣</h3><p>${life.repair.stage==='complete'?'已经试压并交还。你的压扣在'+(life.clamp==='bag'?'行囊中':life.clamp==='home'?'工位固定眼':life.clamp==='canal'?'雾岭旧渠截水架':'眺台侧托')+'。':life.repair.tested?'已承住试重，回驿交还陶七。':life.repair.latched?'钳口已压紧，还需实际试压。':life.repair.softened?'旧胶已松，牵正钳口再压紧。':'去旧工棚装件，向炉芯施火松开旧胶。'}</p></article>`;
      const harvestCard=life.harvest.stage==='unaccepted'?'':`<article><span class="item-glyph">叶</span><h3>两束新叶</h3><p>向阳叶：${leafPlace[life.harvest.sun]}<br>背阴叶：${leafPlace[life.harvest.shade]}</p><p>细长叶在上层，宽圆叶在下层。</p></article>`;
      const rewardCard=life.harvest.stage==='complete'?`<article><span class="item-glyph">囊</span><h3>避兽药囊 · ${life.sachets}份</h3><p>在旧工棚或旧渠干坡脚边拆开，附近山兽绕行八秒。对人和落石无效。${life.scent?`气味正留在${life.scent.scene==='workshop'?'旧工棚':'雾岭旧渠'}，回到原图才继续散去。`:''}</p>${life.sachets>0?this.button('拆开一份，放在脚边','use-sachet','small-button'):''}</article>`:'';
      const canalCard=s.canal.stage==='unaccepted'?'':`<article><span class="item-glyph">渠</span><h3>${s.canal.stage==='complete'?'亲手添下的旧渠小图':'雾岭来信'}</h3><p>${esc(canalObjective(s)||'小图已添在桌边；可以重访旧渠，取扣或试术')}</p></article>`;
      const journeyCard=s.journey.stage==='unaccepted'?'':`<article><span class="item-glyph">归</span><h3>${s.journey.stage==='complete'?'工棚回程记号':'许照的回程约定'}</h3><p>${esc(journeyObjective(s)||(s.journey.recordedShared?'共同走过的回程已经添下两人的记号。':'你亲自走过的回程留在桌边，雨棚坐垫可用。'))}</p></article>`;
      const lifeCards=repairCard+harvestCard+rewardCard+canalCard+journeyCard;
      this.shell('随身之物',`<div class="inventory"><article><span class="item-glyph">◎</span><h3>${s.flags.ringOwned?'控物环':'控物环还在工棚'}</h3><p>辅助引力术的普通法器，旧称“引环”。</p><p>${s.ringStyle==='long'?'长牵：可将十步内的轻物牵到身边。':s.ringStyle==='hold'?'留势：牵住物件后，按 R 使它停留八秒。':'控物环（旧称引环）：辅助引力术的普通法器。'}</p></article><article><span class="item-glyph">符</span><h3>护符·障</h3><p>向面前张开护持，挡一次正面攻击。侧后仍需留意。</p></article><article><span class="item-glyph">药</span><h3>伤药 · ${s.herbs}份</h3><p>就地恢复两格体力。</p>${this.button('使用伤药','heal','small-button')}</article>${lifeCards}${s.flags.chime?'<article><span class="item-glyph">铃</span><h3>山间风铃</h3><p>从眺台带回的清响，可以挂在驿中窗边。</p></article>':''}</div><p class="muted">当前练法可在回石驿工位调整。打开行囊时，世界已暂停。</p>`);
    } else if (this.screen==='map') {
      const seen = s.scene;
      this.shell('山道小图',`<div class="route-map"><div class="map-place ${seen==='home'?'here':''}">回石驿<small>灯架 · 桌边 · 工位</small></div><i>⇄</i><div class="map-place ${seen==='creek'?'here':''}">雨中溪道<small>小舟 · 雨棚 · 眺台</small></div><div class="map-branches"><div class="map-place ${seen==='workshop'?'here':''}">旧工棚<small>林路 · 控物环 · 试架</small></div><div class="map-place ${seen==='crossing'?'here':''}">石渡<small>主闸 · 低滩 · 山脊</small></div></div></div>${s.canal.stage!=='unaccepted'?`<div class="canal-map-link map-place ${seen==='canal'?'here':''}">回石驿 ⇄ 雾岭旧渠<small>在驿前路牌选择另一条山路</small><small>取水处 · 分水槽 · 截水架</small></div>`:''}${s.journey.stage==='complete'?`<div class="canal-map-link map-place ${seen==='kiln'?'here':''}">溪道 ⇄ 背墙旧窑 ⇄ 旧渠<small>${s.kiln.crossed.west&&s.kiln.crossed.east?'已亲自往返':s.kiln.crossed.west||s.kiln.crossed.east?'已从另一端走出；返程仍需亲自认路':s.kiln.visited?'已到旧窑，尚未从另一端走出':'从溪道北路或旧渠西岸近身查看方向牌'}</small><small>窑墙 · 晾坯处 · 东侧高岸</small></div>`:''}<p class="muted">沿路上的方向牌移动到出口，再按 E。小图只标记道路，不代你赶路。</p>`);
    } else if (this.screen==='settings') {
      this.shell('行止与声音',`<div class="settings-list"><label><span>音效</span><input data-setting="volume" type="range" min="0" max="1" step=".05" value="${this.settings.volume}" aria-label="音效音量"></label><label><span>背景音乐</span><input data-setting="music" type="range" min="0" max="1" step=".05" value="${this.settings.music}" aria-label="音乐音量"></label><label><span>减少雨线与镜头缓动</span><input data-setting="reduced" type="checkbox" ${this.settings.reduced?'checked':''}></label><label><span>高对比交互轮廓</span><input data-setting="contrast" type="checkbox" ${this.settings.contrast?'checked':''}></label><label><span>更大的对话文字</span><input data-setting="large" type="checkbox" ${this.settings.large?'checked':''}></label></div><div class="modal-actions">${this.button('保存此刻','save','primary')}${this.button('载入手动档','load-manual','secondary')}${this.button('载入自动档','load-auto','secondary')}${this.button('导出存档','export','secondary')}<label class="button secondary">导入存档<input id="import-save" type="file" accept="application/json,.json" hidden></label>${this.button('重新开始','restart','text-button')}</div>`);
    } else if (this.screen==='help') {
      this.shell('行路须知',`<div class="help-grid"><p><kbd>点击地面 / W A S D</kbd><span>行走；点远处的人或物会先走近</span></p><p><kbd>下方术法 / 1 2 3</kbd><span>选术法，再点击目标施术</span></p><p><kbd>空格</kbd><span>暂停观察，再按继续</span></p><p><kbd>E</kbd><span>与近处的人、物互动</span></p><p><kbd>察看周围 / Q</kbd><span>展开眼前处境和可尝试的办法</span></p><p><kbd>R</kbd><span>学会留势后，让牵住的物件停留</span></p><p><kbd>Esc / 右键</kbd><span>取消瞄准或放下牵物</span></p><p><kbd>回到身边 / C</kbd><span>镜头重新跟随你</span></p><p><kbd>J / I / M</kbd><span>记事 / 行囊 / 山道图</span></p></div><p class="muted">引力术牵住轻物后，点击可达地面放下。暂停时可预先指定一个动作。灵力不足时，退到歇脚处静息即可恢复。</p><div class="modal-actions">${this.button(!this.started?'回到山外':'继续前行',!this.started?'title':'resume','primary')}</div>`);
    } else if (this.screen==='ending') {
      const ending=s.events.filter(e=>e.type==='ending').at(-1)?.text||'你带着自己的控物环，回到了灯下。';
      this.shell('这一程，已有归处',`<p class="ending-copy">${esc(ending)}</p><p class="muted">${s.flags.chime?'窗前添了你带回的风铃。':''}${s.flags.gateOpen?'木车已经沿修通的低滩进院。':'驿后留下了你亲脚走过的山脊路标。'}</p><div class="modal-actions">${this.button('在驿中再坐一会儿','resume','primary')}${this.button('再走一程','restart','secondary')}</div>`);
    } else if (this.screen==='restart') {
      this.shell('重新走这段路',`<p>新一程会重置本轮的人物经历、物件和通路。手动保存的旧档仍保留，直到你再次保存。</p><div class="modal-actions">${this.button('暂不重开','close','secondary')}${this.button('重新选择出身','create','primary')}</div>`);
    }
  }
  private click(e: MouseEvent) {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-ui]'); if (!button) return;
    const a = button.dataset.ui!;
    if (a==='audio') {
      const status = this.sound.inspect();
      this.sound.setMuted(status.state==='running' && !status.muted);
      void this.sound.start().then(()=> { this.lastAudioCheck=0; this.update(); if(this.screen==='title')this.showTitle(); });
      return;
    }
    this.sound.start();
    if (a==='create') this.showCreate();
    else if (a==='title') this.showTitle();
    else if (a==='close') this.close();
    else if (a==='resume') this.close(true);
    else if (a==='pause') this.hooks.act({type:'pause',value:!this.hooks.get().paused});
    else if (a==='load') this.load();
    else if (a==='load-manual') this.load(SAVE);
    else if (a==='load-auto') this.load(AUTO);
    else if (a==='save') this.save();
    else if (a==='export') this.export();
    else if (a==='center') this.hooks.center();
    else if (a==='cancel') this.hooks.cancel();
    else if (a==='observe') this.toggleObservation();
    else if (a.startsWith('spell:')) this.hooks.select(a.slice(6) as Spell);
    else if (a.startsWith('choice:')) { this.hooks.act({type:'choose',choiceId:a.slice(7)}); this.update(); }
    else if (['release','hold','rest','heal','retry','retreat','use-sachet'].includes(a)) { if(a==='use-sachet')this.close(); this.hooks.act({type:a} as GameAction); this.update(); if (a==='heal') this.drawModal(); }
    else if (a==='interact') { const near=nearbyEntity(this.hooks.get()); if (near) this.hooks.act({type:'interact',targetId:near.id}); }
    else this.open(a);
  }
  private change(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.id==='import-save' && el.files?.[0]) {
      el.files[0].text().then(raw=>{ try { const s=restore(raw); s.paused=true; this.pauseBeforeMenu=true; this.started=true; this.lastAuto=s.checkpoint||''; this.endingShown=Boolean(s.flags.endingWish); this.lastEvent=-1; this.hooks.replace(s); this.hooks.act({type:'pause',value:true}); this.close(); this.notify('存档已载入，按空格继续。'); } catch { this.notify('无法读取这份存档，当前行程没有改变。'); } });
    }
    const key=el.dataset.setting as keyof Settings | undefined;
    if (key) {
      if (key==='volume'||key==='music') this.settings[key]=Number(el.value);
      else this.settings[key]=el.checked;
      this.applySettings();
      try { localStorage.setItem(SETTINGS,JSON.stringify(this.settings)); } catch { this.notify('设置仅在本次打开期间生效。'); }
    }
    if (el.name==='appearance') document.querySelector('.character-preview')?.classList.toggle('alternate',el.value==='1');
  }
  private applySettings() {
    document.documentElement.classList.toggle('large-text',this.settings.large);
    document.documentElement.classList.toggle('high-contrast',this.settings.contrast);
    document.documentElement.classList.toggle('reduced-motion',this.settings.reduced);
    this.sound.setVolume(this.settings.volume); this.sound.music=this.settings.music;
    this.hooks.settings(this.settings);
  }
  notify(text: string) {
    this.notices.textContent=text; this.notices.classList.add('visible');
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer=window.setTimeout(()=>this.notices.classList.remove('visible'),4200);
  }
  save() {
    try { localStorage.setItem(SAVE,snapshot(this.hooks.get())); localStorage.setItem(SAVE+'-time',String(Date.now())); this.notify('此刻已保存。'); }
    catch { this.notify('浏览器未能保存。请使用“导出存档”保留这段行程。'); }
  }
  private load(slot?:string) {
    try {
      const latest=Number(localStorage.getItem(AUTO+'-time'))>Number(localStorage.getItem(SAVE+'-time'))?AUTO:SAVE;
      const raw=slot?localStorage.getItem(slot):(localStorage.getItem(latest)||localStorage.getItem(latest===SAVE?AUTO:SAVE));
      if (!raw) { this.notify('还没有存档，先走一段路吧。'); return; }
      // Closing the old menu must not resume the new world or execute its pending action.
      const restored=restore(raw); restored.paused=true; this.pauseBeforeMenu=true; this.started=true; this.lastAuto=restored.checkpoint||''; this.endingShown=Boolean(restored.flags.endingWish); this.lastEvent=-1; this.hooks.replace(restored); this.hooks.act({type:'pause',value:true}); this.close();
      this.notify('回到保存的此刻，按空格继续。');
    } catch { this.notify('存档不兼容或已损坏，当前行程未改变。可以导入备份。'); }
  }
  private export() {
    const blob=new Blob([snapshot(this.hooks.get())],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='山门之外-存档.json';a.click(); URL.revokeObjectURL(url);
  }
  shortcut(key: string) {
    if(this.isTitle)return;
    if(key==='j')this.open('journal'); if(key==='i')this.open('bag'); if(key==='m')this.open('map');
    if(key==='Escape' && this.screen)this.close();
  }
  toggleObservation() {
    if(this.blocked||this.hooks.get().dialogue||this.hooks.get().defeated)return;
    this.observationOpen=!this.observationOpen;
    this.update();
  }
  resetObservation(){this.observationOpen=false;this.observationKey='';}
  private updateObservation(s:GameState) {
    if(this.observationScene!==s.scene){this.observationScene=s.scene;this.observationOpen=false;}
    const encounter=nearbyEncounter(s);
    const hidden=!this.started||this.blocked||Boolean(s.dialogue)||s.defeated||!encounter;
    const key=JSON.stringify([hidden,this.observationOpen,encounter]);
    if(key===this.observationKey)return;this.observationKey=key;
    this.observations.classList.toggle('hidden',hidden);
    this.observations.innerHTML=encounter?`<aside class="observation paper ${this.observationOpen?'expanded':''}" aria-label="眼前处境"><button class="observation-toggle" data-ui="observe" aria-expanded="${this.observationOpen}" aria-controls="observation-content"><span class="observation-mark" aria-hidden="true">◎</span><span>察看周围</span><kbd>Q</kbd><span class="observation-chevron" aria-hidden="true">${this.observationOpen?'−':'＋'}</span></button><div id="observation-content" ${this.observationOpen?'':'hidden'}><h3>${esc(encounter.title)}</h3><p>${esc(encounter.fact)}</p><ul>${encounter.options.map(option=>`<li>${esc(option)}</li>`).join('')}</ul><small>留意眼前的变化，也可以试自己的办法。</small></div></aside>`:'';
  }
  update() {
    const s=this.hooks.get();
    this.updateObservation(s);
    if (performance.now()-this.lastAudioCheck>400 || !this.lastAudioCheck) {
      const status=this.sound.inspect(); this.audioState=status.muted?'muted':status.state; this.lastAudioCheck=performance.now();
    }
    const near=nearbyEntity(s);
    const aiming=this.hooks.aiming();
    const hudKey=JSON.stringify([s.scene,s.player.hp,s.player.mana,s.selected,s.paused,s.ringStyle,Boolean(s.player.pullId),near?.id,objective(s),Boolean(s.dialogue),s.defeated,this.screen,s.flags.ringOwned,s.flags.trialStyle,this.audioState,aiming,s.pending?.type]);
    if(hudKey!==this.lastHud) {
      this.lastHud=hudKey;
      this.hud.innerHTML=`<div class="top-left paper hud-paper"><span class="name-mark">${esc(s.profile.name.slice(0,1))}</span><div><strong>${esc(s.profile.name)}</strong><span class="realm">凝气 · 三层</span><div class="resource hp" aria-label="体力 ${s.player.hp}/4"><span>体力</span>${[0,1,2,3].map(i=>`<i class="${i<s.player.hp?'full':''}"></i>`).join('')}</div><div class="resource mana" aria-label="灵力 ${s.player.mana}/6"><span>灵力</span>${[0,1,2,3,4,5].map(i=>`<i class="${i<s.player.mana?'full':''}"></i>`).join('')}</div></div></div><div class="location"><span>${SCENES[s.scene].subtitle}</span><h2>${SCENES[s.scene].title}</h2><p>${esc(objective(s))}</p></div><nav class="top-right">${this.button('山道','map')}${this.button('记事','journal')}${this.button('行囊','bag')}${this.button('设置','settings')}${this.audioButton()}</nav><div class="pause-state ${s.paused&&!s.dialogue&&!this.screen?'shown':''}">${this.button('Ⅱ 已暂停 · 点击继续','pause','paper')}</div><div class="bottom-left"><span>WASD / 点击 · 行走</span><span>空格 · 暂停　C · 回到身边</span>${this.button('回到身边','center','touch-center paper')}</div><div class="action-dock paper"><div class="spells">${(['pull','flame','ward'] as Spell[]).map((spell,i)=>`<button data-ui="spell:${spell}" class="spell ${s.selected===spell?'selected':''}" aria-pressed="${s.selected===spell}" title="${['牵引轻物；再点地面放下','点燃干物、打断敌人','向瞄准方向护持一次'][i]}"><kbd>${i+1}</kbd><span class="spell-symbol">${['引','焰','障'][i]}</span><span>${['引力术','火焰球','护符·障'][i]}</span></button>`).join('')}</div><div class="dock-divider"></div>${this.button(s.paused?'▶ 继续':'Ⅱ 暂停','pause','pause-button')}${s.pending?.type==='use-sachet'?this.button('取消放药','cancel','small-button'):''}${aiming&&(!s.player.pullId||s.selected!=='pull')?this.button('收术','cancel','small-button'):''}${s.player.pullId?this.button('放下','release','small-button'):''}${s.player.pullId&&(s.ringStyle==='hold'||s.flags.trialStyle==='hold')?this.button('R 留势','hold','small-button'):''}</div><div class="nearby ${near&&!s.dialogue&&!this.screen?'shown':''}">${near?this.button(`<kbd>E</kbd> ${esc(near.name)}`,'interact','paper'):''}</div><button class="help-toggle" data-ui="help" aria-label="操作帮助">?</button>`;
      this.hud.classList.toggle('hidden',!this.started||this.isTitle);
      this.hud.classList.toggle('reading',Boolean(s.dialogue)||Boolean(s.defeated));
    }
    const dk=JSON.stringify([s.dialogue,s.defeated]);
    if(dk!==this.lastDialogue) {
      this.lastDialogue=dk;
      if(s.defeated)this.dialogues.innerHTML=`<div class="defeat-wrap"><section class="paper defeat"><span class="eyebrow">暂且退一步</span><h2>气息未稳</h2><p>${esc(s.events.at(-1)?.text||'受击后失去了行动余力。')}</p><div class="modal-actions">${this.button('重试当前处境','retry','primary')}${this.button('撤回歇脚处','retreat','secondary')}</div></section></div>`;
      else if(s.dialogue)this.dialogues.innerHTML=`<section class="dialogue paper" role="dialog" aria-label="与${esc(s.dialogue.speaker)}交谈"><div class="dialogue-speaker"><span class="dialogue-seal">${esc(s.dialogue.speaker.slice(0,1))}</span><strong>${esc(s.dialogue.speaker)}</strong><small>此刻已暂停</small></div><div class="dialogue-content"><p>${esc(s.dialogue.text)}</p><div class="dialogue-choices">${s.dialogue.choices.map((c,i)=>`<button data-ui="choice:${esc(c.id)}" ${c.disabled?'disabled':''} title="${esc(c.disabled||'')}"><span>${i+1}</span>${esc(c.label)}${c.disabled?`<small>${esc(c.disabled)}</small>`:''}</button>`).join('')}</div></div></section>`;
      else this.dialogues.innerHTML='';
    }
    const ev=s.events.at(-1);
    if(ev&&ev.seq!==this.lastEvent) { this.lastEvent=ev.seq; if(!this.isTitle){ this.notify(ev.text); } }
    const safeKey=s.checkpoint||'';
    if(this.started && !this.isTitle && safeKey!==this.lastAuto) {
      this.lastAuto=safeKey;
      try { localStorage.setItem(AUTO,snapshot(s)); localStorage.setItem(AUTO+'-time',String(Date.now())); } catch { this.notify('自动保存不可用，可在设置中导出存档。'); }
    }
    if(s.ended&&!this.endingShown) { this.endingShown=true; this.save(); this.open('ending'); }
  }
}
