/* ---------- helpers ---------- */
async function fetchJSON(path){ const r=await fetch(path, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }); if(!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }
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

  // track which hints were already shown per letter
_hintHistory = new Map();

isTouchDevice(){ return matchMedia('(pointer:coarse)').matches; }

getFallbackHint(cur){
  const ans = (cur.word || (cur.answers && cur.answers[0]) || '').trim();
  if (!ans) return 'No hint available.';
  const first = ans.charAt(0);
  const last  = ans.charAt(ans.length - 1);
  return `Starts with “${first}”, ends with “${last}”, ${ans.length} letters.`;
}

getRandomHint(cur){
  const list = Array.isArray(cur.hints) ? cur.hints.filter(Boolean) : [];
  if (!list.length) return this.getFallbackHint(cur);

  const key = cur.letter || cur.word || JSON.stringify(cur);
  const used = this._hintHistory.get(key) || new Set();

  // if all used, reset so we can rotate again
  if (used.size >= list.length) used.clear();

  // pick an unused index
  let tries = 0, idx;
  do { idx = Math.floor(Math.random() * list.length); tries++; }
  while (used.has(idx) && tries < 20);

  used.add(idx);
  this._hintHistory.set(key, used);
  return list[idx];
}

buildAutoHints(item){
    const ans = (item.word || (item.answers && item.answers[0]) || '').trim();
    const first = ans.slice(0,1), last = ans.slice(-1), len = ans.length;
  
    // lightweight creative set using the definition + word form
    return [
      item.definition ? item.definition.replace(/\?+$/,'').trim() + '.' : 'Think simple, everyday word.',
      `Starts with ${first.toUpperCase()} and ends with ${last.toUpperCase()}.`,
      `Common word of ${len} letters.`,
      `If stuck, say it out loud: it sounds like what it is.`
    ];
  }
  
  ensureHints(set){
    if (!set || typeof set !== 'object') return;
    for (const L of Object.keys(set)){
      const list = Array.isArray(set[L]) ? set[L] : [];
      list.forEach(it=>{
        if (!Array.isArray(it.hints) || it.hints.length === 0){
          it.hints = this.buildAutoHints(it);
        }
      });
    }
  }

