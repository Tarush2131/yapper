interface IconProps {
  className?: string
}

const base = 'h-[18px] w-[18px]'

export const PlayIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.8-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
  </svg>
)

export const PauseIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="6" y="4.5" width="4.2" height="15" rx="1.4" />
    <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" />
  </svg>
)

export const PrevIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="5" y="5" width="2.6" height="14" rx="1.2" />
    <path d="M19 6.3v11.4a1 1 0 0 1-1.55.83l-8.4-5.7a1 1 0 0 1 0-1.66l8.4-5.7A1 1 0 0 1 19 6.3Z" />
  </svg>
)

export const NextIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="16.4" y="5" width="2.6" height="14" rx="1.2" />
    <path d="M5 6.3v11.4a1 1 0 0 0 1.55.83l8.4-5.7a1 1 0 0 0 0-1.66l-8.4-5.7A1 1 0 0 0 5 6.3Z" />
  </svg>
)

export const RestartIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" strokeLinecap="round" />
    <path d="M3 3.5V9h5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ScriptIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden>
    <path d="M5 4.5h14v15H5z" strokeLinejoin="round" />
    <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" strokeLinecap="round" />
  </svg>
)

export const GearIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" strokeLinecap="round" />
  </svg>
)

export const CloseIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
  </svg>
)

export const SparkIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2.2l1.9 5.6a4 4 0 0 0 2.5 2.5l5.6 1.9-5.6 1.9a4 4 0 0 0-2.5 2.5L12 22.2l-1.9-5.6a4 4 0 0 0-2.5-2.5L2 12.2l5.6-1.9a4 4 0 0 0 2.5-2.5L12 2.2Z" />
  </svg>
)

export const WaveIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden>
    <path d="M3 12h2M7.5 7.5v9M12 4v16M16.5 8.5v7M21 11v2" strokeLinecap="round" />
  </svg>
)

export const BackIcon = ({ className = base }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M14.5 5.5 8 12l6.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
