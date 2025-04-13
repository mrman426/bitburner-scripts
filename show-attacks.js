import { getAllServers, getRunningAttacks } from "./utils/server.js";
import { listView } from "./utils/console.js";

/** @param {NS} ns */
export async function main(ns) {
    // Get all servers and running attacks
    const attacks = getRunningAttacks(ns, getAllServers(ns));
    
    if (attacks.size === 0) {
        ns.tprint("No attacks currently running");
        return;
    }
    
    // Convert attacks to array of objects for listView
    const attackData = Array.from(attacks).map(([target, info]) => {
        const maxMoney = ns.getServerMaxMoney(target);
        const currentMoney = ns.getServerMoneyAvailable(target);
        const currentSecurity = ns.getServerSecurityLevel(target);
        const minSecurity = ns.getServerMinSecurityLevel(target);
        
        return {
            Target: target,
            Threads: info.threads,
            Servers: Array.from(info.servers).join(", "),
            Money: `${ns.formatNumber(currentMoney)} / ${ns.formatNumber(maxMoney)}`,
            Security: `${currentSecurity.toFixed(2)} / ${minSecurity.toFixed(2)}`
        };
    });
    
    // Print header and formatted table
    ns.tprint("\n=== Running Attacks ===\n" + listView(attackData));
} 