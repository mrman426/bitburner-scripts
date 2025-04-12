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
    const shouldLoop = ns.args[1] !== false;
    
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    // Get server information
    const maxMoney = ns.getServerMaxMoney(target);
    const currentMoney = ns.getServerMoneyAvailable(target);
    const currentSecurity = ns.getServerSecurityLevel(target);
    const minSecurity = ns.getServerMinSecurityLevel(target);
    
    // If security is too high, weaken it once
    if (currentSecurity > minSecurity + 1) {
        ns.tprint(`Security too high (${currentSecurity.toFixed(2)} > ${(minSecurity + 1).toFixed(2)}), weakening...`);
        await ns.weaken(target);
    }
    
    // If money is too low, grow it once
    if (currentMoney < maxMoney * 0.5) {
        ns.tprint(`Money too low (${ns.formatNumber(currentMoney)} < ${ns.formatNumber(maxMoney * 0.5)}), growing...`);
        await ns.grow(target);
    }
    
    // Perform the hack
    ns.tprint(`Hacking ${target}...`);
    const stolen = await ns.hack(target);
    ns.tprint(`Stole ${ns.formatNumber(stolen)} from ${target}`);
    
    // If looping is enabled, continue
    if (shouldLoop) {
        do {
            const currentMoney = ns.getServerMoneyAvailable(target);
            const currentSecurity = ns.getServerSecurityLevel(target);
            
            if (currentSecurity > minSecurity + 1) {
                await ns.weaken(target);
            } else if (currentMoney < maxMoney * 0.5) {
                await ns.grow(target);
            } else {
                await ns.hack(target);
            }
        } while (shouldLoop);
    }
} 