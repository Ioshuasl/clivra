---
paths:
  - "frontend/src/app/**/page.tsx"
---

# Frontend — Page

## Caminho

`frontend/src/app/(app|public)/.../page.tsx`

## Obrigatório

```tsx
import { PatientIndex } from '@/packages/operacional/components/Patient/PatientIndex';

export default function Page() {
  return <PatientIndex />;
}
```

- Só composição / metadata. Zero fetch, zero regra de negócio.

## Proibido

- Hook, service, data, API na page.
- Lógica além de compor o componente do domínio.

Norma: `docs/09`, `docs/16`.
