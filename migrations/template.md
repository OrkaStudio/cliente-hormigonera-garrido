# Migrations — Changelog del Base Template

Esta carpeta documenta los cambios importantes del `base-template` que deben propagarse
a los repos de verticales y clientes.

## Cómo usar

Cuando hagas un cambio en el CORE del base-template:

1. Creá un archivo con el formato: `YYYY-MM-DD-descripcion-corta.md`
2. Documentá qué cambió, por qué, y cómo aplicarlo
3. En cada repo afectado, pedile a Claude Code:

```
"Aplicá el cambio documentado en migrations/YYYY-MM-DD-descripcion.md
 sin modificar las customizaciones específicas de este proyecto"
```

---

## Template para nuevas migrations

```markdown
# YYYY-MM-DD — Título del cambio

## Qué cambió
Descripción clara del cambio técnico.

## Por qué
Motivo: fix de seguridad / mejora de performance / nuevo patrón / etc.

## Archivos afectados
- `/lib/supabase/server.ts` — descripción del cambio
- `/middleware.ts` — descripción del cambio

## Cómo aplicar
Instrucciones paso a paso para que Claude Code lo aplique en otros repos.

## Compatibilidad
¿Rompe algo existente? ¿Requiere cambios en el código del vertical/cliente?
```

---

## Historial

| Fecha | Cambio | Urgencia |
|---|---|---|
| 2026-04-01 | Inicialización del sistema de migrations | — |
