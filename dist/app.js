import {defaults, byId, equipment, plan, prescription, loadLabel, swaps, finishSession, level, volume, weekSessions, mainCount, availability, dayKey} from './engine.js';
import {modeNames, allowedModes, draftFor, prepareExercise, evaluateTrial, continueAfterRest, nextExercise, recordSet} from './flow.js';

const KEY = 'mo-training-v1';
let state = defaults(), storageError = false;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) { const parsed = JSON.parse(raw); validateImport(parsed); state = {...defaults(), ...parsed, profile: {...defaults().profile, ...parsed.profile}}; }
} catch { storageError = true; }
let page = location.hash.slice(1) || 'missions', notice = '', swapping = false;
let month = new Date(), selectedHistory = null;
const $ = selector => document.querySelector(selector);
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const fmt = n => String(n).padStart(2, '0');
const time = n => `${Math.floor(n / 60)}:${fmt(n % 60)}`;
const button = (text, action, cls = '', extra = '') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const labels = {MAIN: 'Séance complète', QUICK: 'Séance courte', EMOM: 'Circuit minute'};
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); storageError = false; } catch { storageError = true; } }
function go(p) { page = p; location.hash = p; render(); window.scrollTo(0, 0); }
function shell(content) {
  const lv = level(state), focus = page === 'session' && state.active;
  const messages = `${storageError ? '<div role="alert" class="alert">Sauvegarde indisponible. Exporte tes données avant de fermer cette page.</div>' : ''}${notice ? `<div class="notice" role="status">${esc(notice)}${button('×', 'dismiss', 'icon', 'aria-label="Fermer le message"')}</div>` : ''}`;
  if (focus) return `<div class="focus-shell"><header class="focus-header"><a href="#missions" class="focus-brand">MO<span>/</span>TRAINING</a>${button('Mettre en pause', 'pause', 'text-button')}</header><main>${messages}${content}</main></div>`;
  return `<aside><a class="brand" href="#missions">MO<span>/</span><br>TRAINING<span class="brand-dot">®</span></a><div class="edition">TON COPILOTE DE MUSCULATION</div><nav aria-label="Navigation principale">${[['missions','01','Ma séance'],['calendar','02','Calendrier'],['progress','03','Mes progrès'],['profile','04','Mon profil']].map(([id,n,label]) => `<a href="#${id}" class="${page === id ? 'active' : ''}"><span>${n}</span>${label}<b>↗</b></a>`).join('')}</nav><div class="aside-foot"><p>UNE SÉANCE<br>À LA FOIS.</p><div class="level-mini">NIVEAU ${fmt(lv.level)}<span>${lv.within} / 300 XP</span></div><progress aria-label="Progression du niveau" max="300" value="${lv.within}"></progress></div></aside><div class="workspace"><header><span>TON COPILOTE DE MUSCULATION</span><div class="profile-chip"><i>${esc(state.profile.name.slice(0,1).toUpperCase())}</i>${esc(state.profile.name)} <span>NIV. ${lv.level}</span></div></header><main>${messages}${content}</main><footer>MO / TRAINING <a href="#science">Comment sont choisies mes séances ? ↗</a></footer></div>`;
}
function missions() {
  const p = plan(state), weekly = weekSessions(state), avail = availability(state);
  const a = state.active;
  return `<div class="home-heading"><p class="eyebrow">${new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'})}</p><h1>ON S’Y MET ?</h1><span class="weekly-count">${weekly.length} / 3 séances cette semaine</span></div>
  ${a ? `<section class="resume-card"><span class="tag">SÉANCE EN COURS</span><h2>${labels[a.type]}</h2><p>Ta progression est sauvegardée. Reprends là où tu en étais.</p>${button('Reprendre ma séance ↗','resume','primary wide')}</section>` : `<section class="mission-card simple-mission"><div><span class="tag dark">MAIN · MISSION ${p.letter}</span><h2>TOUT LE CORPS.</h2><p>${p.exercises.length} exercices · environ ${p.minutes} min</p></div>${button('Commencer ma séance ↗', 'start-main', 'black wide', !avail.allowed ? 'disabled' : '')}<p class="fine">${esc(avail.message)}</p></section><details class="alternatives"><summary>Moins de temps aujourd’hui ?</summary><div class="quick-options"><div><h3>Séance courte <small>QUICK</small></h3><p>4 exercices essentiels · environ 25 min</p>${button('Choisir la séance courte', 'start-quick', 'outline', !avail.allowed ? 'disabled' : '')}</div><div><h3>Circuit minute <small>EMOM</small></h3><p>Un mouvement par minute pendant 12 min, après l’échauffement.</p>${button('Choisir le circuit', 'start-emom', 'outline', !avail.allowed ? 'disabled' : '')}</div></div></details>`}
  <details class="mission-preview"><summary>Voir les exercices prévus</summary>${p.exercises.map((item,i) => { const e = byId(item.id), l = prescription(state,e.id); return `<div class="exercise-row"><span class="row-number">${fmt(i+1)}</span><div><h4>${e.name}</h4><small>${e.muscle} · ${item.sets} séries de ${e.min} à ${e.max}</small></div><span class="row-load">${l.weight === null ? 'Poids à trouver ensemble' : loadLabel(e,l.weight,l.mode)}</span></div>`; }).join('')}</details><p class="schedule-note">Salle du lundi au vendredi · samedi golf · dimanche repos.<br>Les missions se suivent à ton rythme, sans séance à rattraper.</p>`;
}
function start(type) {
  if (state.active) { go('session'); return; }
  if (!availability(state).allowed) { notice = availability(state).message; render(); return; }
  const p = plan(state,type);
  if (p.missing || !p.exercises.length) { notice = 'Cette séance demande du matériel qui n’est pas sélectionné. Vérifie « Mon matériel » dans ton profil, ou choisis le circuit minute.'; go('profile'); return; }
  state.active = {...p, id:crypto.randomUUID(), startedAt:Date.now(), records:[], index:0, stage:'warmup', rest:0, emomMinute:0, finisher:null};
  notice = ''; save(); go('session');
}
function session() {
  const a = state.active;
  if (!a) return missions();
  const item = a.exercises[a.index], e = byId(item.id), l = prescription(state,e.id);
  const count = a.records.filter(r => r.id === e.id && !r.pain).length;
  const top = `<div class="session-progress"><span>${labels[a.type]}</span><span>${a.type === 'EMOM' ? `${Math.min(a.emomMinute,12)} / 12 min` : `Exercice ${a.index+1} / ${a.exercises.length}`}</span></div>`;
  let content;
  if (a.stage === 'warmup') content = `<p class="eyebrow">AVANT LA SÉANCE</p><h1>5 MINUTES<br>POUR DÉMARRER.</h1><p class="lead">Un peu de vélo ou de marche, puis 1–2 séries légères du premier exercice.</p>${button('Je suis échauffé · continuer ↗','warmup','primary wide')}<details class="quiet-details"><summary>Je préfère la corde à sauter</summary><p>3–5 minutes faciles. Les 1 000 sauts restent une option, jamais une obligation.</p></details>`;
  else if (a.stage === 'calibrate') content = calibration(e,l);
  else if (a.stage === 'work') content = workingSet(e,l,item,count);
  else if (a.stage === 'rest') content = `<p class="eyebrow">${a.restKind === 'exercise' ? 'AVANT LE PROCHAIN EXERCICE' : a.restKind === 'trial' ? 'APRÈS TON ESSAI' : 'ENTRE DEUX SÉRIES'}</p><h1>REPOSE-TOI.</h1><div class="rest-time">${time(a.rest)}</div>${a.restMessage ? `<p class="rest-message">${esc(a.restMessage)}</p>` : ''}<p class="muted">Sur ta Garmin. Prends plus de temps si besoin.</p>${button('Continuer ↗','continue','primary wide')}${a.restKind === 'exercise' ? `<p class="up-next">Ensuite : <strong>${e.name}</strong></p>` : ''}`;
  else if (a.stage === 'emom') content = emom(a);
  else if (a.stage === 'finishers') content = `<p class="eyebrow">LES EXERCICES SONT TERMINÉS</p><h1>BIEN JOUÉ.</h1><p class="lead">Tu peux t’arrêter ici. Ta séance compte.</p>${button('Terminer ma séance ✓','complete','primary wide')}<details class="quiet-details"><summary>Encore un peu d’énergie ? Ajouter un bonus</summary><div class="bonus-options">${[['core','Gainage','2 × 20–30 secondes'],['conditioning','Vélo','5 minutes modérées'],['mobility','Mobilité douce','3 minutes']].map(([id,name,detail]) => button(`<strong>${name}</strong><small>${detail}</small>`, 'finisher','choice',`data-value="${id}"`)).join('')}</div></details>`;
  else if (a.stage === 'finisher') content = `<p class="eyebrow">BONUS FACULTATIF</p><h1>${{core:'GAINAGE.',conditioning:'VÉLO.',mobility:'MOBILITÉ.'}[a.finisher]}</h1><p class="lead">${{core:'2 × 20–30 secondes de planche. 45 secondes de repos. Respire et garde le bassin stable.',conditioning:'5 minutes de vélo à allure modérée. Tu dois encore pouvoir parler.',mobility:'3 minutes de mouvements doux des épaules, chevilles et hanches, sans forcer.'}[a.finisher]}</p>${button('Terminer ma séance ✓','complete','primary wide')}${button('Passer ce bonus','skip-finisher','text-button')}`;
  return top + `<section class="session-content simple-session">${swapping && ['work','calibrate'].includes(a.stage) ? swapPanel(e) : content}</section><details class="session-exit"><summary>Arrêter la séance plus tôt</summary><p>Les séries déjà faites resteront dans ton historique.</p>${button('Enregistrer et quitter','stop','outline')}</details>`;
}
function modeSettings(e, draft) {
  if (e.gear !== 'machine') return '';
  return `<details class="quiet-details equipment-details"><summary>Ma machine est différente</summary><label>Sur cette machine, je règle…<select name="mode" id="load-mode">${allowedModes(e).map(mode => `<option value="${mode}" ${draft.mode === mode ? 'selected' : ''}>${{stack:'Un seul poids affiché',side:'Des disques de chaque côté',unilateral:'Un côté à la fois'}[mode]}</option>`).join('')}</select></label></details>`;
}
function feelingButtons(trial = false) {
  return `<div class="feeling-buttons">${[['easy',trial?'Trop facile':'Facile','Encore 4 ou plus'],['good','Bien','Encore 2 ou 3'],['hard',trial?'Trop difficile':'Trop dur','À ma limite']].map(([value,name,hint]) => `<button type="submit" name="feeling" value="${value}" class="feeling ${value}"><strong>${name}</strong><small>${hint}</small></button>`).join('')}</div>`;
}
function calibration(e,l) {
  const draft = draftFor(state);
  return `<p class="eyebrow">PREMIÈRE FOIS · ON TROUVE TON POIDS</p><h1>${e.name}</h1><p class="trial-instruction">Prends léger et essaie <strong>${e.min} répétitions.</strong></p><form id="calibration-form" class="simple-calibration"><label class="weight-label" for="trial-weight">${modeNames[draft.mode]}</label><div class="weight-entry"><input id="trial-weight" name="weight" aria-describedby="trial-weight-hint" inputmode="decimal" type="number" min="0" max="1000" step="0.25" ${draft.weight === null ? '' : `value="${draft.weight}"`} placeholder="—" required><span>kg</span></div><p id="trial-weight-hint" class="weight-hint">${unitHint(draft.mode)}</p>${e.gear === 'machine' ? modeSettings(e,draft) : `<input type="hidden" name="mode" value="${draft.mode}">`}<input type="hidden" name="step" value="${draft.step || e.step}"><p class="feeling-question">Après ton essai, c’était…</p>${feelingButtons(true)}</form><div class="exercise-tools">${button('Changer d’exercice','swap','text-button')}${button('J’ai une douleur','pain','text-button pain-link')}</div><details class="quiet-details"><summary>Comment faire le mouvement ?</summary><p>${e.cue}</p><p>Garde le mouvement maîtrisé. L’essai ne compte pas comme une série de travail.</p></details>`;
}
function unitHint(mode) {
  return {stack:'Recopie le nombre indiqué sur la machine.',side:'Note les disques d’un seul côté, sans compter le chariot.',pair:'Exemple : deux haltères de 10 kg → écris 10.',single:'Un seul haltère pour cet exercice.',bar:'Additionne la barre et tous les disques.',unilateral:'Le même poids de chaque côté. Fais les répétitions des deux côtés.',body:'Aucun poids à saisir.'}[mode];
}
function workingSet(e,l,item,count) {
  const weight = state.active.workingWeights?.[e.id] ?? l.weight;
  return `<p class="eyebrow">${e.muscle} · SÉRIE ${count+1} / ${item.sets}</p><h1>${e.name}</h1><form id="set-form"><div class="simple-load"><strong>${l.mode === 'body' ? 'Poids du corps' : `${l.mode === 'pair' ? '2 × ' : ''}${weight} kg`}</strong><span>${modeNames[l.mode]}${l.mode === 'pair' ? ` · ${weight*2} kg au total` : l.mode === 'side' ? ` · ${weight*2} kg de disques au total` : ''}</span></div><details class="quiet-details adjust-weight"><summary>Modifier le poids${l.mode === 'body' ? ' / la difficulté' : ''}</summary>${l.mode === 'body' ? '<p>Si trop difficile, utilise un support plus haut pour les pompes ou réduis l’amplitude du squat. Si trop facile, garde un mouvement lent et maîtrisé.</p><input type="hidden" name="weight" value="0">' : `<label>${modeNames[l.mode]}<input name="weight" inputmode="decimal" type="number" min="0" max="1000" step="0.25" value="${weight}" required></label><p class="fine">Utilise le poids disponible le plus proche, sans forcer.</p>`}</details><label class="reps-label" for="set-reps">Objectif : ${l.target} répétitions${l.mode === 'unilateral' ? ' par côté' : ''}</label><div class="rep-stepper">${button('−','reps-minus','stepper','aria-label="Une répétition de moins"')}<input name="reps" id="set-reps" inputmode="numeric" type="number" min="0" max="50" value="${l.target}" required aria-label="Répétitions réalisées">${button('+','reps-plus','stepper','aria-label="Une répétition de plus"')}</div><p class="feeling-question">Série terminée ? C’était…</p>${feelingButtons()}</form><div class="exercise-tools">${button('Changer d’exercice','swap','text-button',count ? 'disabled' : '')}${button('J’ai une douleur','pain','text-button pain-link')}</div><details class="quiet-details"><summary>Conseils & réglages de cet exercice</summary><p>${e.cue}</p><p>Vise ${e.min} à ${e.max} répétitions. Arrête-toi quand tu pourrais encore en faire 2 ou 3.</p><p>Repos : ${time(e.rest)} entre séries · ${time(e.transition)} avant le prochain exercice.</p>${l.mode === 'body' ? '' : `${button('Retrouver un poids adapté','recalibrate','outline',count ? 'disabled' : '')}<form id="step-form"><label>Pour cet exercice, je peux ajouter combien de kg à la fois ?<input name="step" type="number" min="0.25" max="20" step="0.25" value="${l.step}" required></label><p class="fine">${modeNames[l.mode]}. Valeur proposée par défaut, à ajuster seulement si besoin.</p><button type="submit" class="outline">Enregistrer</button></form>`}</details>`;
}
function swapPanel(e) {
  const candidates = swaps(e.id,state.profile.equipment).filter(x => !state.active.exercises.some(it => it.id === x.id));
  return `<section class="swap-panel"><h3>UNE AUTRE OPTION.</h3><p>Même travail pour ${e.muscle.toLowerCase()}. Le poids sera adapté à ce nouvel exercice.</p>${candidates.length ? candidates.map(x => button(`${x.name}<small>${x.gear}</small>`,'select-swap','choice',`data-value="${x.id}"`)).join('') : '<p>Pas d’autre option avec ton matériel actuel. Tu peux arrêter cet exercice si nécessaire.</p>'}${button('Fermer','swap','text-button')}</section>`;
}
function emom(a) {
  const moves = [['Squat au banc','6–8 répétitions contrôlées'],['Pompes inclinées','5–8 répétitions, sur un support stable'],['Marche sur place','20–30 secondes, à bonne allure']];
  const current = moves[a.emomMinute % 3];
  return `<p class="eyebrow">CIRCUIT MINUTE · TOUR ${Math.floor(a.emomMinute/3)+1} / 4</p><h1>${current[0]}</h1><p class="lead">${current[1]}</p><div class="minute-count">${a.emomMinute+1}<small>/ 12 min</small></div><p>Commence au début de la minute sur ta Garmin.<br>Repose-toi le reste de la minute.</p>${button(a.emomMinute === 11 ? 'Dernière minute terminée ✓' : 'Minute suivante ↗','emom-next','primary wide')}<details class="quiet-details"><summary>Si je n’arrive pas à suivre ?</summary><p>Réduis les répétitions pour finir en 30–40 secondes et garder du repos. Ne force pas les dernières répétitions. En cas de douleur, arrête la séance.</p></details>`;
}
function profile() {
  return `<p class="eyebrow">À MODIFIER SEULEMENT SI BESOIN</p><h1>MON PROFIL.</h1><form id="profile-form" class="simple-profile"><label>Prénom<input name="name" value="${esc(state.profile.name)}" maxlength="30" required></label><details class="quiet-details"><summary>Mon matériel</summary><p>Par défaut : une salle avec machines, haltères et barres.</p>${equipment.map(e => `<label class="check"><input type="checkbox" name="equipment" value="${e}" ${state.profile.equipment.includes(e)?'checked':''}>${e}</label>`).join('')}</details><details class="quiet-details"><summary>Mes mesures corporelles</summary><div class="field-pair">${[['weight','Poids (kg)',30,300],['fat','Masse grasse (%)',1,70],['muscle','Masse musculaire (kg)',1,200],['visceral','Indice viscéral',0,100],['bmr','Métabolisme estimé (kcal)',500,5000]].map(([key,label,min,max]) => `<label>${label}<input type="number" name="${key}" value="${state.profile[key]}" min="${min}" max="${max}" step="0.1"></label>`).join('')}</div><p class="fine">Repères approximatifs de ta balance. Ces valeurs ne déterminent pas tes poids d’entraînement.</p></details><button class="primary big" type="submit">Enregistrer</button></form><details class="quiet-details"><summary>Sauvegarder ou retrouver mes données</summary><p>Ton historique reste dans ce navigateur. Exporte une sauvegarde avant de changer d’appareil ou d’adresse du site.</p>${button('Exporter ma sauvegarde','export','outline')}<label class="import-label">Restaurer une sauvegarde<input id="import-file" type="file" accept="application/json,.json"></label></details><p class="schedule-note">3 séances visées du lundi au vendredi.<br>Samedi golf · dimanche repos.</p>`;
}

