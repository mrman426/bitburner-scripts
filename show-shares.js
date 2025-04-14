import { getAllServers, getRunningShares } from "./utils/server.js";
import { listView, formatNumber } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    const shares = getRunningShares(ns, getAllServers(ns));
    
    if (shares.size === 0) {
        ns.tprint("No shares currently running");
        return;
    }
    
    const shareData = Array.from(shares)
        .map(([target, info]) => {
            return {
                Target: target,
                Threads: formatNumber(ns, info.threads),
            };
        })
        .sort((a, b) => b.Threads - a.Threads);
    
    ns.tprint("\n=== Running Shares ===\n" + listView(shareData));
}