showHintToast(text){
  const t = document.getElementById('hintToast');
  if (!t) return alert(text); // fallback if the toast element isn't present
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(this._hintHideTimer);
  this._hintHideTimer = setTimeout(()=> t.classList.remove('show'), 3200);
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

    // questions/preview - use blob storage URLs directly if available
    const qPath = ch.questionsPath || withBase(ch.basePath, 'questions.json');
    const pPath = ch.previewPath || qPath;

    this.allWords    = await fetchJSON(qPath);
    this.previewWords= await fetchJSON(pPath);

    this.ensureHints(this.allWords);
    this.ensureHints(this.previewWords);

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

    setText('#welcomeTimeLimit', formatTime(gs.timeLimit||0));
    setText('#welcomeMaxHints', gs.maxHints ?? 0);

    const pts=(n)=>`point${Math.abs(n)===1?'':'s'}`;
    setText('#correctPoints',     `+${sc.correct ?? 0} ${pts(sc.correct??0)}`);
    setText('#incorrectPoints',   `${sc.incorrect ?? 0} ${pts(sc.incorrect??0)}`);
    setText('#pasapalabraPoints', `${sc.pasapalabra ?? 0} ${pts(sc.pasapalabra??0)}`);

    const maxBonus = (Array.isArray(tb.levels) && tb.levels.length)
      ? Math.max(...tb.levels.map(l=>l?.bonus??0)) : 0;
    setText('#timeBonusThreshold', tb.threshold ?? 0);
    setText('#maxTimeBonus', maxBonus ? `Up to +${maxBonus} points` : '—');
  }

  setupEventListeners(){
    // Enter still works
    document.getElementById('answer').addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && !this.gameEnded) this.checkAnswer();
    });
  
    // Keep your resize & sticky bar listeners
    window.addEventListener('resize', () => this.recalculateRoscoPositions());
    this.setupStickyActionBar();
  
    // --- Fast, reliable tap handlers so iOS doesn't swallow the first tap ---
    const fastTap = (el, handler) => {
        if (!el) return;
        let locked = false;
        const run = (e) => {
        e.preventDefault();            // don't let iOS treat it as "dismiss keyboard"
        e.stopPropagation();
        if (locked) return;            // avoid duplicate firing (click + touchend)
        locked = true;
        handler();
        setTimeout(() => (locked = false), 50);
        };
        el.addEventListener('pointerup', run, { passive: false });
        el.addEventListener('touchend',  run, { passive: false });
        el.addEventListener('click',     run);
    };
    
    fastTap(document.getElementById('btnSubmit'), () => this.checkAnswer());
    fastTap(document.getElementById('btnPass'),   () => this.pasapalabra());

    // submit via Enter/Done key or tapping the submit button
    const form = document.getElementById('answerForm');
    form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!this.gameEnded) this.checkAnswer();
    });
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
    if(inp){ inp.disabled=false; inp.placeholder='Type your answer...'; }
    const cur=this.remainingWords[this.currentIndex];
    if(cur) document.getElementById('definition').textContent=`[PREVIEW] ${cur.definition}`;
  }

  selectWordsFromSet(set){
    this.words = [];
    if (!set || typeof set !== 'object') return;
  
    const letters = Object.keys(set).sort((a,b)=>a.localeCompare(b));
    for (const key of letters){
      const list = set[key];
      if (!Array.isArray(list) || !list.length) continue;
  
      const item     = list[Math.floor(Math.random()*list.length)] || {};
      const answers  = Array.isArray(item.answers) && item.answers.length
        ? item.answers
        : (item.word ? [item.word] : []);
      const hints    = Array.isArray(item.hints)
        ? item.hints.filter(h => typeof h === 'string' && h.trim())
        : [];
  
      this.words.push({
        letter: key.toUpperCase(),
        word: item.word || (answers[0] || ''),
        definition: item.definition || '',
        answers,
        hints                                        // ← keep hints!
      });
    }
    this.words.sort((a,b)=>a.letter.localeCompare(b.letter));
  }
  selectRandomWords(){ this.selectWordsFromSet(this.allWords); }

  setupStickyActionBar() {
    const bar = document.getElementById('actionBar');
    const gc  = document.getElementById('gameContainer');
    if (!bar || !gc) return;
  
    const setBottomPadding = () => {
      // expose the actual height to CSS as a custom prop too
      document.documentElement.style.setProperty('--actionbar-height', bar.offsetHeight + 'px');
  
      if (matchMedia('(max-width: 768px)').matches) {
        gc.style.paddingBottom = Math.max(120, bar.offsetHeight + 16) + 'px';
      } else {
        gc.style.paddingBottom = '';
        bar.style.transform = '';
      }
    };
  
    setBottomPadding();
    window.addEventListener('resize', setBottomPadding);
    bar.addEventListener('transitionend', setBottomPadding); // when .compact toggles
  
    // Keyboard-aware reposition (unchanged)
    if (window.visualViewport) {
      const vv = window.visualViewport;
      const reposition = () => {
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        bar.style.transform = kb ? `translateY(-${kb}px)` : '';
      };
      vv.addEventListener('resize', reposition);
      vv.addEventListener('scroll', reposition);
      window.addEventListener('orientationchange', reposition);
    }
  
    // Freeze/unfreeze to stop layout jump + toggle compact
    const input = document.getElementById('answer');
    let scrollY = 0;
    const freeze = () => {
      scrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    };
    const unfreeze = () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  
    input?.addEventListener('focus', () => {
      bar.classList.add('compact');      // <- icon-only
      setTimeout(setBottomPadding, 50);
      freeze();
    });
    input?.addEventListener('blur', () => {
      bar.classList.remove('compact');   // <- restore labels
      unfreeze();
      setTimeout(() => { bar.style.transform = ''; setBottomPadding(); }, 50);
    });
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

    const gi = document.querySelector('.game-info');
    if (gi) gi.hidden = true;

    const fs=document.getElementById('finalScore'); if(fs){ fs.innerHTML=''; fs.style.display='none'; }
    const vr=document.getElementById('viewResults'); if(vr) vr.style.display='none';
    const res=document.getElementById('results'); if(res){ res.style.display='none'; res.innerHTML=''; }
    const fh=document.getElementById('fuzzyHint'); if(fh) fh.style.display='none';
    const hintsLeft=document.querySelector('.hints-left'); if(hintsLeft) hintsLeft.textContent=this.config.gameSettings.maxHints;
    
    document.getElementById('actionBar')?.classList.remove('hidden');
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
    const cont = document.querySelector('.rosco-container');
    const letters = Array.from(document.querySelectorAll('.letter'));
    if (!cont || !letters.length) return;
  
    const cw = cont.clientWidth;
    const ch = cont.clientHeight;
    const size = letters[0].offsetWidth || 56;   // letter is square
    const gap  = Math.max(6, Math.round(size * 0.1)); // extra breathing room
  
    // Keep every letter fully inside the container
    const r  = Math.min(cw, ch) / 2 - size / 2 - gap;
    const cx = cw / 2;
    const cy = ch / 2;
  
    letters.forEach((el, i) => {
      const ang = (i / letters.length) * 2 * Math.PI - Math.PI / 2;
      const x = cx + Math.cos(ang) * r - size / 2;
      const y = cy + Math.sin(ang) * r - size / 2;
      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
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
    const hasRemaining = this.remainingWords.length > 0;
    const cur = hasRemaining ? this.remainingWords[this.currentIndex] : null;
  
    /* 1) Rosco: mark the current letter */
    document.querySelectorAll('.letter').forEach(el => {
      const isCurrent = hasRemaining && el.dataset.letter === cur.letter;
      el.classList.toggle('current', isCurrent);
    });
  
    /* 2) Question text (in sticky bar) */
    const def = document.querySelector('#actionBar #definition');
    if (def){
      def.textContent = hasRemaining
        ? (this.isPreviewMode ? '[PREVIEW] ' : '') + cur.definition
        : "You've completed all words!";
    }
  
    /* 3) Big faded letter in the center */
    const ld = document.getElementById('currentLetterDisplay');
    if (ld) ld.textContent = hasRemaining ? cur.letter : '';
  
    /* 4) Make sure the in-bar question block is visible only while playing */
    const gi = document.querySelector('#actionBar .game-info');
    if (gi) gi.hidden = !hasRemaining;
  
    /* 5) Hide the “close but not enough” hint */
    const fh = document.getElementById('fuzzyHint');
    if (fh) fh.style.display = 'none';
  
    /* 6) Update header stats */
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('correctCount',   this.correctAnswers);
    setTxt('incorrectCount', this.incorrectAnswers);
    setTxt('pointsCount',    this.totalPoints);
  }

  checkAnswer(){
    if(this.remainingWords.length===0 || this.gameEnded){ this.endGame(); return; }
    const inputEl=document.getElementById('answer');
    const val=inputEl.value.trim(); if(!val) return;

    const cur=this.remainingWords[this.currentIndex];
    const letter=cur.letter;
    const idx=this.words.findIndex(w=>w.letter===letter);
    const letters=document.querySelectorAll('.letter');

    this.userAnswers[letter]=val;

    const ok = checkAnswer(val, cur.answers, this.config.gameSettings.fuzzyMatching);

    // Remove ALL previous state classes before applying new state
    letters[idx].classList.remove('current', 'passed', 'correct', 'incorrect');

    if(ok){
      playSound('correct'); showFeedback(true, letters[idx]);
      letters[idx].classList.add('correct');
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
      letters[idx].classList.add('incorrect');
      this.incorrectAnswers++; this.answeredWords[idx]=false;
      if(!this.isPreviewMode){ this.incorrectPoints += this.config.gameSettings.scoring.incorrect; this.totalPoints += this.config.gameSettings.scoring.incorrect; }
    }

    // Move on
    this.remainingWords.splice(this.currentIndex,1);

    // Collapse the keyboard after submit
    inputEl.blur();               // <— important for #3
    inputEl.value = '';

    if(this.remainingWords.length===0) this.endGame();
    else {
      if(this.currentIndex>=this.remainingWords.length) this.currentIndex=0;
      this.updateGame();
    }
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

      // DO NOT focus the input here (prevents keyboard popping on PASS)
      this.currentIndex=(this.currentIndex+1) % this.remainingWords.length;
      this.updateGame();
    }else if(this.remainingWords.length===1){ alert("Only one word remaining. You must answer it!"); }
    else{ this.endGame(); }
  }

  showHint(){
    if (this.gameEnded || !this.remainingWords.length) return;
    const max = this.config.gameSettings.maxHints ?? 0;
    if (this.hintsUsed >= max) { this.showHintToast("You've used all available hints!"); return; }
  
    const cur = this.remainingWords[this.currentIndex];
    const hint = this.getRandomHint(cur);
  
    this.hintsUsed++;
    const left = Math.max(0, max - this.hintsUsed);
    const counter = document.querySelector('.hints-left');
    if (counter) counter.textContent = left;
  
    this.showHintToast(hint);
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

    document.getElementById('actionBar')?.classList.add('hidden');

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
    document.getElementById('actionBar')?.classList.add('hidden');
    document.body.classList.remove('preview-mode');
    window.scrollTo({ top: 0, behavior: 'auto' });
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