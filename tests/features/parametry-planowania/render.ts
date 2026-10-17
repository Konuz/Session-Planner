// Render zakładki Noc w testach (react-dom/server, bez DOM).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NightTab } from '../../../src/features/night/NightTab'
import { usePlannerStore } from '../../../src/state/plannerStore'

/** Tekst wyrenderowanej zakładki Noc dla bieżącego stanu aplikacji (bez znaczników, spacje scalone). */
export function renderedNightTab(): string {
  // renderToStaticMarkup czyta stan Zustand przez getServerSnapshot, czyli getInitialState();
  // kopiujemy tam bieżący stan, żeby zakładka pokazała to samo, co w przeglądarce.
  Object.assign(usePlannerStore.getInitialState(), usePlannerStore.getState())
  return renderToStaticMarkup(createElement(NightTab))
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
}
