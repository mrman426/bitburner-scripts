import { getAllServers, getServerScores } from "./utils/server.js";
import { listView } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    const formattedData = getServerScores(ns, getAllServers(ns))
        .sort((a, b) => b.score - a.score)
        .map(s => ({
            Server: s.server,
            Score: s.score.toFixed(2),
            Money: `$${ns.formatNumber(s.maxMoney)}`,
            Security: s.minSecurity.toFixed(2),
            'Time (s)': (s.timeToAttack / 1000).toFixed(2),
            'Threads (w/g/h)': `${s.threads.weaken}/${s.threads.grow}/${s.threads.hack}`
        }));
    
    ns.tprint("=== Top Servers to Attack ===\n" + listView(formattedData));
} 