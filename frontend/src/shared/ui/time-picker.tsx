"use client"

import * as React from "react"
import { ClockIcon, XIcon } from "lucide-react"

import { cn } from "@/shared/helpers/utils"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"

export type TimePickerProps = {
  /** `HH:mm` (24 h) ou vazio. */
  value?: string
  /** Recebe `HH:mm`, ou texto vazio quando a pessoa limpa o campo. */
  onChange: (value: string) => void
  /** Intervalo, em minutos, entre as opções da lista (e das setas ↑ ↓). Padrão: 15. */
  step?: number
  /** Primeira e última opção da lista (`HH:mm`). Padrão: 00:00 a 23:59. */
  minTime?: string
  maxTime?: string
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  className?: string
  id?: string
  name?: string
  "aria-label"?: string
  "aria-invalid"?: boolean
  onBlur?: () => void
}

const pad = (n: number) => String(n).padStart(2, "0")

function toMinutes(time: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return undefined
  return Number(match[1]) * 60 + Number(match[2])
}

function fromMinutes(total: number): string {
  const clamped = Math.min(Math.max(total, 0), 23 * 60 + 59)
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`
}

/** Aceita 9, 09, 930, 0930, 9:30 e 09:30 → `HH:mm`. Horário inexistente → `undefined`. */
export function parseTimeBr(text: string): string | undefined {
  const value = text.trim()
  if (!value) return undefined
  let hours: number
  let minutes: number
  const withColon = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (withColon) {
    hours = Number(withColon[1])
    minutes = Number(withColon[2])
  } else if (/^\d{1,4}$/.test(value)) {
    if (value.length <= 2) {
      hours = Number(value)
      minutes = 0
    } else {
      hours = Number(value.slice(0, value.length - 2))
      minutes = Number(value.slice(-2))
    }
  } else {
    return undefined
  }
  if (hours > 23 || minutes > 59) return undefined
  return `${pad(hours)}:${pad(minutes)}`
}

/** Vai pondo os dois-pontos enquanto a pessoa digita: 0930 → 09:30. */
function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4)
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/**
 * Campo de horário para o Clivra: **digita** (com os dois-pontos automáticos), usa as **setas ↑ ↓**
 * para ajustar de step em step, ou **escolhe numa lista** pelo relógio.
 */
export function TimePicker({
  value = "",
  onChange,
  step = 15,
  minTime = "00:00",
  maxTime = "23:59",
  placeholder = "HH:MM",
  disabled = false,
  clearable = false,
  className,
  id,
  name,
  onBlur,
  ...aria
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [error, setError] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const options = React.useMemo(() => {
    const from = toMinutes(minTime) ?? 0
    const to = toMinutes(maxTime) ?? 23 * 60 + 59
    const list: string[] = []
    for (let m = from; m <= to; m += Math.max(step, 1)) list.push(fromMinutes(m))
    return list
  }, [minTime, maxTime, step])

  /** Confirma o texto digitado. Devolve a mensagem de erro, ou vazio quando deu certo. */
  const commit = (): string => {
    const raw = inputValue.trim()
    if (!raw) {
      setError("")
      if (value) onChange("")
      return ""
    }
    const time = parseTimeBr(raw)
    if (!time) {
      const message = "Horário inválido. Ex.: 14:30."
      setError(message)
      return message
    }
    setError("")
    setInputValue(time)
    if (time !== value) onChange(time)
    return ""
  }

  const nudge = (direction: 1 | -1) => {
    const base = parseTimeBr(inputValue) ?? value
    const current = toMinutes(base) ?? (direction === 1 ? -step : 24 * 60)
    const next = fromMinutes(current + direction * step)
    setInputValue(next)
    setError("")
    onChange(next)
  }

  // Ao abrir a lista, leva a opção escolhida (ou a mais próxima) para o meio da vista.
  const centerOnMount = (node: HTMLButtonElement | null) => {
    const list = node?.parentElement
    if (node && list) list.scrollTop = node.offsetTop - list.clientHeight / 2 + node.clientHeight / 2
  }

  const nearest = React.useMemo(() => {
    const target = toMinutes(value)
    if (target === undefined) return undefined
    return options.reduce<string | undefined>((best, option) => {
      const distance = Math.abs((toMinutes(option) ?? 0) - target)
      const bestDistance = best ? Math.abs((toMinutes(best) ?? 0) - target) : Infinity
      return distance < bestDistance ? option : best
    }, undefined)
  }, [options, value])

  const anchor = options.includes(value) ? value : nearest
  const describedBy = error ? `${id ?? name ?? "time"}-error` : undefined

  return (
    <div className={cn("w-full min-w-0 space-y-1.5", className)}>
      <div
        data-slot="time-picker"
        data-invalid={error || aria["aria-invalid"] ? "true" : undefined}
        className={cn(
          "flex h-10 w-full min-w-0 items-center rounded-md border border-input bg-card transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
          "data-[invalid=true]:border-destructive data-[invalid=true]:ring-3 data-[invalid=true]:ring-destructive/20",
          disabled && "cursor-not-allowed bg-muted opacity-50",
        )}
      >
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={focused ? inputValue : value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={aria["aria-label"]}
          aria-invalid={Boolean(error) || aria["aria-invalid"] ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 border-0 bg-transparent shadow-none ring-0 focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          onFocus={() => {
            setFocused(true)
            setInputValue(value)
            setError("")
          }}
          onChange={(event) => {
            setInputValue(maskTime(event.target.value))
            setError("")
          }}
          onBlur={() => {
            const message = commit()
            setFocused(false)
            if (message) setError(value ? `${message} Mantivemos ${value}.` : message)
            onBlur?.()
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commit()
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              nudge(1)
            } else if (event.key === "ArrowDown") {
              event.preventDefault()
              nudge(-1)
            } else if (event.key === "Escape") {
              setInputValue(value)
              setError("")
            }
          }}
        />

        {clearable && value && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Limpar horário"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              inputRef.current?.focus()
              setInputValue("")
              setError("")
              onChange("")
            }}
          >
            <XIcon />
          </Button>
        ) : null}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label="Escolher horário"
                className="mr-1 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              />
            }
          >
            <ClockIcon />
          </PopoverTrigger>

          <PopoverContent align="end" className="w-32 gap-0 p-1" initialFocus={false}>
            <div role="listbox" aria-label="Horários" className="relative max-h-60 overflow-y-auto">
              {options.map((option) => {
                const selected = option === value
                return (
                  <button
                    key={option}
                    ref={option === anchor ? centerOnMount : undefined}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-sm tabular-nums transition-colors",
                      "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                      selected && "bg-primary font-medium text-primary-foreground hover:bg-primary",
                    )}
                    onClick={() => {
                      setInputValue(option)
                      setError("")
                      onChange(option)
                      setOpen(false)
                    }}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {error ? (
        <p id={describedBy} role="alert" className="text-xs leading-snug text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