function calendar(){const year=month.getFullYear(),m=month.getMonth(),first=new Date(year,m,1),offset=(first.getDay()+6)%7,days=new Date(year,m+1,0).getDate();return `<p class="eyebrow">CHAQUE SÉANCE LAISSE UNE TRACE</p><h1>MES SÉANCES.</h1><div class="section-title"><h3>${month.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}).toUpperCase()}</h3><div>${button('←','prev-month','icon','aria-label="Mois précédent"')}${button('→','next-month','icon','aria-label="Mois suivant"')}</div></div><div class="calendar">${['LUN','MAR','MER','JEU','VEN','SAM','DIM'].map(d=>`<span class="calendar-label">${d}</span>`).join('')}${'<div class="blank"></div>'.repeat(offset)}${Array.from({length:days},(_,i)=>{const d=new Date(year,m,i+1),key=dayKey(d),ss=state.history.filter(s=>s.date===key),weekend=d.getDay()===0||d.getDay()===6;return `<div class="day ${weekend?'off':''} ${key===dayKey()?'today':''}"><b>${i+1}</b>${ss.map(s=>button(s.status==='complete'?`✓ ${s.type}`:'ÉCOURTÉE','history-detail','session-pill',`data-value="${esc(s.id)}"`)).join('')}${weekend?`<small>${d.getDay()===6?'GOLF':'REPOS'}</small>`:''}</div>`}).join('')}</div><section class="line-section"><h3>HISTORIQUE</h3>${state.history.length?[...state.history].reverse().map(s=>button(`<span>${s.date} · ${s.status==='complete'?'✓ Terminée':'Écourtée'}</span><strong>${esc(s.title)}</strong><span>${s.records.length} séries ↗</span>`,'history-detail','history-row',`data-value="${esc(s.id)}"`)).join(''):'<div class="empty"><strong>LE DÉBUT DE TON HISTOIRE.</strong><p>Ta première mission apparaîtra ici. Aucun retard, aucun jour à rattraper.</p><a href="#missions">Choisir ma mission ↗</a></div>'}</section>${selectedHistory?historyDetail():''}`}
function historyDetail(){const s=state.history.find(x=>x.id===selectedHistory);if(!s)return '';return `<section class="panel"><div class="section-title"><h3>${esc(s.title)} · ${s.date}</h3>${button('Fermer','close-history','text-button')}</div>${s.type==='EMOM'?`<p>${s.emomMinute} minutes terminées</p>`:s.records.map(r=>`<p>${byId(r.id)?.name} · ${r.reps} reps · ${loadLabel(byId(r.id),r.weight,r.mode)}${r.pain?' · douleur':''}</p>`).join('')}<p>Bonus : ${esc(s.finisher||'aucun')}</p></section>`}
function progressPage(){const lv=level(state),v=volume(state);return `<p class="eyebrow">TES EFFORTS, VISIBLES</p><h1>MES PROGRÈS.</h1><div class="progress-grid"><section class="level-card"><span class="tag dark">RÉGULARITÉ</span><h2>LVL. ${fmt(lv.level)}</h2><progress max="300" value="${lv.within}"></progress><p>${lv.within} / 300 XP vers le prochain niveau</p><small>MAIN : 100 XP · QUICK / EMOM : 50 XP.<br>Ni bonus pour l’échec, ni entraînement risqué à débloquer.</small></section><section class="panel"><h3>VOLUME DE LA SEMAINE</h3><p>Séries directes réalisées. Les EMOM ne sont pas assimilés à des séries d’hypertrophie.</p>${['Quadriceps','Pectoraux','Dos','Ischios / fessiers','Épaules'].map(m=>`<div class="volume-row"><span>${m}</span><b>${v[m]||0} séries</b></div>`).join('')}<p class="fine">Départ progressif : 2 séries par exercice, puis 3 après 6 MAIN terminées. Ce repère de volume n’est pas une obligation à rattraper.</p></section></div><section class="line-section"><h3>TES PROCHAINES CHARGES</h3>${Object.keys(state.loads).length?Object.entries(state.loads).map(([id,l])=>`<div class="exercise-row"><div><h4>${byId(id).name}</h4><small>${esc(l.reason)}</small></div><b>${loadLabel(byId(id),l.weight,l.mode)}</b></div>`).join(''):'<div class="empty"><strong>ON APPREND À TE CONNAÎTRE.</strong><p>Trouve tes premiers poids : les charges et les ajustements apparaîtront ici.</p></div>'}</section>`}
function science(){return `<p class="eyebrow">MOTEUR V1 / TRANSPARENT PAR CONCEPTION</p><h1>DES BASES<br>SOLIDES.</h1><div class="prose"><h3>Hypertrophie, avec une entrée progressive</h3><p>Les recommandations ACSM 2026 favorisent l’entraînement progressif et indiquent un bénéfice de volumes hebdomadaires plus élevés pour l’hypertrophie. La V1 commence volontairement plus bas : 2 séries par exercice pendant 6 MAIN, puis 3. Elle ne prétend pas calculer un optimum individuel.</p><h3>Une charge gagnée, pas devinée</h3><p>Calibration par essais légers, sans test 1RM. Cible : 8–12 répétitions et 2–3 répétitions en réserve. Toutes les séries à 12 avec au moins 2 répétitions possibles : un poids légèrement supérieur est proposé à la séance suivante. L’augmentation suggérée par défaut reste modifiable selon le matériel. Sinon on conserve la charge ou on propose moins de poids si elle est trop difficile. Cette règle est un choix prudent de programmation, pas une prescription exacte tirée d’une étude.</p><h3>Le repos fait partie du travail</h3><p>90 secondes sur les accessoires, 120–180 secondes sur les mouvements exigeants. 150 secondes de transition entre exercices, à prolonger si nécessaire. Les synthèses soutiennent l’intérêt d’éviter des repos trop courts ; le temps précis de transition est un choix pratique.</p><h3>Une progression qui a des limites</h3><p>Les estimations de réserve sont imparfaites chez un novice. Une douleur doit interrompre le mouvement. L’application ne diagnostique pas et ne gère pas une rééducation. Une séance écourtée conserve ses séries sans déclencher de hausse. Les QUICK ne font pas avancer A → B → C.</p><h3>Références</h3><p><a href="https://pubmed.ncbi.nlm.nih.gov/41843416/" target="_blank" rel="noreferrer">ACSM 2026 — synthèse de 137 revues systématiques ↗</a></p><p><a href="https://pubmed.ncbi.nlm.nih.gov/39205815/" target="_blank" rel="noreferrer">Singer et al., 2024 — repos entre séries et hypertrophie ↗</a></p><p><a href="https://pubmed.ncbi.nlm.nih.gov/38970765/" target="_blank" rel="noreferrer">Robinson et al., 2024 — proximité de l’échec et adaptations ↗</a></p></div>`}
function validateImport(s){if(s.active!==null){const a=s.active;if(typeof a?.id!=='string'||typeof a?.title!=='string'||!Number.isInteger(a?.emomMinute)||a.emomMinute<0||a.emomMinute>12)throw Error();if(a.calibration && (!byId(a.calibration.id)||!allowedModes(byId(a.calibration.id)).includes(a.calibration.mode)||(a.calibration.weight!==null&&(!Number.isFinite(a.calibration.weight)||a.calibration.weight<0||a.calibration.weight>1000))||!Number.isFinite(a.calibration.step)||a.calibration.step<=0||a.calibration.step>20))throw Error();if(a.workingWeights&&Object.entries(a.workingWeights).some(([id,w])=>!byId(id)||!Number.isFinite(w)||w<0||w>1000))throw Error();if(!a||!['MAIN','QUICK','EMOM'].includes(a.type)||!['warmup','rest','calibrate','work','emom','finishers','finisher'].includes(a.stage)||!Array.isArray(a.exercises)||!a.exercises.length||a.exercises.some(x=>!byId(x.id)||!Number.isInteger(x.sets)||x.sets<1||x.sets>3)||!Number.isInteger(a.index)||a.index<0||a.index>=a.exercises.length||!Array.isArray(a.records)||a.records.some(r=>!byId(r.id)||!Number.isFinite(r.reps)||!Number.isFinite(r.weight)||!Number.isFinite(r.rir)))throw Error();}if(s?.version!==1||!Array.isArray(s.history)||!s.profile||typeof s.profile.name!=='string'||!Array.isArray(s.profile.equipment)||s.profile.equipment.some(e=>!equipment.includes(e))||!s.loads)throw Error();for(const k of ['weight','fat','muscle','visceral','bmr'])if(!Number.isFinite(s.profile[k])||s.profile[k]<0)throw Error();for(const [id,l]of Object.entries(s.loads)){if(!byId(id)||!Number.isFinite(l.weight)||l.weight<0||!Number.isFinite(l.step)||l.step<0||!['body','pair','side','bar','unilateral','stack','single'].includes(l.mode))throw Error()}for(const h of s.history){if(!['MAIN','QUICK','EMOM'].includes(h.type)||!['partial','complete'].includes(h.status)||!/^\d{4}-\d{2}-\d{2}$/.test(h.date)||!Array.isArray(h.records)||!Number.isFinite(h.endedAt)||typeof h.title!=='string'||typeof h.id!=='string')throw Error();for(const r of h.records)if(!byId(r.id)||!Number.isFinite(r.reps)||!Number.isFinite(r.weight)||!Number.isFinite(r.rir))throw Error()}}

