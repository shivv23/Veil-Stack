const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }

const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'] || LEVELS.info

function formatEntry(level, component, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    component,
    msg: message,
    host: process.env.HOST || undefined,
    ...meta
  }
  Object.keys(entry).forEach(k => entry[k] === undefined && delete entry[k])
  return JSON.stringify(entry)
}

function createLogger(component) {
  return {
    debug: (msg, meta) => {
      if (currentLevel <= LEVELS.debug) console.log(formatEntry('debug', component, msg, meta))
    },
    info: (msg, meta) => {
      if (currentLevel <= LEVELS.info) console.log(formatEntry('info', component, msg, meta))
    },
    warn: (msg, meta) => {
      if (currentLevel <= LEVELS.warn) console.error(formatEntry('warn', component, msg, meta))
    },
    error: (msg, meta) => {
      if (currentLevel <= LEVELS.error) console.error(formatEntry('error', component, msg, meta))
    }
  }
}

export default createLogger
export { createLogger }
