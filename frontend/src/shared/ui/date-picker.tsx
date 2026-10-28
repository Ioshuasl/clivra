"use client"

import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"
import { format, isValid, parse } from "date-fns"
import type { Locale } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { cn } from "@/shared/helpers/utils"
import { Button } from "@/shared/ui/button"
import { Calendar } from "@/shared/ui/calendar"
import { Input } from "@/shared/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"

/** Período completo (início e fim). Em modo `range` o componente só avisa quando os dois lados existem. */
export type DateRangeValue = { from: Date; to: Date }

type CommonProps = {
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  className?: string
  id?: string
  name?: string
  locale?: Locale
  clearable?: boolean
  "aria-label"?: string
  "aria-invalid"?: boolean
  onBlur?: () => void
}

type SingleProps = CommonProps & {
  mode?: "single"
  value?: Date
  onChange: (date: Date | undefined) => void
}

type RangeProps = CommonProps & {
  mode: "range"
  value?: DateRangeValue
  onChange: (range: DateRangeValue | undefined) => void
}

export type DatePickerProps = SingleProps | RangeProps

const DISPLAY = "dd/MM/yyyy"
const PARSE_FORMATS = ["dd/MM/yyyy", "d/M/yyyy", "ddMMyyyy", "dd/MM/yy"]

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Aceita 17/10/2026, 17102026, 17/10/26 e 1/2/2026. Só datas que existem no calendário. */
export function parseDateBr(value: string): Date | undefined {
  const text = value.trim()
  if (!text) return undefined
  for (const pattern of PARSE_FORMATS) {
    const result = parse(text, pattern, new Date())
    if (!isValid(result)) continue
    if (format(result, pattern) !== text) continue
    if (pattern === "dd/MM/yy" && result.getFullYear() < 2000) {
      result.setFullYear(result.getFullYear() + 100)
    }
    if (result.getFullYear() < 1900) return undefined
    return startOfDay(result)
  }
  return undefined
}

/** Vai pondo as barras enquanto a pessoa digita: 17102026 → 17/10/2026. */
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Período: 01102026 31102026 → 01/10/2026 - 31/10/2026. */
function maskRange(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16)
  const first = maskDate(digits.slice(0, 8))
  if (digits.length <= 8) return first
  return `${first} - ${maskDate(digits.slice(8))}`
}

function formatRange(range?: DateRangeValue): string {
  if (!range) return ""
  return `${format(range.from, DISPLAY)} - ${format(range.to, DISPLAY)}`
}

