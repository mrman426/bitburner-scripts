/** @param {NS} ns */
import { listView, formatMoney, formatNumber } from '/utils/console.js'

export async function main(ns) {
    const filename = '/data/attacks.txt'

    if (!ns.fileExists(filename)) {
        ns.tprint(`File ${filename} does not exist.`)
        return
    }

    const fileContent = ns.read(filename).split("\n")
    if (fileContent.length <= 1) {
        ns.tprint("No attack data found.")
        return
    }

    // Parse the header and data rows
    const [header, ...rows] = fileContent
    const columns = header.split(";")

    const report = {}

    rows.forEach(row => {
        if (!row.trim()) return // Skip empty lines
        const data = row.split(";")
        const attack = Object.fromEntries(columns.map((col, i) => [col, data[i]]))

        const target = attack.target
        const threads = parseInt(attack.threads, 10)
        const moneyHacked = parseFloat(attack.moneyHacked)

        if (!report[target]) {
            report[target] = { target, totalThreads: 0, totalMoneyHacked: 0 }
        }

        report[target].totalThreads += threads
        report[target].totalMoneyHacked += moneyHacked
    })

    // Convert report object to an array for listView
    const reportArray = Object.values(report).map(stats => ({
        Target: stats.target,
        "Threads": formatNumber(ns, stats.totalThreads),
        "Money Hacked": formatMoney(ns, stats.totalMoneyHacked),
        "Money/Thread": formatMoney(ns, stats.totalMoneyHacked / stats.totalThreads),
    }))

    // Generate the report output using listView
    ns.tprint("=== Attack Report ===\n" + listView(reportArray))
}