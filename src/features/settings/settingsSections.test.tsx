import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BackupSection } from './BackupSection'
import { LicensesSection } from './LicensesSection'
import { SettingsTab } from './SettingsTab'

describe('Ustawienia: kopia zapasowa i „Źródła i licencje” (sekcje 9, 10)', () => {
  it('kopia zapasowa: eksport, import i stan pamięci trwałej przed sprawdzeniem', () => {
    const markup = renderToStaticMarkup(<BackupSection />)
    expect(markup).toContain('Kopia zapasowa i pamięć')
    expect(markup).toContain('Eksportuj kopię (JSON)')
    expect(markup).toContain('Importuj kopię…')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('Sprawdzanie pamięci trwałej…')
  })

  it('źródła i licencje: wszystkie grupy, odnośniki i pełne teksty licencji krojów', () => {
    const markup = renderToStaticMarkup(<LicensesSection />)
    for (const text of ['Źródła i licencje', 'Dane katalogu i mapy', 'Zdjęcia nieba', 'Oprogramowanie', 'Kroje pisma', 'CC BY-SA 4.0', 'GPL-2.0', 'ODbL']) {
      expect(markup).toContain(text)
    }
    expect(markup).toContain('href="https://github.com/mattiaverga/OpenNGC"')
    expect(markup).toContain('SIL OPEN FONT LICENSE Version 1.1')
    expect(markup).toContain('Wczytywanie listy katalogów…')
  })

  it('zakładka Ustawienia zawiera obie sekcje na końcu, bez napisów zajętych przez starsze testy', () => {
    const markup = renderToStaticMarkup(<SettingsTab />)
    const backup = markup.indexOf('Kopia zapasowa i pamięć')
    const licenses = markup.indexOf('Źródła i licencje')
    expect(backup).toBeGreaterThan(markup.indexOf('Parametry planowania'))
    expect(licenses).toBeGreaterThan(backup)
    const added = markup.slice(backup)
    for (const taken of ['Edycja:', 'Zapisz zmiany', 'Odrzuć zmiany']) expect(added).not.toContain(taken)
  })
})
