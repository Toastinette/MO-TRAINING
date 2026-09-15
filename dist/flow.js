import {byId, prescription} from './engine.js';

export const feelings = {easy: 4, good: 2, hard: 0};
export const modeNames = {
  stack: 'Poids affiché sur la machine',
  side: 'Poids des disques de chaque côté',
  pair: 'Poids de chaque haltère',
  single: 'Poids de l’haltère',
  bar: 'Poids total, barre comprise',
  unilateral: 'Poids utilisé pour un côté',
  body: 'Poids du corps',
};
export function allowedModes(e) {
  return e.gear === 'machine' ? ['stack', 'side', 'unilateral'] : [e.loadMode];
}
export function draftFor(state) {
  const a = state.active, id = a.exercises[a.index].id;
  const p = prescription(state, id);
  return a.calibration?.id === id ? a.calibration : {id, weight: p.weight, mode: p.mode, step: p.step};
}
export function prepareExercise(state) {
  const a = state.active;
  if (a.type === 'EMOM') { a.stage = 'emom'; return; }
  a.stage = prescription(state, a.exercises[a.index].id).weight === null ? 'calibrate' : 'work';
}
export function evaluateTrial(state, trial, feeling) {
  const a = state.active;
  if (!a || a.stage !== 'calibrate' || !(feeling in feelings)) throw new Error('Essai indisponible.');
  const e = byId(a.exercises[a.index].id);
  if (!allowedModes(e).includes(trial.mode) || !Number.isFinite(trial.weight) || trial.weight < 0 || trial.weight > 1000 || !Number.isFinite(trial.step) || trial.step <= 0 || trial.step > 20) throw new Error('Indique un poids valide.');
  a.calibration = {id: e.id, ...trial};
  a.restKind = 'trial';
  a.rest = e.rest;
  a.stage = 'rest';
  if (feeling === 'good') {
    state.loads[e.id] = {...trial, target: e.min, reason: 'Poids trouvé. Garde un peu de marge à chaque série.'};
    a.restReturn = 'work';
    a.restMessage = 'Poids enregistré. Après le repos, place à ta première série.';
    delete a.calibration;
  } else {
    // This is an editable suggestion, never a calibrated or completed working set.
    const delta = feeling === 'easy' ? trial.step : -trial.step;
    a.calibration.weight = Math.max(0, Math.round((trial.weight + delta) * 100) / 100);
    a.restReturn = 'calibrate';
    a.restMessage = feeling === 'easy'
      ? 'Essaie un peu plus lourd après le repos. Ajuste le poids proposé à ce qui est disponible.'
      : 'Essaie plus léger après le repos. Ne force pas pour finir les répétitions.';
  }
}
export function continueAfterRest(state) {
  const a = state.active;
  if (!a || a.stage !== 'rest') return;
  const returnTo = a.restReturn;
  delete a.restReturn;
  delete a.restMessage;
  if (returnTo === 'calibrate') a.stage = 'calibrate';
  else prepareExercise(state);
}
export function nextExercise(state) {
  const a = state.active, e = byId(a.exercises[a.index].id);
  delete a.calibration;
  if (a.index + 1 < a.exercises.length) {
    a.index++;
    a.stage = 'rest';
    a.restKind = 'exercise';
    a.rest = e.transition;
    a.restReturn = 'next';
  } else a.stage = 'finishers';
}
export function recordSet(state, {weight, reps, feeling}) {
  const a = state.active;
  if (!a || a.stage !== 'work' || !(feeling in feelings)) throw new Error('Série indisponible.');
  const item = a.exercises[a.index], e = byId(item.id), p = prescription(state, e.id);
  if (!Number.isFinite(weight) || weight < 0 || weight > 1000 || !Number.isInteger(reps) || reps < 0 || reps > 50) throw new Error('Vérifie le poids et les répétitions.');
  a.records.push({id: e.id, weight: p.mode === 'body' ? 0 : weight, reps, rir: feelings[feeling], mode: p.mode});
  a.workingWeights = {...a.workingWeights, [e.id]: weight};
  if (a.records.filter(r => r.id === e.id).length >= item.sets) nextExercise(state);
  else { a.stage = 'rest'; a.restKind = 'set'; a.rest = e.rest; }
}
