/** @param {NS} ns */
import { listView, formatMoney, formatNumber } from '/utils/console.js'

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
    return ["--loop"];
}

export async function main(ns) {
    ns.disableLog("ALL");
    const loop = ns.args.includes("--loop");

    const filename = '/data/attacks.txt'

    do {
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

        rows
            .forEach(row => {
                if (!row.trim()) return // Skip empty lines
                const data = row.split(";")
                const attack = Object.fromEntries(columns.map((col, i) => [col, data[i]]))
                if (!attack.target) return // Skip if target is not defined

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
        const reportArray = Object.values(report)
            .sort((a, b) => (b.totalMoneyHacked / b.totalThreads) - (a.totalMoneyHacked / a.totalThreads))
            .map(stats => {
                return {
                    Target: stats.target,
                    "Threads": formatNumber(ns, stats.totalThreads ? stats.totalThreads : 0),
                    "Money Hacked": formatMoney(ns, stats.totalMoneyHacked ? stats.totalMoneyHacked : 0),
                    "Money/Thread": formatMoney(ns, stats.totalThreads ? stats.totalMoneyHacked / stats.totalThreads : 0),
                }
            });

        // Generate the report output using listView
        ns.tprint("=== Attack Report ===\n" + listView(reportArray))

        if (loop) {
            await ns.sleep(2000)
        }
    } while (loop)
}