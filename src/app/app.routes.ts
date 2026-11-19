import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Panoramica · JavaLearner', loadComponent: () => import('./features/dashboard') },
  { path: 'argomenti', title: 'Argomenti · JavaLearner', loadComponent: () => import('./features/topics') },
  { path: 'argomenti/:id', title: 'Argomento · JavaLearner', loadComponent: () => import('./features/topic-detail') },
  { path: 'esercitati', title: 'Esercitati · JavaLearner', loadComponent: () => import('./features/practice-setup') },
  { path: 'simulazione', title: 'Simulazione esame · JavaLearner', loadComponent: () => import('./features/exam-intro') },
  { path: 'quiz', title: 'Quiz · JavaLearner', loadComponent: () => import('./features/quiz') },
  { path: 'risultati/:id', title: 'Risultati · JavaLearner', loadComponent: () => import('./features/results') },
  { path: 'storico', title: 'Storico · JavaLearner', loadComponent: () => import('./features/history') },
  { path: '**', redirectTo: '' },
];
