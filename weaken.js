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
    const weakened = await ns.weaken(target);
    
    if (verbose) {
        ns.tprint(`${new Date().toLocaleTimeString()}: ${hostname} weakened ${target} ${ns.formatNumber(weakened)} [new security: ${ns.getServerSecurityLevel(target).toFixed(2)}]`);
    }

    // Save the attack
    const securityLevel = ns.getServerSecurityLevel(target)
    const moneyAvailable = ns.getServerMoneyAvailable(target)
    await saveAttack(ns, startTime, hostname, target, 'weaken.js', threads, securityLevel, moneyAvailable, 0)
}