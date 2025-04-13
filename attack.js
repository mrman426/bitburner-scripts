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
    const target = ns.args[0];
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    // Get server information
    const maxMoney = ns.getServerMaxMoney(target);
    const moneyThresh = maxMoney * 0.9; // Keep money at 90% of max
    const minMoneyThresh = maxMoney * 0.3; // Don't hack if below 30% of max
    const securityThresh = ns.getServerMinSecurityLevel(target) + 3; // More conservative security threshold

    ns.print(`Starting attack on ${target}`);
    ns.print(`Max Money: ${ns.formatNumber(maxMoney)}`);
    ns.print(`Money Threshold: ${ns.formatNumber(moneyThresh)}`);
    ns.print(`Min Money Threshold: ${ns.formatNumber(minMoneyThresh)}`);
    ns.print(`Security Threshold: ${securityThresh.toFixed(2)}`);

    // Infinite loop to continuously attack the server
    while (true) {
        const currentMoney = ns.getServerMoneyAvailable(target);
        const currentSecurity = ns.getServerSecurityLevel(target);
        
        ns.print(`\n${target} Status:`);
        ns.print(`Money: ${ns.formatNumber(currentMoney)} (${(currentMoney/maxMoney*100).toFixed(1)}% of max)`);
        ns.print(`Security: ${currentSecurity.toFixed(2)} (min: ${ns.getServerMinSecurityLevel(target).toFixed(2)})`);

        if (currentSecurity > securityThresh) {
            // If security is too high, weaken it
            ns.print(`Security too high (${currentSecurity.toFixed(2)} > ${securityThresh.toFixed(2)}), weakening...`);
            await ns.weaken(target);
            ns.print(`Weakened ${target}. New security: ${ns.getServerSecurityLevel(target).toFixed(2)}`);
        } else if (currentMoney < moneyThresh) {
            // If money is below threshold, grow it
            ns.print(`Money below threshold (${ns.formatNumber(currentMoney)} < ${ns.formatNumber(moneyThresh)}), growing...`);
            const growth = await ns.grow(target);
            ns.print(`Grew ${target} by ${growth.toFixed(2)}x. New money: ${ns.formatNumber(ns.getServerMoneyAvailable(target))}`);
        } else {
            // Only hack if money is above minimum threshold
            ns.print(`Money above minimum threshold, hacking...`);
            const stolen = await ns.hack(target);
            ns.print(`Stole ${ns.formatNumber(stolen)} from ${target}`);
        }
    }
} 