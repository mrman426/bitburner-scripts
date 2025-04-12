/** @param {NS} ns */
/** @param {string} target */
export async function main(ns) {
    const target = ns.args[0];
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    // Get server information
    const moneyThresh = ns.getServerMaxMoney(target) * 0.75;
    const securityThresh = ns.getServerMinSecurityLevel(target) + 5;

    // Infinite loop to continuously attack the server
    while (true) {
        if (ns.getServerSecurityLevel(target) > securityThresh) {
            // If security is too high, weaken it
            await ns.weaken(target);
        } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
            // If money is below threshold, grow it
            await ns.grow(target);
        } else {
            // If security is low and money is high, hack it
            await ns.hack(target);
        }
    }
} 