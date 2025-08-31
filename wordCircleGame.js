/* ---------- helpers ---------- */
async function fetchJSON(path){ const r=await fetch(path); if(!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }
const withBase=(base,p)=>!p||/^https?:|^\//.test(p)?p:`${(base||'').replace(/\/$/,'')}/${p}`;
const deepMerge=(t,s)=>{ if(!s||typeof s!=='object') return t; for(const k of Object.keys(s)){ const sv=s[k], tv=t[k]; t[k]=sv&&typeof sv==='object'&&!Array.isArray(sv)?deepMerge(tv&&typeof tv==='object'?tv:{},sv):Array.isArray(sv)?sv.slice():sv;} return t; };

function getPathSlug(base="/game"){
  const p=location.pathname.replace(/\/+$/,"");
  if(!base) return null;
  const norm=base.replace(/\/+$/,"");
  if(!p.startsWith(norm)) return null;
  const rest=p.slice(norm.length);
  const parts=rest.split("/").filter(Boolean);
  return parts[0]||null;
}

/* ---------- main game ---------- */
class WordCircleGame{
  constructor(){
    this.config=null;
    this.allWords={};
    this.previewWords={};
    this.words=[];
    this.currentIndex=0;
    this.correctAnswers=0;
    this.incorrectAnswers=0;
    this.pasapalabraCount=0;
    this.correctPoints=0;
    this.incorrectPoints=0;
    this.pasapalabraPoints=0;
    this.timeBonus=0;
    this.totalPoints=0;
    this.remainingWords=[];
    this.answeredWords=[];
    this.userAnswers={};
    this.timerInterval=null;
    this.timeLeft=300;
    this.hintsUsed=0;
    this.pasapalabraUsed=[];
    this.gameEnded=false;
    this.isPreviewMode=false;
  }

  async init(){
    document.getElementById('loadingScreen').style.display='flex';

    // catalog + defaults
    this.catalog = await fetchJSON('catalog.json');
    this.defaultNode = this.catalog.default;

    // routing
    const param       = this.catalog.routing?.param || 'challenge';
    const pathBase    = this.catalog.routing?.pathBase || null;
    const defaultSlug = this.catalog.routing?.defaultSlug || Object.keys(this.catalog.challenges)[0];

    const pathSlug = pathBase ? getPathSlug(pathBase) : null;
    const urlSlug  = new URL(location.href).searchParams.get(param);
    const saved    = localStorage.getItem('wcg:lastChallenge');

    const slug = this.catalog.challenges[pathSlug] ? pathSlug
              : this.catalog.challenges[urlSlug]  ? urlSlug
              : this.catalog.challenges[saved]    ? saved
              : defaultSlug;

    await this.selectChallenge(slug, { silent:true });
    this.setGameContent();

    // Optional “conditions” pills (desktop header or mobile sheet if you add them)
    const cond = document.getElementById('conditionsBar');
    if (cond){
      const gs = this.config.gameSettings || {};
      const sc = gs.scoring || {};
      const fm = gs.fuzzyMatching || {};
      const timeText = Number.isFinite(gs.timeLimit) ? formatTime(gs.timeLimit) : '—';
      const maxBonus = (Array.isArray(sc.timeBonus?.levels) && sc.timeBonus.levels.length)
        ? Math.max(...sc.timeBonus.levels.map(l=>l?.bonus??0)) : 0;

      const pills = [
        `<span class="cond-pill warn">⏱ ${timeText}</span>`,
        `<span class="cond-pill">💡 Hints: ${gs.maxHints ?? 0}</span>`,
        `<span class="cond-pill good">✅ +${sc.correct ?? 0}</span>`,
        `<span class="cond-pill bad">❌ ${sc.incorrect ?? 0}</span>`,
        `<span class="cond-pill warn">⏭ ${sc.pasapalabra ?? 0}</span>`,
        fm.enabled ? `<span class="cond-pill">🧠 Fuzzy ≥${Math.round((fm.threshold ?? 0)*100)}%</span>` : `<span class="cond-pill">🧠 Exact match</span>`,
        gs.penalizeUnanswered ? `<span class="cond-pill bad">⛔ Unanswered = ${sc.incorrect ?? 0}</span>` : `<span class="cond-pill">⛔ Unanswered = 0</span>`,
        maxBonus ? `<span class="cond-pill good">⚡ Bonus up to +${maxBonus} (≥${sc.timeBonus?.threshold ?? 0} correct)</span>` : ''
      ].filter(Boolean).join('');
      cond.innerHTML = pills;
      const body = document.getElementById('condBody'); if (body) body.innerHTML = pills;
    }

    document.getElementById('loadingScreen').style.display='none';
    document.getElementById('welcomeScreen').style.display='flex';

    this.setupEventListeners();
  }

  async loadLogos(){
    try{
      const wl = this.config.logoPath ? await loadLogo(this.config.logoPath)
                                      : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#fff;font-weight:800;font-size:24px;">LOGO</div>`;
      document.getElementById('welcomeLogo').innerHTML = wl;

      const cl = this.config.centerLogoPath ? await loadLogo(this.config.centerLogoPath)
                                            : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#E30613;font-weight:800;font-size:18px;">LOGO</div>`;
      document.getElementById('centerLogo').innerHTML = cl;
    }catch(err){
      console.error('Error loading logos, using placeholders:', err);
    }
  }

  async selectChallenge(slug,{silent=false}={}){
    const ch = this.catalog.challenges[slug]; if(!ch) throw new Error(`Unknown challenge: ${slug}`);
    this.activeSlug = slug;

    // defaults + overrides
    const gameSettings = deepMerge({}, this.defaultNode.gameSettings||{}); deepMerge(gameSettings, ch.gameSettings||{});
    const theme        = deepMerge({}, this.defaultNode.theme||{});        deepMerge(theme,        ch.theme||{});
    const logoPath     = ch.logoPath       ? withBase(ch.basePath, ch.logoPath)       : withBase(this.defaultNode.basePath, this.defaultNode.logoPath);
    const centerLogo   = ch.centerLogoPath ? withBase(ch.basePath, ch.centerLogoPath) : withBase(this.defaultNode.basePath, this.defaultNode.centerLogoPath);
    const stylesPath   = ch.stylesPath     ? withBase(ch.basePath, ch.stylesPath)     : withBase(this.defaultNode.basePath, this.defaultNode.stylesPath);

    this.config = {
      gameSettings, theme,
      gameTitle:   ch.title    || this.defaultNode.title    || 'Word Circle Game',
      gameSubtitle:ch.subtitle || this.defaultNode.subtitle || '',
      logoPath, centerLogoPath:centerLogo, stylesPath, basePath: ch.basePath
    };

    // questions/preview
    const qPath = withBase(ch.basePath, ch.questionsPath || 'questions.json');
    const pPath = ch.previewPath ? withBase(ch.basePath, ch.previewPath) : qPath;

    this.allWords    = await fetchJSON(qPath);
    this.previewWords= await fetchJSON(pPath);

    await this.loadStyles();
    applyTheme(this.config.theme);
    await this.loadLogos();
    this.setGameContent();

    if(!silent){
      const param = this.catalog.routing?.param || 'challenge';
      const url = new URL(location.href);
      url.searchParams.set(param, slug);
      history.replaceState({},'',url);
      localStorage.setItem('wcg:lastChallenge', slug);
    }
  }

  async loadStyles(){
    const link = document.getElementById('challengeStylesheet');
    if(link && this.config.stylesPath) link.href = this.config.stylesPath;
  }

  setGameContent(){
    const cfg=this.config||{};
    const gs = cfg.gameSettings||{};
    const sc = gs.scoring||{};
    const tb = sc.timeBonus || { threshold:0, levels:[] };

    const setText=(sel,v)=>{ const el=document.querySelector(sel); if(el&&v!=null) el.textContent=v; };

    setText('#gameTitle',        cfg.gameTitle || 'Word Circle Game');
    setText('#gameSubtitle',     (cfg.gameSubtitle||'').trim());
    setText('#gameHeaderTitle',  cfg.gameTitle || 'Word Circle Game');

    const badge = document.getElementById('challengeBadge');
    if(badge){
      const st=(cfg.gameSubtitle||'').trim();
      if(st){ badge.textContent=st.toUpperCase(); badge.style.display='inline-block'; }
      else  { badge.style.display='none'; }
    }

    setText('#welcomeTimeLimit', formatTime(gs.timeLimit||0));
    setText('#welcomeMaxHints', gs.maxHints ?? 0);

    const pts=(n)=>`point${Math.abs(n)===1?'':'s'}`;
    setText('#correctPoints',     `+${sc.correct ?? 0} ${pts(sc.correct??0)}`);
    setText('#incorrectPoints',   `${sc.incorrect ?? 0} ${pts(sc.incorrect??0)}`);
    setText('#pasapalabraPoints', `${sc.pasapalabra ?? 0} ${pts(sc.pasapalabra??0)}`);
    setText('#timeBonusThreshold', tb.threshold ?? 0);

    const maxBonus = (Array.isArray(tb.levels) && tb.levels.length)
      ? Math.max(...tb.levels.map(l=>l?.bonus??0)) : 0;
    setText('#maxTimeBonus', maxBonus ? `Up to +${maxBonus} points` : '—');
  }

  setupEventListeners(){
    document.getElementById('answer').addEventListener('keyup',(e)=>{
      if(e.key==='Enter' && !this.gameEnded) this.checkAnswer();
    });

    const overlay=document.getElementById('condOverlay');
    document.getElementById('condToggle')?.addEventListener('click',()=>overlay?.classList.add('show'));
    document.getElementById('condClose')?.addEventListener('click',()=>overlay?.classList.remove('show'));
    overlay?.addEventListener('click',(e)=>{ if(e.target===overlay) overlay.classList.remove('show'); });

    window.addEventListener('resize',()=>this.recalculateRoscoPositions());
    this.setupStickyActionBar();
  }

  /* ---------- modes ---------- */
  startPreview(){
    this.isPreviewMode = true;
    document.body.classList.add('preview-mode');

    const set = (this.previewWords && Object.keys(this.previewWords).length) ? this.previewWords : this.allWords;
    this.selectWordsFromSet(set);
    if(!this.words.length){ alert('No preview questions found for this challenge.'); return; }

    this.resetGameState();
    this.createRosco();
    this.updateGame();

    this.startTimer();
    setTimeout(()=>this.recalculateRoscoPositions(),100);

    document.getElementById('welcomeScreen').style.display='none';
    document.getElementById('gameContainer').style.display='block';

    const inp=document.getElementById('answer');
    if(inp){ inp.disabled=false; inp.placeholder='Preview Mode - Type your answer...'; }

    const cur=this.remainingWords[this.currentIndex];
    if(cur) document.getElementById('definition').textContent=`[PREVIEW] ${cur.definition}`;
  }

  selectWordsFromSet(set){
    this.words=[];
    if(!set || typeof set!=='object') return;

    const letters = Object.keys(set).sort((a,b)=>a.localeCompare(b));
    for(const key of letters){
      const list=set[key]; if(!Array.isArray(list)||!list.length) continue;
      const item=list[Math.floor(Math.random()*list.length)]||{};
      const answers = Array.isArray(item.answers)&&item.answers.length ? item.answers : (item.word?[item.word]:[]);
      this.words.push({ letter:key.toUpperCase(), word:item.word||(answers[0]||''), definition:item.definition||'', answers });
    }
    this.words.sort((a,b)=>a.letter.localeCompare(b.letter));
  }

  selectRandomWords(){ this.selectWordsFromSet(this.allWords); }

  setupStickyActionBar() {
    const bar = document.getElementById('actionBar');
    const gc  = document.getElementById('gameContainer');
    if (!bar || !gc) return;
  
    const setBottomPadding = () => {
      if (matchMedia('(max-width: 768px)').matches) {
        // keep enough space for the bar
        gc.style.paddingBottom = Math.max(120, bar.offsetHeight + 24) + 'px';
      } else {
        gc.style.paddingBottom = '';
        bar.style.transform = '';
      }
    };
  
    setBottomPadding();
    window.addEventListener('resize', setBottomPadding);
  
    // Float above the on-screen keyboard using VisualViewport
    if (window.visualViewport) {
      const vv = window.visualViewport;
      const reposition = () => {
        // keyboard height = innerHeight - vv.height - vv.offsetTop
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        // move the bar up by the keyboard height
        bar.style.transform = kb ? `translateY(-${kb}px)` : '';
      };
      vv.addEventListener('resize', reposition);
      vv.addEventListener('scroll', reposition);
      window.addEventListener('orientationchange', reposition);
    }
  
    const input = document.getElementById('answer');
    input?.addEventListener('focus', () => setTimeout(setBottomPadding, 50));
    input?.addEventListener('blur',  () => setTimeout(() => { bar.style.transform = ''; }, 50));
  }

  newGame(){
    this.isPreviewMode=false;
    document.body.classList.remove('preview-mode');

    this.selectRandomWords();
    this.resetGameState();
    this.createRosco();
    this.updateGame();
    this.startTimer();
    setTimeout(()=>this.recalculateRoscoPositions(),100);
  }

  /* ---------- state / UI ---------- */
  resetGameState(){
    this.currentIndex=0; this.correctAnswers=0; this.incorrectAnswers=0; this.pasapalabraCount=0;
    this.hintsUsed=0; this.correctPoints=0; this.incorrectPoints=0; this.pasapalabraPoints=0;
    this.timeBonus=0; this.totalPoints=0; this.remainingWords=[...this.words];
    this.answeredWords=new Array(this.words.length).fill(null); this.userAnswers={}; this.pasapalabraUsed=[];
    this.timeLeft=this.config.gameSettings.timeLimit; this.gameEnded=false;

    const inp=document.getElementById('answer');
    if(inp){ inp.disabled=false; inp.value=''; inp.placeholder='Type your answer here...'; }

    const fs=document.getElementById('finalScore'); if(fs){ fs.innerHTML=''; fs.style.display='none'; }
    const vr=document.getElementById('viewResults'); if(vr) vr.style.display='none';
    const res=document.getElementById('results'); if(res){ res.style.display='none'; res.innerHTML=''; }
    const fh=document.getElementById('fuzzyHint'); if(fh) fh.style.display='none';
    const hintsLeft=document.querySelector('.hints-left'); if(hintsLeft) hintsLeft.textContent=this.config.gameSettings.maxHints;
  }

  createRosco(){
    const rosco=document.getElementById('rosco'); rosco.innerHTML='';
    this.words.forEach((w,i)=>{
      const d=document.createElement('div');
      d.className='letter'; d.textContent=w.letter; d.dataset.letter=w.letter; d.dataset.index=i;
      rosco.appendChild(d);
    });
  }

  recalculateRoscoPositions(){
    const letters=document.querySelectorAll('.letter'); if(!letters.length) return;
    const cont=document.querySelector('.rosco-container'); if(!cont) return;

    const cw=cont.offsetWidth, ch=cont.offsetHeight, r=Math.min(cw,ch)*.44, cx=cw/2, cy=ch/2;
    letters.forEach((el,i)=>{
      const ang=(i/letters.length)*2*Math.PI - Math.PI/2;
      const x=Math.cos(ang)*r + cx - (el.offsetWidth/2);
      const y=Math.sin(ang)*r + cy - (el.offsetHeight/2);
      el.style.left=`${x}px`; el.style.top=`${y}px`;
    });
  }

  startTimer(){
    clearInterval(this.timerInterval);
    this.timerInterval=setInterval(()=>{
      this.timeLeft--; this.updateTimerDisplay();
      if(this.timeLeft<=0) this.endGame();
    },1000);
  }

  updateTimerDisplay(){
    const t=document.getElementById('timer'); if(!t) return;
    if(this.isPreviewMode){
      t.textContent='PREVIEW';
      t.style.background='linear-gradient(135deg, #FF8C00 0%, #e67300 100%)';
    }else{
      t.textContent=formatTime(this.timeLeft);
      t.style.background='';
      if(this.timeLeft<=60) t.classList.add('timer-urgent'); else t.classList.remove('timer-urgent');
    }
  }

  updateGame(){
    const letters=document.querySelectorAll('.letter');
    letters.forEach((el,i)=>{
      el.classList.remove('current');
      if(this.remainingWords.length>0 && this.words[i]===this.remainingWords[this.currentIndex]) el.classList.add('current');
    });

    if(this.remainingWords.length>0){
      const cur=this.remainingWords[this.currentIndex];
      const prefix=this.isPreviewMode?'[PREVIEW] ':'';
      const def=document.getElementById('definition'); if(def) def.textContent=prefix+cur.definition;
      const ld=document.getElementById('currentLetterDisplay'); if(ld) ld.textContent=cur.letter;
    }else{
      const def=document.getElementById('definition'); if(def) def.textContent="You've completed all words!";
      const ld=document.getElementById('currentLetterDisplay'); if(ld) ld.textContent='';
    }

    const inp=document.getElementById('answer');
    if(inp){ inp.value=''; inp.focus(); inp.placeholder=this.isPreviewMode?'Preview Mode - Type your answer...':'Type your answer here...'; }
    const fh=document.getElementById('fuzzyHint'); if(fh) fh.style.display='none';

    document.getElementById('correctCount')?.replaceChildren(document.createTextNode(this.correctAnswers));
    document.getElementById('incorrectCount')?.replaceChildren(document.createTextNode(this.incorrectAnswers));
    document.getElementById('pointsCount')?.replaceChildren(document.createTextNode(this.totalPoints));
  }

  checkAnswer(){
    if(this.remainingWords.length===0 || this.gameEnded){ this.endGame(); return; }
    const val=document.getElementById('answer').value.trim(); if(!val) return;

    const cur=this.remainingWords[this.currentIndex];
    const letter=cur.letter;
    const idx=this.words.findIndex(w=>w.letter===letter);
    const letters=document.querySelectorAll('.letter');

    this.userAnswers[letter]=val;

    const ok = checkAnswer(val, cur.answers, this.config.gameSettings.fuzzyMatching);
    letters[idx].classList.remove('passed');

    if(ok){
      playSound('correct'); showFeedback(true, letters[idx]);
      letters[idx].classList.remove('current'); letters[idx].classList.add('correct');
      this.correctAnswers++; this.answeredWords[idx]=true;
      if(!this.isPreviewMode){ this.correctPoints += this.config.gameSettings.scoring.correct; this.totalPoints += this.config.gameSettings.scoring.correct; }
    }else{
      if(this.config.gameSettings.fuzzyMatching?.enabled){
        const wasClose = cur.answers.some(a=>{
          const sim = 1 - (levenshteinDistance(val.toLowerCase(), a.toLowerCase()) / Math.max(val.length, a.length));
          return sim>0.6 && sim < (this.config.gameSettings.fuzzyMatching.threshold ?? 0.8);
        });
        if(wasClose){ const el=document.getElementById('fuzzyHint'); if(el){ el.style.display='block'; setTimeout(()=>el.style.display='none',3000); } }
      }
      playSound('incorrect'); showFeedback(false, letters[idx]);
      letters[idx].classList.remove('current'); letters[idx].classList.add('incorrect');
      this.incorrectAnswers++; this.answeredWords[idx]=false;
      if(!this.isPreviewMode){ this.incorrectPoints += this.config.gameSettings.scoring.incorrect; this.totalPoints += this.config.gameSettings.scoring.incorrect; }
    }

    this.remainingWords.splice(this.currentIndex,1);
    if(this.remainingWords.length===0) this.endGame();
    else { if(this.currentIndex>=this.remainingWords.length) this.currentIndex=0; this.updateGame(); }
  }

  pasapalabra(){
    if(this.remainingWords.length>1 && !this.gameEnded){
      playSound('pasapalabra');
      const curL=this.remainingWords[this.currentIndex].letter;
      const idx=this.words.findIndex(w=>w.letter===curL);
      const letters=document.querySelectorAll('.letter');

      if(!this.pasapalabraUsed.includes(curL)){
        this.pasapalabraUsed.push(curL); this.pasapalabraCount++;
        if(!this.isPreviewMode){ this.pasapalabraPoints += this.config.gameSettings.scoring.pasapalabra; this.totalPoints += this.config.gameSettings.scoring.pasapalabra; }
        if(letters[idx]) letters[idx].classList.add('passed');
      }
      this.currentIndex=(this.currentIndex+1) % this.remainingWords.length;
      this.updateGame();
    }else if(this.remainingWords.length===1){ alert("Only one word remaining. You must answer it!"); }
    else{ this.endGame(); }
  }

  showHint(){
    if(this.hintsUsed < this.config.gameSettings.maxHints && this.remainingWords.length>0 && !this.gameEnded){
      const cur=this.remainingWords[this.currentIndex];
      const ans=cur.word || cur.answers[0];
      const hint=`The word starts with "${ans.charAt(0)}" and has ${ans.length} letters`;

      document.getElementById('current-hint')?.remove();
      const el=document.createElement('div');
      el.id='current-hint'; el.textContent=hint;
      el.style.cssText=`
        position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
        background:linear-gradient(135deg, rgba(52,152,219,.9), rgba(41,128,185,.9));
        color:#fff; padding:12px 18px; border-radius:10px; font-weight:700; z-index:1000; box-shadow:0 8px 25px rgba(0,0,0,.3);
      `;
      document.querySelector('.rosco-container').appendChild(el);
      setTimeout(()=>el.remove(),3000);

      this.hintsUsed++;
      const left=this.config.gameSettings.maxHints - this.hintsUsed;
      const t=document.querySelector('.hints-left'); if(t) t.textContent=left;
    }else if(this.hintsUsed >= this.config.gameSettings.maxHints){
      alert("You've used all available hints!");
    }
  }

  endGame(){
    if(this.gameEnded) return;
    this.gameEnded=true; clearInterval(this.timerInterval);

    if(this.isPreviewMode){
      alert("Preview complete! Ready to start the real challenge?");
      this.backToWelcome(); return;
    }

    const letters=document.querySelectorAll('.letter');
    letters.forEach((el,i)=>{
      if(this.answeredWords[i]===null){
        el.classList.remove('current','correct','incorrect','passed');
        el.classList.add('unanswered');
        if(this.config.gameSettings.penalizeUnanswered){
          this.incorrectAnswers++;
          this.incorrectPoints += this.config.gameSettings.scoring.incorrect;
          this.totalPoints    += this.config.gameSettings.scoring.incorrect;
        }
        this.userAnswers[this.words[i].letter] = "";
      }
    });

    const used = this.config.gameSettings.timeLimit - this.timeLeft;
    this.timeBonus = calculateTimeBonus(this.correctAnswers, used, this.config.gameSettings.scoring.timeBonus);
    this.totalPoints += this.timeBonus;

    this.displayFinalScore(used);
    const inp=document.getElementById('answer'); if(inp) inp.disabled=true;
    document.getElementById('viewResults').style.display='inline-block';
    if(this.correctAnswers > this.incorrectAnswers) showConfetti();
  }

  backToWelcome(){
    document.getElementById('gameContainer').style.display='none';
    document.getElementById('welcomeScreen').style.display='flex';
    document.body.classList.remove('preview-mode');
    this.isPreviewMode=false;
    clearInterval(this.timerInterval);
  }

  displayFinalScore(used){
    const el=document.getElementById('finalScore');
    const unanswered=this.words.length - this.correctAnswers - this.incorrectAnswers;
    el.innerHTML=`
      <h3>🎉 Game Complete!</h3>
      <p>Your final performance:</p>
      <p>
        <span class="score-value correct-score">${this.correctAnswers}</span> correct |
        <span class="score-value incorrect-score">${this.incorrectAnswers}</span> incorrect |
        <span class="score-value">${this.pasapalabraCount}</span> passed
        ${unanswered>0?` | <span class="score-value">${unanswered}</span> unanswered`:''}
      </p>
      <p>Time used: ${formatTime(used)} of ${formatTime(this.config.gameSettings.timeLimit)}</p>
      <div class="points-breakdown">
        <h3>📊 Score Breakdown</h3>
        <p>✅ Points from correct answers: <strong>+${this.correctPoints}</strong></p>
        <p>❌ Points lost from incorrect answers: <strong>${this.incorrectPoints}</strong></p>
        <p>⏭️ Points lost from passes: <strong>${this.pasapalabraPoints}</strong></p>
        <p>⚡ Time bonus: <strong>+${this.timeBonus}</strong></p>
        <div class="total-points">🏆 TOTAL SCORE: ${this.totalPoints}</div>
      </div>`;
    el.style.display='block';
  }

  showResults(){
    const wrap=document.getElementById('results');
    wrap.innerHTML=''; wrap.style.display='block';

    const container=document.createElement('div'); container.className='results-container';
    const header=document.createElement('div'); header.className='results-header';
    header.innerHTML=`<h2>📋 Detailed Results</h2><p class="subtitle">${this.config.gameTitle} - ${this.config.gameSubtitle}</p>`;
    container.appendChild(header);

    const accuracy=Math.round((this.correctAnswers/this.words.length)*100);
    const summary=document.createElement('div'); summary.className='results-summary';
    summary.innerHTML=`
      <div class="summary-item"><div class="summary-label">Accuracy</div><div class="summary-value neutral">${accuracy}%</div></div>
      <div class="summary-item"><div class="summary-label">Correct</div><div class="summary-value correct">${this.correctAnswers}</div></div>
      <div class="summary-item"><div class="summary-label">Incorrect</div><div class="summary-value incorrect">${this.incorrectAnswers}</div></div>
      <div class="summary-item"><div class="summary-label">Passed</div><div class="summary-value neutral">${this.pasapalabraCount}</div></div>
      <div class="summary-item"><div class="summary-label">Final Score</div><div class="summary-value neutral">${this.totalPoints}</div></div>`;
    container.appendChild(summary);

    const correct=[], incorrect=[];
    this.words.forEach(w=>{
      const ua=this.userAnswers[w.letter] || "Not answered";
      const ok=checkAnswer(ua, w.answers, {enabled:false});
      (ok?correct:incorrect).push({...w, userAnswer:ua});
    });

    const makeCard=(w,ok)=>{
      const card=document.createElement('div');
      card.style.cssText=`background:#f8f9fa;padding:15px;margin:10px 0;border-radius:8px;border-left:4px solid ${ok?'#00A651':'#E30613'};`;
      const ans=w.word||w.answers[0], ua=w.userAnswer||'Not answered';
      card.innerHTML=`
        <div style="font-weight:bold;color:#E30613;margin-bottom:5px;font-size:18px;">${w.letter} - ${ans}</div>
        <div style="margin-bottom:8px;color:#666;font-style:italic;">${w.definition}</div>
        <div style="color:${ok?'#00A651':'#E30613'};font-weight:500;">
          Your answer: ${ua}
          ${!ok?`<br><strong style="color:#333;">Correct answer: ${ans}</strong>`:''}
          ${w.answers.length>1?`<br><small style="color:#666;">Also accepted: ${w.answers.slice(1).join(', ')}</small>`:''}
        </div>`;
      return card;
    };

    if(correct.length){
      const sec=document.createElement('div');
      sec.className='results-section';
      sec.innerHTML=`<h3 class="section-title correct" style="color:#00A651;">✅ Correct Answers (${correct.length})</h3>`;
      const grid=document.createElement('div'); grid.className='results-grid';
      correct.forEach(w=>grid.appendChild(makeCard(w,true)));
      sec.appendChild(grid); container.appendChild(sec);
    }

    if(incorrect.length){
      const sec=document.createElement('div');
      sec.className='results-section';
      sec.innerHTML=`<h3 class="section-title incorrect" style="color:#E30613;">❌ Incorrect Answers (${incorrect.length})</h3>`;
      const grid=document.createElement('div'); grid.className='results-grid';
      incorrect.forEach(w=>grid.appendChild(makeCard(w,false)));
      sec.appendChild(grid); container.appendChild(sec);
    }

    const footer=document.createElement('div'); footer.className='result-footer';
    footer.innerHTML=`<div class="results-actions" style="text-align:center;margin-top:30px;">
      <button class="primary" onclick="game.generatePDF()" style="margin:0 10px;">📄 Download PDF</button>
      <button class="success" onclick="game.newGame()" style="margin:0 10px;">🎮 New Game</button>
      <button onclick="game.hideResults()" style="margin:0 10px;">👁️ Hide Results</button>
    </div>`;
    container.appendChild(footer);

    wrap.appendChild(container);
  }

  hideResults(){ document.getElementById('results').style.display='none'; }

  generatePDF(){
    if(typeof window.jspdf==='undefined' || !window.jspdf.jsPDF){ alert('PDF generation is not available.'); return; }
    const { jsPDF } = window.jspdf; const pdf=new jsPDF();

    pdf.setFillColor(226,240,253); pdf.rect(0,0,210,35,'F');
    pdf.setDrawColor(52,152,219); pdf.setLineWidth(1.5); pdf.line(0,35,210,35);

    pdf.setFont("helvetica","bold"); pdf.setFontSize(22); pdf.setTextColor(44,62,80);
    pdf.text(this.config.gameTitle,105,15,{align:"center"});
    pdf.setFontSize(14); pdf.text(this.config.gameSubtitle,105,25,{align:"center"});

    const today=new Date().toLocaleDateString('en-US');
    pdf.setFontSize(10); pdf.text(`Date: ${today}`,180,10,{align:"left"});

    const accuracy=Math.round((this.correctAnswers/this.words.length)*100);
    let y=50;
    pdf.setFillColor(235,245,253); pdf.roundedRect(15,y,180,60,3,3,'F');
    pdf.setFont("helvetica","bold"); pdf.setFontSize(16); pdf.text("GAME SUMMARY",105,y+15,{align:"center"});
    pdf.setFont("helvetica","normal"); pdf.setFontSize(12);
    pdf.text(`Accuracy: ${accuracy}% (${this.correctAnswers}/${this.words.length})`,25,y+30);
    pdf.text(`Incorrect: ${this.incorrectAnswers} | Passed: ${this.pasapalabraCount}`,25,y+40);
    pdf.text(`Time used: ${formatTime(this.config.gameSettings.timeLimit - this.timeLeft)}`,25,y+50);

    y+=80; pdf.setFont("helvetica","bold"); pdf.setFontSize(14); pdf.text("SCORE BREAKDOWN",25,y);
    pdf.setFont("helvetica","normal"); pdf.setFontSize(11);
    y+=15; pdf.text(`Correct answers: +${this.correctPoints}`,25,y);
    y+=10; pdf.text(`Incorrect answers: ${this.incorrectPoints}`,25,y);
    y+=10; pdf.text(`Passes: ${this.pasapalabraPoints}`,25,y);
    y+=10; pdf.text(`Time bonus: +${this.timeBonus}`,25,y);
    y+=15; pdf.setFont("helvetica","bold"); pdf.setFontSize(14); pdf.text(`TOTAL SCORE: ${this.totalPoints}`,25,y);

    pdf.addPage(); this.addDetailedResultsToPDF(pdf);
    pdf.save(`${this.config.gameTitle.replace(/\s+/g,'_')}_Results.pdf`);
  }

  addDetailedResultsToPDF(pdf){
    pdf.setFont("helvetica","bold"); pdf.setFontSize(16);
    pdf.text("DETAILED RESULTS",105,20,{align:"center"});

    let y=40; const pageH=280;
    this.words.forEach(w=>{
      if(y>pageH-40){ pdf.addPage(); y=20; }
      const ua=this.userAnswers[w.letter]||"Not answered";
      const ans=w.word||w.answers[0];
      const ok=checkAnswer(ua,w.answers,{enabled:false});

      pdf.setFillColor(ok?46:231, ok?204:76, ok?113:60);
      pdf.circle(25,y+5,6,'F');
      pdf.setFont("helvetica","bold"); pdf.setFontSize(10); pdf.setTextColor(255,255,255);
      pdf.text(w.letter,25,y+7,{align:"center"});

      pdf.setFont("helvetica","bold"); pdf.setFontSize(12); pdf.setTextColor(44,62,80);
      pdf.text(ans,40,y+5);
      pdf.setFont("helvetica","normal"); pdf.setFontSize(10); pdf.setTextColor(80,80,80);
      const defLines=pdf.splitTextToSize(w.definition,150); pdf.text(defLines,40,y+15);

      pdf.setTextColor(ok?46:231, ok?204:76, ok?113:60);
      pdf.text(`Your answer: ${ua}`,40,y+25);
      y+=35;
    });
  }
}

const game = new WordCircleGame();

/* ---------- utils ---------- */
function levenshteinDistance(a,b){
  const m=[]; for(let i=0;i<=b.length;i++){ m[i]=[i]; } for(let j=0;j<=a.length;j++){ m[0][j]=j; }
  for(let i=1;i<=b.length;i++){ for(let j=1;j<=a.length;j++){
    m[i][j] = b.charAt(i-1)===a.charAt(j-1) ? m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
  }} return m[b.length][a.length];
}

function isFuzzyMatch(input,target,fuzzySettings){
  const fs = { enabled:false, threshold:1, maxDistance:0, ...(fuzzySettings||{}) };
  const a=input.toLowerCase().trim(), b=target.toLowerCase().trim();
  if(!fs.enabled) return a===b;
  if(a===b) return true;
  const dist=levenshteinDistance(a,b);
  const maxAllowed=Math.min(fs.maxDistance??0, Math.floor(b.length/3));
  if(dist<=maxAllowed) return true;
  const sim = 1 - (dist / Math.max(a.length,b.length));
  return sim >= (fs.threshold ?? 1);
}

function checkAnswer(userAnswer, acceptable, fuzzySettings){
  return acceptable.some(ans => isFuzzyMatch(userAnswer, ans, fuzzySettings));
}

function formatTime(s){ const m=Math.floor(s/60), sec=s%60; return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`; }

function calculateTimeBonus(correct, used, cfg){ if(!cfg||correct<(cfg.threshold||0)) return 0; for(const lvl of cfg.levels||[]){ if(used<=lvl.maxTime) return lvl.bonus; } return 0; }

function playSound(type){ /* hook WebAudio/HTML5 audio here */ }
function showFeedback(ok, el){ const c=ok?'feedback-correct':'feedback-incorrect'; el.classList.add(c); setTimeout(()=>el.classList.remove(c),1000); }

function applyTheme(theme){
  const root=document.documentElement; const colors=theme?.colors||{};
  Object.entries(colors).forEach(([k,v])=>root.style.setProperty('--'+k.replace(/([A-Z])/g,'-$1').toLowerCase(), v));
  const alias={primary:'--primary-color',accent:'--accent-color',correct:'--correct-color',incorrect:'--incorrect-color',background:'--background-color',cardBackground:'--card-background',textColor:'--text-color',textSecondary:'--text-secondary'};
  Object.entries(alias).forEach(([k,cssVar])=>{ if(colors[k]) root.style.setProperty(cssVar, colors[k]); });
}

function showConfetti(){
  const colors=['#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7'];
  for(let i=0;i<50;i++){
    setTimeout(()=>{
      const d=document.createElement('div');
      Object.assign(d.style,{position:'fixed',width:'10px',height:'10px',backgroundColor:colors[Math.floor(Math.random()*colors.length)],left:Math.random()*window.innerWidth+'px',top:'-10px',zIndex:'9999',pointerEvents:'none',borderRadius:'50%'});
      document.body.appendChild(d);
      const anim=d.animate([{transform:'translateY(0) rotate(0)',opacity:1},{transform:`translateY(${window.innerHeight+20}px) rotate(360deg)`,opacity:0}],{duration:3000+Math.random()*2000,easing:'cubic-bezier(0.25,0.46,0.45,0.94)'});
      anim.onfinish=()=>d.remove();
    }, i*100);
  }
}

/* logo loader */
async function loadLogo(path){
  try{
    if(!path) throw new Error('No logo path');
    if(path.endsWith('.svg')){ const r=await fetch(path); if(!r.ok) throw new Error(`Failed logo: ${r.statusText}`); return await r.text(); }
    return `<img src="${path}" alt="Logo" style="max-width:100%;max-height:100%;object-fit:contain;">`;
  }catch(e){
    console.error('Logo load error',e);
    return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#E30613;font-weight:800;">LOGO</div>`;
  }
}