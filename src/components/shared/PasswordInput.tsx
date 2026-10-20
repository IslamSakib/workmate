import { useState, type ComponentProps } from "react"
import { Input } from "@/components/ui/input"

/** Password field with a Show/Hide toggle (text, not an icon, per the app's no-icons rule). */
export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type">) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className="pr-16" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  )
}