function useTwoMonths(enabled: boolean): number {
  const [months, setMonths] = React.useState(1)
  React.useEffect(() => {
    if (!enabled) return
    const query = window.matchMedia("(min-width: 640px)")
    const update = () => setMonths(query.matches ? 2 : 1)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [enabled])
  return enabled ? months : 1
}

/**
 * Campo de data para o Clivra: **digita** (com barras automáticas) ou **escolhe no calendário**.
 * `mode="single"` para uma data; `mode="range"` para período (um só campo, dois meses no calendário).
 */
export function DatePicker(props: DatePickerProps) {
  const {
    mode = "single",
    placeholder,
    disabled = false,
    minDate,
    maxDate,
    disabledDates,
    className,
    id,
    name,
    locale = ptBR,
    clearable = true,
    onBlur,
  } = props

  const isRange = mode === "range"
  const [open, setOpen] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [error, setError] = React.useState("")
  const [draft, setDraft] = React.useState<DateRange | undefined>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const months = useTwoMonths(isRange)

  const singleValue = props.mode === "range" ? undefined : props.value
  const rangeValue = props.mode === "range" ? props.value : undefined
  const currentText = isRange
    ? formatRange(rangeValue)
    : singleValue
      ? format(singleValue, DISPLAY)
      : ""

  const isDisabledDate = React.useCallback(
    (date: Date) => {
      const day = startOfDay(date).getTime()
      if (minDate && day < startOfDay(minDate).getTime()) return true
      if (maxDate && day > startOfDay(maxDate).getTime()) return true
      return Boolean(disabledDates?.some((item) => sameDay(item, date)))
    },
    [minDate, maxDate, disabledDates],
  )

  const emit = (next: Date | DateRangeValue | undefined) => {
    if (props.mode === "range") props.onChange(next as DateRangeValue | undefined)
    else props.onChange(next as Date | undefined)
  }

  const unavailableMessage = (date: Date) => {
    if (maxDate && startOfDay(date).getTime() > startOfDay(maxDate).getTime()) {
      return sameDay(maxDate, new Date())
        ? "Essa data não pode ser no futuro."
        : `A data não pode ser depois de ${format(maxDate, DISPLAY)}.`
    }
    if (minDate && startOfDay(date).getTime() < startOfDay(minDate).getTime()) {
      return `A data não pode ser antes de ${format(minDate, DISPLAY)}.`
    }
    return "Essa data não está disponível."
  }

  const fail = (message: string) => {
    setError(message)
    return message
  }

  /** Confirma o texto digitado. Devolve a mensagem de erro, ou vazio quando deu certo. */
  const commitInput = (): string => {
    const raw = inputValue.trim()
    if (!raw) {
      setError("")
      if (currentText) emit(undefined)
      return ""
    }

    if (!isRange) {
      const date = parseDateBr(raw)
      if (!date) {
        return fail("Digite uma data válida, como 17/10/2026.")
      }
      if (isDisabledDate(date)) return fail(unavailableMessage(date))
      setError("")
      setInputValue(format(date, DISPLAY))
      if (!singleValue || !sameDay(singleValue, date)) emit(date)
      return ""
    }

    const parts = raw.split(/\s+-\s+|\s+até\s+/i)
    if (parts.length > 2) {
      return fail("Digite o período como 01/10/2026 - 31/10/2026.")
    }
    const from = parseDateBr(parts[0] ?? "")
    const to = parts[1] ? parseDateBr(parts[1]) : from
    if (!from || !to) {
      return fail("Data inexistente ou fora do formato. Ex.: 17/10/2026.")
    }
    if (to < from) {
      return fail("A data final deve ser igual ou posterior à inicial.")
    }
    if (isDisabledDate(from) || isDisabledDate(to)) {
      return fail("O período contém uma data indisponível.")
    }
    setError("")
    setInputValue(formatRange({ from, to }))
    if (
      !rangeValue ||
      !sameDay(rangeValue.from, from) ||
      !sameDay(rangeValue.to, to)
    ) {
      emit({ from, to })
    }
    return ""
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next && isRange) setDraft(rangeValue ? { ...rangeValue } : undefined)
  }

  const handleSelectSingle = (date: Date | undefined) => {
    emit(date)
    setInputValue(date ? format(date, DISPLAY) : "")
    setError("")
    if (date) setOpen(false)
  }

  const handleSelectRange = (
    selected: DateRange | undefined,
    trigger: Date,
  ) => {
    // Com período já completo, o próximo clique começa um período novo.
    const next =
      draft?.from && draft?.to ? { from: trigger, to: undefined } : selected
    setDraft(next)
    setError("")
    if (next?.from && next.to) {
      const range: DateRangeValue = { from: next.from, to: next.to }
      emit(range)
      setInputValue(formatRange(range))
      setOpen(false)
    }
  }

  const clearSelection = () => {
    inputRef.current?.focus()
    setInputValue("")
    setError("")
    setDraft(undefined)
    emit(undefined)
  }

  const describedBy = error ? `${id ?? name ?? "date"}-error` : undefined
  const calendarSelected = isRange
    ? open
      ? draft
      : rangeValue
    : singleValue
  const defaultMonth = isRange
    ? (draft?.from ?? rangeValue?.from)
    : singleValue

  const thisYear = new Date().getFullYear()
  const startMonth = minDate ?? new Date(1900, 0)
  const endMonth = maxDate ?? new Date(thisYear + 10, 11)

  return (
    <div className={cn("w-full min-w-0 space-y-1.5", className)}>
      <div
        data-slot="date-picker"
        data-invalid={error || props["aria-invalid"] ? "true" : undefined}
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
          value={focused ? inputValue : currentText}
          disabled={disabled}
          placeholder={
            placeholder ?? (isRange ? "DD/MM/AAAA - DD/MM/AAAA" : "DD/MM/AAAA")
          }
          aria-label={props["aria-label"]}
          aria-invalid={Boolean(error) || props["aria-invalid"] ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 border-0 bg-transparent shadow-none ring-0 focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          onFocus={() => {
            setFocused(true)
            setInputValue(currentText)
            setError("")
          }}
          onChange={(event) => {
            setInputValue(isRange ? maskRange(event.target.value) : maskDate(event.target.value))
            setError("")
          }}
          onBlur={() => {
            const message = commitInput()
            setFocused(false)
            if (message) {
              // O campo volta ao valor anterior: avisa qual ficou valendo.
              setError(currentText ? `${message} Mantivemos ${currentText}.` : message)
            }
            onBlur?.()
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commitInput()
            }
            if (event.key === "Escape" && !open) {
              setInputValue(currentText)
              setError("")
            }
            if (event.key === "ArrowDown") {
              event.preventDefault()
              handleOpenChange(true)
            }
          }}
        />

        {clearable && currentText && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Limpar data"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSelection}
          >
            <XIcon />
          </Button>
        ) : null}

        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                aria-label="Abrir calendário"
                className="mr-1 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              />
            }
          >
            <CalendarIcon />
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="w-auto max-w-[calc(100vw-1rem)] p-0"
            initialFocus={false}
          >
            {isRange ? (
              <Calendar
                mode="range"
                locale={locale}
                selected={calendarSelected as DateRange | undefined}
                defaultMonth={defaultMonth}
                onSelect={(selected, trigger) => handleSelectRange(selected, trigger)}
                disabled={isDisabledDate}
                startMonth={startMonth}
                endMonth={endMonth}
                captionLayout="dropdown"
                numberOfMonths={months}
                className="rounded-md"
              />
            ) : (
              <Calendar
                mode="single"
                locale={locale}
                selected={singleValue}
                defaultMonth={defaultMonth}
                onSelect={handleSelectSingle}
                disabled={isDisabledDate}
                startMonth={startMonth}
                endMonth={endMonth}
                captionLayout="dropdown"
                className="rounded-md"
              />
            )}
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
