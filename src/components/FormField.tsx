import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import './FormField.css'

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="form-field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="form-field__hint">{hint}</p>
      ) : null}
    </div>
  )
}

type NumberInputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
}

export function NumberInput({ className = '', ...props }: NumberInputProps) {
  return (
    <input
      className={`form-field__control ${className}`.trim()}
      inputMode="decimal"
      {...props}
    />
  )
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
}

export function TextInput({ className = '', ...props }: TextInputProps) {
  return <input className={`form-field__control ${className}`.trim()} {...props} />
}

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string
}

export function SelectInput({ className = '', children, ...props }: SelectInputProps) {
  return (
    <select className={`form-field__select ${className}`.trim()} {...props}>
      {children}
    </select>
  )
}
