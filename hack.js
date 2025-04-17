import { saveAttack } from "./utils/data.js";

/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const threads = ns.args[1]
    const sleepTime = ns.args[2] || 0;
    const verbose = ns.args[3] || false;
    const verboseHacked = ns.args[4] || false;
    const toastHacked = ns.args[5] || false;

    const startTime = new Date().getTime()
    const hostname = ns.getHostname()

    if (!target) {
        ns.tprint("ERROR: Missing required arguments (target)");
        return;
    }
    
    await ns.sleep(sleepTime);
    const moneyStolen = await ns.hack(target);
    const message = `${hostname} stole ${ns.formatNumber(moneyStolen)} from ${target} [new money: ${ns.formatNumber(ns.getServerMoneyAvailable(target))}] [new security: ${ns.getServerSecurityLevel(target).toFixed(2)}]`;
    
    if (verbose || verboseHacked) {
        ns.tprint(`${new Date().toLocaleTimeString()}: ${message}`);
    }
    if (toastHacked) {
        ns.toast(message);
    }

    // Save the attack
    const securityLevel = ns.getServerSecurityLevel(target)
    const moneyAvailable = ns.getServerMoneyAvailable(target)
    await saveAttack(ns, startTime, hostname, target, 'hack.js', threads, securityLevel, moneyAvailable, moneyStolen)
}