function render() {
  const routes = {missions, session, calendar, progress:progressPage, profile, science};
  if (!routes[page] || (page === 'session' && !state.active)) page = 'missions';
  $('#app').innerHTML = shell(routes[page]());
}
window.addEventListener('hashchange', () => { page = location.hash.slice(1) || 'missions'; render(); window.scrollTo(0,0); });
function rememberTrial(form) {
  if (!state.active || !form) return;
  const data = new FormData(form), draft = draftFor(state);
  state.active.calibration = {...draft, weight:data.get('weight') === '' ? null : Number(data.get('weight')), mode:data.get('mode') || draft.mode};
  save();
}
function finish(status = 'complete') {
  const a = state.active;
  if (!a) return;
  const partial = status === 'partial' || a.records.some(r => r.pain);
  state = finishSession(state,a,partial ? 'partial' : 'complete');
  save(); go('missions');
  notice = partial ? 'Séance enregistrée. Les séries déjà faites sont conservées.' : 'Bien joué ! Ta séance est enregistrée.';
  render();
}
document.addEventListener('click', event => {
  const b = event.target.closest('[data-action]');
  if (!b) return;
  const action = b.dataset.action, value = b.dataset.value, a = state.active;
  if (['reps-minus','reps-plus'].includes(action)) {
    const input = $('#set-reps');
    input.value = Math.max(0, Math.min(50, Number(input.value) + (action === 'reps-plus' ? 1 : -1)));
    return;
  }
  switch (action) {
    case 'dismiss': notice = ''; break;
    case 'start-main': start('MAIN'); return;
    case 'start-quick': start('QUICK'); return;
    case 'start-emom': start('EMOM'); return;
    case 'resume': go('session'); return;
    case 'pause': rememberTrial($('#calibration-form')); go('missions'); return;
    case 'warmup': if (!a || a.stage !== 'warmup') return; a.warmup = 'Au choix'; prepareExercise(state); break;
    case 'continue': continueAfterRest(state); break;
    case 'swap': rememberTrial($('#calibration-form')); swapping = !swapping; break;
    case 'select-swap':
      if (!a || a.records.some(r => r.id === a.exercises[a.index].id)) return;
      if (!swaps(a.exercises[a.index].id,state.profile.equipment).some(e => e.id === value)) return;
      a.exercises[a.index].id = value; delete a.calibration; swapping = false; prepareExercise(state); break;
    case 'recalibrate': a.stage = 'calibrate'; break;
    case 'pain':
      if (confirm('Arrêter ce mouvement ? Ta séance restera sauvegardée.')) {
        a.records.push({id:a.exercises[a.index].id, pain:true, reps:0, weight:0, rir:0});
        swapping = false; nextExercise(state);
        notice = 'Mouvement arrêté. Si la douleur persiste, fais-toi conseiller avant de le reprendre.';
      }
      break;
    case 'stop': if (confirm('Enregistrer les séries déjà faites et terminer ici ?')) finish('partial'); return;
    case 'emom-next': if (!a || a.stage !== 'emom') return; a.emomMinute++; if (a.emomMinute >= 12) a.stage = 'finishers'; break;
    case 'finisher': if (!['core','conditioning','mobility'].includes(value)) return; a.finisher = value; a.stage = 'finisher'; break;
    case 'skip-finisher': a.finisher = null; finish(); return;
    case 'complete': finish(); return;
    case 'prev-month': month = new Date(month.getFullYear(),month.getMonth()-1,1); break;
    case 'next-month': month = new Date(month.getFullYear(),month.getMonth()+1,1); break;
    case 'history-detail': selectedHistory = value; break;
    case 'close-history': selectedHistory = null; break;
    case 'export': {
      const url = URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
      const link = document.createElement('a'); link.href = url; link.download = `mo-training-${dayKey()}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url),1000); return;
    }
  }
  save(); render();
  if (!['dismiss','swap','history-detail','close-history','prev-month','next-month'].includes(action)) window.scrollTo(0,0);
});
document.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target, data = new FormData(form), a = state.active;
  if (!form.reportValidity()) return;
  try {
    if (form.id === 'profile-form') {
      const available = data.getAll('equipment');
      if (!available.length) { notice = 'Choisis au moins un type de matériel.'; render(); return; }
      state.profile = {...state.profile, name:data.get('name').trim() || 'Morgan', equipment:available, ready:true};
      for (const key of ['weight','fat','muscle','visceral','bmr']) if (data.get(key) !== '') state.profile[key] = Number(data.get(key));
      save(); notice = 'Profil enregistré.'; render(); return;
    }
    if (form.id === 'calibration-form') {
      const draft = draftFor(state);
      evaluateTrial(state, {weight:Number(data.get('weight')), mode:data.get('mode') || draft.mode, step:draft.step || byId(draft.id).step}, event.submitter?.value || 'good');
    } else if (form.id === 'set-form') {
      recordSet(state,{weight:Number(data.get('weight')), reps:Number(data.get('reps')), feeling:event.submitter?.value || 'good'});
    } else if (form.id === 'step-form') {
      const id = a.exercises[a.index].id;
      state.loads[id] = {...prescription(state,id), step:Number(data.get('step'))};
      notice = 'Le changement de poids est enregistré.';
    }
    save(); render(); window.scrollTo(0,0);
  } catch (error) { notice = error.message; render(); }
});
document.addEventListener('input', event => {
  if (event.target.closest('#calibration-form')) rememberTrial($('#calibration-form'));
});
document.addEventListener('change', async event => {
  if (event.target.id === 'load-mode') {
    rememberTrial($('#calibration-form'));
    render();
    $('.equipment-details').open = true;
    $('#load-mode').focus();
    return;
  }
  if (event.target.id !== 'import-file') return;
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5e6) throw Error();
    const parsed = JSON.parse(await file.text()); validateImport(parsed);
    if (confirm('Remplacer les données de ce navigateur par cette sauvegarde ?')) {
      state = parsed; save(); go('missions'); notice = 'Sauvegarde restaurée.'; render();
    }
  } catch { notice = 'Cette sauvegarde est invalide. Tes données actuelles sont conservées.'; render(); }
});
render();
