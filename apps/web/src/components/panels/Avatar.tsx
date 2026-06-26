export function Avatar({
  initials,
  color,
  size = 40,
  online,
  ring,
}: {
  initials: string
  color: string
  size?: number
  online?: boolean
  ring?: boolean
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`h-full w-full rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold ${ring ? 'ring-2 ring-white dark:ring-[#111b21]' : ''}`}
        style={{ fontSize: size * 0.38 }}
      >
        {initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111b21]" />
      )}
    </div>
  )
}
