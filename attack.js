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

    const target = ns.args[0];
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
        
        ns.print(`\n====================================================\n${target} Status:`);
        ns.print(`Money: ${ns.formatNumber(currentMoney)} (${(currentMoney/maxMoney*100).toFixed(1)}% of max)`);
        ns.print(`Security: ${currentSecurity.toFixed(2)} (${(currentSecurity/minSecurity*100).toFixed(1)}% of min)`);

        if (currentSecurity > securityThresh) {
            // If security is too high, weaken it
            ns.print(`WARNING: Security too high (${currentSecurity.toFixed(2)} > ${securityThresh.toFixed(2)}), weakening...`);
            await ns.weaken(target);
            ns.tprint(`Weakened ${target}. New security: ${currentSecurity.toFixed(2)}`);
        } else if (currentMoney < moneyThresh) {
            // If money is below threshold, grow it
            ns.print(`WARNING: Money below threshold (${ns.formatNumber(currentMoney)} < ${ns.formatNumber(moneyThresh)}), growing...`);
            const growth = await ns.grow(target);
            ns.tprint(`Grew ${target} by ${growth.toFixed(2)}x. New money: ${ns.formatNumber(currentMoney)}`);
        } else {
            // Only hack if money is above minimum threshold
            ns.print(`INFO: Money above minimum threshold, hacking...`);
            const stolen = await ns.hack(target);
            ns.tprint(`Stole ${ns.formatNumber(stolen)} from ${target}`);
        }
    }
} 