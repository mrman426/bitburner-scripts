/** 
 * @param {NS} ns 
 * @param boolean verbose 
 * @param string message
 */
export function log(ns, message, verbose = false, toast = false) {
    const timePrefix = formatTime(ns) + ': '

    if (toast) {
        ns.toast(message)
    }

    if (verbose) {
        ns.tprint(timePrefix + message)
    }

    ns.print(timePrefix + message)
}

/**
 * Create a Grid View display of the provided objects
 *
 * @param  {Object[]} objects Array of data objects
 * @return {string}
 */
export function listView(objects) {
    if (!objects.length) {
        return '-> 0 rows'
    }

    // Build header array
    const headers = Object.keys(objects[0])

    // Build column arrays
    const columns = objects.map(o => Object.values(o).map(p => formatProperty(p)))

    // Calculate widths
    const widths = []
    for (const cell in headers) {
        widths[cell] = columns.map(o => o[cell])
            .concat([headers[cell]])
            .map(s => s.toString().length)
            .reduce((a, b) => a > b ? a : b)
    }

    // Calculate alignment
    const align = []
    for (const cell in headers) {
        align[cell] = typeof columns[0][cell] === 'number' ? 'right' : 'left'
    }

    // Write separator
    let output = '|'
    for (const cell in headers) {
        output += `${''.padEnd(widths[cell] + 2, '=')}|`
    }

    // Write headers
    output += '\n|'
    for (const cell in headers) {
        output += ` ${headers[cell].toString().padEnd(widths[cell], ' ')} |`
    }

    // Write separator
    output += '\n|'
    for (const cell in headers) {
        output += `${''.padEnd(widths[cell] + 2, '=')}|`
    }

    // Write rows
    for (const row in columns) {
        output += '\n|'
        for (const cell in columns[row]) {
            if (align[cell] === 'left') {
                output += ` ${columns[row][cell].toString().padEnd(widths[cell], ' ')} |`
            } else {
                output += ` ${columns[row][cell].toString().padStart(widths[cell], ' ')} |`
            }
        }
    }

    // Write separator
    output += '\n|'
    for (const cell in headers) {
        output += `${''.padEnd(widths[cell] + 2, '=')}|`
    }

    // Write row count
    output += '\n-> ' + columns.length.toString() + ' rows'

    output += '\n'
    return output
}


/**
 * Create a Detail View display of the provided object
 *
 * @param  {Object} object Data object
 */
export function detailView(object) {

    // Build header array
    const headers = Object.keys(object)

    // Build column arrays
    const columns = Object.values(object).map(p => formatProperty(p))

    // Calculate widths
    const widths = {
        headers: headers.map(s => s.toString().length).reduce((a, b) => a > b ? a : b),
        columns: columns.map(s => s.toString().length).reduce((a, b) => a > b ? a : b),
    }

    // Write separator
    let output = '|'
    output += `${''.padEnd(widths.headers + 2, '=')}|`
    output += `${''.padEnd(widths.columns + 2, '=')}|`

    // Write output
    output += '\n'
    for (const cell in headers) {
        output += '|'
        output += ` ${headers[cell].toString().padEnd(widths.headers, ' ')} |`
        output += ` ${columns[cell].toString().padEnd(widths.columns, ' ')} |`
        output += '\n'
    }

    // Write separator
    output += '|'
    output += `${''.padEnd(widths.headers + 2, '=')}|`
    output += `${''.padEnd(widths.columns + 2, '=')}|`
    output += '\n'

    return output
}

/**
 * Format anything to a string or a number, for gridView()/detailView()
 *
 * @param {*} property
 * @return {string|number}
 */
function formatProperty(property) {
    if (typeof property === 'string' || typeof property === 'number') {
        return property
    }
    if (typeof property === 'boolean') {
        return property ? 'Y' : 'N'
    }
    if (property) {
        return JSON.stringify(property)
    }
    return ''
}

/**
 * Format Number as string
 *
 * @param {NS} ns
 * @param number
 * @returns {string}
 */
export function formatNumber(ns, number) {
    return ns.formatNumber(number, 1)
}

/**
 * Format Money as string
 *
 * @param {NS} ns
 * @param money
 * @returns {string}
 */
export function formatMoney(ns, money) {
    return '$' + ns.formatNumber(money, 1)
}

/**
 * Format RAM as string
 *
 * @param {NS} ns
 * @param gb
 * @returns {string}
 */
export function formatRam(ns, gb) {
    return ns.formatRam(gb, 0)
}

/**
 * Format Percentage as string
 *
 * @param {NS} ns
 * @param {number} percent
 * @returns {string}
 */
export function formatPercent(ns, percent) {
    return ns.formatPercent(percent, 1)
}

/**
 * Format a delay and end time
 *
 * @param {NS} ns
 * @param delay time to delay the command in milliseconds
 * @param time time to run the command in milliseconds
 * @returns {string}
 */
export function formatDelays(ns, delay, time) {
    return formatDelay(ns, delay) + ' - ' + formatDelay(ns, delay + time)
}

/**
 * Format a delay in MM:SS
 * Allows negative times (nsFormat didn't work)
 *
 * @param {NS} ns
 * @param value time in milliseconds
 * @returns {string}
 */
export function formatDelay(ns, value) {
    value = value / 1000
    const hours = Math.floor(Math.abs(value) / 60 / 60),
        minutes = Math.floor((Math.abs(value) - (hours * 60 * 60)) / 60),
        seconds = Math.floor(Math.abs(value) - (hours * 60 * 60) - (minutes * 60)),
        milliseconds = Math.round(Math.abs(value * 1000) - (hours * 60 * 60 * 1000) - (minutes * 60 * 1000) - (seconds * 1000))
    return (value < 0 ? '-' : '')
        + (hours ? hours + ':' : '')
        + minutes
        + ':' + seconds.toString().padStart(2, '0')
        + '.'
        + milliseconds.toString().padStart(4, '0')
}

/**
 * Format a delay and end time
 *
 * @param {NS} ns
 * @param start time in milliseconds
 * @param end time in milliseconds
 * @returns {string}
 */
export function formatTimes(ns, start, end) {
    return this.formatTime(ns, start) + '-' + this.formatTime(ns, end)
}

/**
 * Format a locale time in HH:MM:SS
 *
 * @param {NS} ns
 * @param value time in milliseconds
 * @returns {string}
 */
export function formatTime(ns, value = 0) {
    if (!value) {
        value = new Date().getTime()
    }
    return new Date(value).toLocaleTimeString()
}