export const serializeError = (err: unknown) => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    }
  }
  return { message: String(err) }
}

type LogLevel = 'info' | 'warn' | 'error'

export const log = (level: LogLevel, message: string, meta: Record<string, unknown> = {}) => {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
  const line = JSON.stringify(entry)

  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logRequest = (meta: Record<string, unknown>) => {
  log('info', 'request', meta)
}

export const logError = (message: string, meta: Record<string, unknown> = {}) => {
  log('error', message, meta)
}
