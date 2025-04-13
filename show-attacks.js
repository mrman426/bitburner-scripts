import { getAllServers, getRunningAttacks } from "./utils/server.js";
import { listView } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    const attacks = getRunningAttacks(ns, getAllServers(ns));
    
    if (attacks.size === 0) {
        ns.tprint("No attacks currently running");
        return;
    }
    
    const attackData = Array.from(attacks).map(([target, info]) => {
        return {
            Target: target,
            Threads: info.threads,
            Servers: Array.from(info.servers).join(", "),
            Money: `${ns.formatNumber(ns.getServerMoneyAvailable(target))} / ${ns.formatNumber(ns.getServerMaxMoney(target))}`,
            Security: `${ns.getServerSecurityLevel(target).toFixed(2)} / ${ns.getServerMinSecurityLevel(target).toFixed(2)}`
        };
    });
    
    ns.tprint("\n=== Running Attacks ===\n" + listView(attackData));
} 