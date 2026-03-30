# React + TypeScript + Vite

# Frontend - zasady pracy (commit, branch, Husky)

Ten dokument opisuje aktualne reguly pracy w projekcie frontend: jak nazywac branche, jak pisac commity i jakie walidacje uruchamiaja sie automatycznie.

## Wymagania

- Node.js zgodny z zaleznosciami projektu
- npm

## Szybki start

```bash
npm install
npm run dev
```

## Najwazniejsze skrypty

- `npm run dev` - uruchamia Vite w trybie deweloperskim
- `npm run build` - buduje aplikacje (`tsc -b && vite build`)
- `npm run typecheck` - sprawdza typy TypeScript (`tsc -b --noEmit`)
- `npm run test` - uruchamia testy Jest
- `npm run test:watch` - uruchamia testy Jest w trybie watch
- `npm run test:ci` - uruchamia testy pod CI (`jest --ci --runInBand`)
- `npm run lint` - uruchamia ESLint
- `npm run lint:fix` - naprawia problemy ESLint (tam gdzie mozliwe)
- `npm run prettier` - sprawdza format (`prettier --check .`)
- `npm run prettier:fix` - formatuje pliki (`prettier --write .`)

## Zasady nazewnictwa branchy

Branch jest sprawdzany w hooku `pre-commit`.

### Dozwolony format

- `main`
- `HEAD`
- `<typ>/<nazwa>`
- `<typ>(<scope>)/<nazwa>`

Gdzie:

- `typ` nalezy do: `fix`, `feat`, `refactor`, `infra`, `test`, `docs`, `ci`, `release`
- `scope` (opcjonalny) moze zawierac litery, cyfry i myslniki
- `nazwa` moze zawierac litery, cyfry i myslniki

### Przyklady poprawne

- `feat/setup-hooks`
- `feat(frontend)/setup`
- `fix(api)/timeout`
- `docs/readme-update`

### Przyklady niepoprawne

- `feature(frontend)/setup` (niedozwolony typ `feature`)
- `feat/front_end` (podkreslnik jest niedozwolony)
- `feat(frontend)/setup/test` (za duzo segmentow)

## Zasady commit message (Commitlint)

Hook `commit-msg` uruchamia commitlint i sprawdza temat commita.

### Dozwolone typy commitow

- `feat`
- `fix`
- `test`
- `build`
- `refactor`
- `perf`
- `docs`
- `ci`
- `chore`
- `style`
- `revert`

### Przyklady poprawne

- `feat: add branch validation docs`
- `fix: handle empty API response`
- `docs: update README with workflow`
- `feat(frontend): add settings page`

### Co jest ignorowane przez commitlint

- commity release typu `chore(release): ...`
- merge commity (`Merge ...`)
- automatyczne adnotacje squash/PR zawierajace `(#...)`

## Reguly Husky (co dzieje sie automatycznie)

Projekt ma aktywne 3 hooki:

### `pre-commit`

1. Sprawdza nazwe brancha (regex branch naming).
1. Uruchamia `npx lint-staged`.
1. `lint-staged` uruchamia: `prettier --write --ignore-unknown` na plikach staged.

Efekt:

- jesli branch jest zly, commit zostaje odrzucony
- jesli formatowanie sie nie powiedzie, commit zostaje odrzucony
- jesli formatowanie przejdzie, commit moze isc dalej

### `commit-msg`

- uruchamia: `npx --no -- commitlint --edit ${1}`
- jesli commit message jest niezgodny, commit zostaje odrzucony

### `pre-push`

- uruchamia: `npm run prettier`
- uruchamia: `npm run typecheck`
- uruchamia: `npm run test:ci`
- sprawdza format calego repo frontend (`prettier --check .`)
- sprawdza typy TypeScript (`tsc -b --noEmit`)
- uruchamia testy w trybie CI (`jest --ci --runInBand`)
- jesli sa bledy formatowania, push zostaje odrzucony
- jesli sa bledy typow TypeScript, push zostaje odrzucony
- jesli testy nie przejda, push zostaje odrzucony

## Rekomendowany workflow

1. Stworz branch zgodny z regula, np. `feat(frontend)/setup`.
1. Wprowadz zmiany.
1. Zacommituj zmiany z poprawnym komunikatem, np. `feat(frontend): add husky docs`.
1. Wypchnij branch (`git push`).

## Szybka diagnostyka problemow

- branch odrzucony: sprawdz czy nazwa pasuje do formatu z sekcji branchy
- commit odrzucony: sprawdz wynik `npx lint-staged` i `commitlint`
- push odrzucony na formatowaniu: uruchom `npm run prettier:fix`, a potem ponow `git push`
- push odrzucony na typach: uruchom `npm run typecheck`, popraw bledy TS i sproboj ponownie
- push odrzucony na testach: uruchom `npm run test:ci`, popraw testy i sproboj ponownie
