---
paths:
  - "frontend/src/packages/**/types/**/*"
---

# Frontend — Types

## Caminho

`frontend/src/packages/<area>/types/<Entidade>/`

Exemplos: `PatientTypes.ts`, `PatientFormTypes.ts`, `PatientTableTypes.ts`, `PatientFormDialogTypes.ts`.

## Obrigatório

- Tipagens da entidade e props de tela em arquivos separados.
- Named export (ou padrão do package — consistente por entidade).
- Reutilizar na cadeia Hook → Service → Data.
- **Não existe pasta `interfaces/`.**

## Proibido

- Tipagem inline reutilizável espalhada em component/hook.
- Duplicar o mesmo shape com nomes diferentes.
- Enums aqui — vão em `enum/`.

Norma: `docs/16`, `docs/09`.
