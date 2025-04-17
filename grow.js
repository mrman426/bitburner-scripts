import { saveAttack } from "./utils/data.js";

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const threads = ns.args[1]
    const sleepTime = ns.args[2] || 0;
    const verbose = ns.args[3] || false;

    const startTime = new Date().getTime()
    const hostname = ns.getHostname()

    if (!target) {
        ns.tprint("ERROR: Missing required arguments (target)");
        return;
    }
    
    await ns.sleep(sleepTime);
    const grew = await ns.grow(target);
    
    if (verbose) {
        ns.tprint(`${new Date().toLocaleTimeString()}: ${hostname} grew ${target} by ${grew.toFixed(2)}x [new money: ${ns.formatNumber(ns.getServerMoneyAvailable(target))}]`);
    }

    // Save the attack
    const securityLevel = ns.getServerSecurityLevel(target)
    const moneyAvailable = ns.getServerMoneyAvailable(target)
    await saveAttack(ns, startTime, hostname, target, 'grow.js', threads, securityLevel, moneyAvailable, 0)
}