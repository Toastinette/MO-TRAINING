export const VERSION=1;
export const equipment=['machine','haltères','barre','poids du corps'];
const ex=(id,name,pattern,muscle,gear,loadMode,cue,rest=120,step=2.5)=>({id,name,pattern,muscle,gear,loadMode,cue,rest,transition:150,step,min:8,max:12});
export const exercises=[
ex('press','Presse à cuisses','squat','Quadriceps','machine','side','Pieds stables, genoux dans l’axe. Descends sans décoller le bassin.',180,5),
ex('goblet','Goblet squat','squat','Quadriceps','haltères','single','Un haltère devant la poitrine. Descends dans une amplitude confortable.',150,2),
ex('squat','Squat à la barre','squat','Quadriceps','barre','bar','Barre stabilisée, pieds ancrés. Apprends le mouvement à vide avant de charger.',180,2.5),
ex('chair','Squat au banc','squat','Quadriceps','poids du corps','body','Assieds-toi légèrement sur le banc puis relève-toi sans élan.',120,0),
ex('chest','Chest press','push','Pectoraux','machine','stack','Poignées à hauteur de poitrine. Pousse sans décoller le dos.'),
ex('dbpress','Développé haltères','push','Pectoraux','haltères','pair','Sur un banc, pieds stables. Descends les haltères avec contrôle.',150,1),
ex('bench','Développé couché','push','Pectoraux','barre','bar','Utilise les sécurités ou un partenaire. Garde les appuis stables.',180,2.5),
ex('pushup','Pompes inclinées','push','Pectoraux','poids du corps','body','Mains sur un support stable. Corps aligné ; ajuste la hauteur du support.',120,0),
ex('row','Rowing assis','row','Dos','machine','stack','Tire les coudes vers l’arrière sans balancer le buste.'),
ex('dbrow','Rowing un bras','row','Dos','haltères','unilateral','Une main en appui. Fais les répétitions de chaque côté ; commence par le plus faible.',120,1),
ex('pulldown','Tirage vertical','vertical','Dos','machine','stack','Tire vers le haut de la poitrine sans élan et sans tirer derrière la nuque.'),
ex('rdl','Soulevé roumain haltères','hinge','Ischios / fessiers','haltères','pair','Genoux légèrement fléchis, hanches vers l’arrière. Garde les poids près des jambes.',180,1),
ex('barrdl','Soulevé roumain barre','hinge','Ischios / fessiers','barre','bar','Repousse les hanches, dos stable. Arrête la descente avant de perdre ta position.',180,2.5),
ex('bridge','Pont fessier','hinge','Ischios / fessiers','poids du corps','body','Pousse dans les talons, serre les fessiers sans cambrer.',120,0),
ex('curl','Leg curl','curl','Ischios / fessiers','machine','stack','Aligne le genou avec l’axe de la machine. Ramène les talons sans élan.',90),
ex('slide','Leg curl glissé','curl','Ischios / fessiers','poids du corps','body','Sur sol adapté, talons sur serviettes. Rapproche les talons, bassin stable.',90,0),
ex('lateral','Élévations latérales','shoulder','Épaules','haltères','pair','Monte les bras légèrement fléchis jusqu’à hauteur d’épaule, sans élan.',90,0.5),
ex('cablelateral','Élévation poulie','shoulder','Épaules','machine','unilateral','Un côté à la fois. Garde le buste stable et monte sans à-coup.',90,1),
];
export const byId=id=>exercises.find(e=>e.id===id);
export const defaults=()=>({version:VERSION,profile:{name:'Morgan',weight:73.8,fat:24.6,muscle:52.8,visceral:13.9,bmr:1621,equipment:[...equipment],ready:false},history:[],loads:{},active:null});
export const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function weekStart(d=new Date()){let t=new Date(d);t.setDate(t.getDate()-(t.getDay()+6)%7);return dayKey(t)}
export function weekSessions(state,d=new Date()){const start=weekStart(d),end=new Date(start+'T12:00:00');end.setDate(end.getDate()+7);return state.history.filter(s=>s.date>=start&&s.date<dayKey(end)&&s.status==='complete')}
export const mainCount=s=>s.history.filter(x=>x.type==='MAIN'&&x.status==='complete').length;
export function availability(state,d=new Date()){
if(d.getDay()===6)return {allowed:false,message:'Samedi : place au golf. La prochaine mission t’attend lundi.'};
if(d.getDay()===0)return {allowed:false,message:'Dimanche : repos. Recharge les batteries pour lundi.'};
const recent=state.history.filter(s=>s.status==='complete'||s.records?.length).sort((a,b)=>b.endedAt-a.endedAt)[0];
if(recent&&dayKey(d)===recent.date)return {allowed:false,message:'Ta séance du jour est enregistrée. Place à la récupération.'};
if(recent&&d.getTime()-recent.endedAt<36*3600000)return {allowed:false,message:'Encore un peu de récupération : espace les missions d’au moins 36 h. En attendant, marche ou mobilité douce.'};
return {allowed:true,message:'Lundi → vendredi · 3 missions visées · aucun jour à rattraper'};
}
export function swaps(id,available){const e=byId(id);return exercises.filter(x=>x.id!==id&&x.pattern===e.pattern&&x.muscle===e.muscle&&available.includes(x.gear))}
export function plan(state,type='MAIN'){
if(type==='EMOM')return {type,letter:'',title:'EMOM / 12 MIN',exercises:[{id:'chair',sets:1,min:6,max:8},{id:'pushup',sets:1,min:5,max:8}],missing:!state.profile.equipment.includes('poids du corps'),minutes:18};
const seq=mainCount(state)%3,ids=[['press','chest','row','rdl','lateral','curl'],['goblet','dbpress','pulldown','rdl','curl','lateral'],['press','chest','row','rdl','lateral','curl']][seq];
const n=mainCount(state);const sets=n<6?2:3;
const chosen=(type==='MAIN'?ids:ids.slice(0,4)).map(id=>{
const e=byId(id),selected=state.profile.equipment.includes(e.gear)?e:swaps(id,state.profile.equipment)[0];
return selected?{id:selected.id,sets:type==='MAIN'?sets:2,min:selected.min,max:selected.max}:null;
});
return {type,letter:'ABC'[seq],title:type==='MAIN'?`Full body / ${'ABC'[seq]}`:type==='EMOM'?'EMOM / 12 MIN':'Quick / essentiel',exercises:chosen.filter(Boolean),missing:chosen.some(x=>!x),minutes:type==='MAIN'?(sets===2?42:55):type==='EMOM'?18:25};
}
export function loadLabel(e,weight,mode=e.loadMode){if(mode==='body')return 'Poids du corps';if(weight==null)return 'À calibrer';const n=Number(weight);return ({pair:`2 × ${n} kg · ${n} kg par main (${n*2} kg total)`,side:`${n} kg par côté · ${n*2} kg de disques au total`,bar:`${n} kg total · barre comprise`,unilateral:`${n} kg par côté · répétitions de chaque côté`,stack:`${n} kg · pile unique, valeur affichée`,single:`${n} kg · un seul haltère`})[mode]}
export function prescription(state,id){const e=byId(id),saved=state.loads[id];return {weight:saved?.weight??(e.loadMode==='body'?0:null),mode:saved?.mode??e.loadMode,step:saved?.step??e.step,target:saved?.target??e.min,reason:saved?.reason??'Calibration : trouve une charge confortable, sans test maximal.'}}
export function progress(e,records,previous){
if(!records.length)return previous;
const {weight,step}=previous;let next={...previous};
if(records.some(r=>r.pain))return {...next,reason:'Douleur signalée : pas de progression. Revoir ce mouvement avant de le reprendre.'};
const same=records.every(r=>r.weight===weight);
if(!same)return {...next,reason:'Charge ajustée pendant la séance : stabilise-la avant de progresser.'};
if(records.some(r=>r.reps<e.min||r.rir===0))return {...next,weight:Math.max(0,Math.round((weight-step)*100)/100),target:e.min,reason:'Trop difficile : un palier de moins pour retrouver une exécution maîtrisée.'};
if(records.every(r=>r.reps>=e.max&&r.rir>=2)&&step>0)return {...next,weight:Math.round((weight+step)*100)/100,target:e.min,reason:'Toutes les séries en haut de plage avec de la réserve : +1 palier.'};
return {...next,target:Math.min(e.max,Math.min(...records.map(r=>r.reps))+1),reason:'Même charge : vise une répétition de plus, en gardant 2–3 répétitions en réserve.'};
}
export function finishSession(state,active,status='complete',now=new Date()){
if(state.history.some(s=>s.id===active.id))return state;
const session={...active,status,date:dayKey(now),endedAt:now.getTime()},loads={...state.loads};
if(active.type!=='EMOM')for(const item of active.exercises){const all=active.records.filter(r=>r.id===item.id);const records=all.filter(r=>!r.pain);if(!all.some(r=>r.pain)&&records.length===item.sets&&status==='complete')loads[item.id]=progress(byId(item.id),records,prescription(state,item.id));}
return {...state,loads,active:null,history:[...state.history,session]};
}
export function volume(state,d=new Date()){const result={};for(const s of weekSessions(state,d)){if(s.type==='EMOM')continue;for(const r of s.records??[]){if(!r.pain){const m=byId(r.id)?.muscle;if(m)result[m]=(result[m]??0)+1}}}return result}
export const level=state=>{const xp=state.history.reduce((a,s)=>a+(s.status==='complete'?(s.type==='MAIN'?100:50):0),0);return {xp,level:1+Math.floor(xp/300),within:xp%300}};
