import { getAllServers, getServerScores } from "./utils/server.js";
import { listView } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    // Analyze each server and calculate a score
    const serverScores = getServerScores(ns, getAllServers(ns))
        .sort((a, b) => b.score - a.score)
    
    // Format the data for listView
    const formattedData = serverScores.slice(0, 100).map(s => ({
        Server: s.server,
        Score: s.score.toFixed(2),
        Money: `$${ns.formatNumber(s.maxMoney)}`,
        Security: s.minSecurity.toFixed(2),
        'Time (s)': (s.timeToAttack / 1000).toFixed(2),
        'Threads (w/g/h)': `${s.threads.weaken}/${s.threads.grow}/${s.threads.hack}`
    }));
    
    // Print header and formatted table
    ns.tprint("=== Top 100 Best Servers to Attack ===\n" + listView(formattedData));
} 