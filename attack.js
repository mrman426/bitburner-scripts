/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, flags) {
	return data.servers;
}

/** @param {NS} ns */
/** @param {string} target */
export async function main(ns) {
    ns.disableLog("disableLog")
    ns.disableLog("getServerMaxMoney")
    ns.disableLog("getServerMinSecurityLevel")
    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("getServerSecurityLevel")

    const hostname = ns.getHostname();
    const target = ns.args[0];
    const verbose = ns.args[1] || false;
    const verboseHacked = ns.args[2] || false;
    const toastHacked = ns.args[3] || false;

    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    // Get server information
    const maxMoney = ns.getServerMaxMoney(target);
    const moneyThresh = maxMoney * 0.9; // Keep money at 90% of max
    const minSecurity = ns.getServerMinSecurityLevel(target)
    const securityThresh = minSecurity + 3; // More conservative security threshold

    ns.print(`Starting attack on ${target}`);
    ns.print(`Money [max: ${ns.formatNumber(maxMoney)}] [threshold: ${ns.formatNumber(moneyThresh)}]`);
    ns.print(`Security [min: ${ns.getServerMinSecurityLevel(target).toFixed(2)}] [threshold: ${securityThresh.toFixed(2)}]`);

    // Infinite loop to continuously attack the server
    while (true) {
        const currentMoney = ns.getServerMoneyAvailable(target);
        const currentSecurity = ns.getServerSecurityLevel(target);
        
        ns.print(`====================================================`);
        ns.print(`Money: ${ns.formatNumber(currentMoney)} (${(currentMoney/maxMoney*100).toFixed(1)}% of max)`);
        ns.print(`Security: ${currentSecurity.toFixed(2)} (${(currentSecurity/minSecurity*100).toFixed(1)}% of min)`);

        if (currentSecurity > securityThresh) {
            // If security is too high, weaken it
            ns.print(`WARNING: security too high (${currentSecurity.toFixed(2)} > ${securityThresh.toFixed(2)}), weakening...`);
            await ns.weaken(target);
            if (verbose) {
                ns.tprint(`${hostname} weakened ${target} [new security: ${ns.getServerSecurityLevel(target).toFixed(2)}] [required security: ${securityThresh.toFixed(2)}]`);
            }
        } else if (currentMoney < moneyThresh) {
            // If money is below threshold, grow it
            ns.print(`WARNING: money below threshold (${ns.formatNumber(currentMoney)} < ${ns.formatNumber(moneyThresh)}), growing...`);
            const growth = await ns.grow(target);
            if (verbose) {
                ns.tprint(`${hostname} grew ${target} by ${growth.toFixed(2)}x [new money: ${ns.formatNumber(ns.getServerMoneyAvailable(target))}] [required money: ${ns.formatNumber(moneyThresh)}]`);
            }
        } else {
            // Only hack if money is above minimum threshold
            ns.print(`INFO: Hacking...`);
            const stolen = await ns.hack(target);
            const message = `${hostname} stole ${ns.formatNumber(stolen)} from ${target} [new money: ${ns.formatNumber(ns.getServerMoneyAvailable(target))} / ${ns.formatNumber(moneyThresh)}] [new security: ${ns.getServerSecurityLevel(target).toFixed(2)} / ${securityThresh.toFixed(2)}]`;
            if (verbose || verboseHacked) {
                ns.tprint(message);
            }
            if (toastHacked) {
                ns.toast(message);
            }
        }
    }
} 