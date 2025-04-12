/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const shouldLoop = ns.args[1] !== false;
    const threads = ns.args[2] || 1;
    
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    const maxMoney = ns.getServerMaxMoney(target);
    const minSecurity = ns.getServerMinSecurityLevel(target);
    
    do {
        const currentMoney = ns.getServerMoneyAvailable(target);
        const currentSecurity = ns.getServerSecurityLevel(target);
        
        // If security is too high or money is too low, wait for those operations
        if (currentSecurity > minSecurity + 1 || currentMoney < maxMoney * 0.5) {
            await ns.sleep(1000);
            continue;
        }
        
        // Only hack when conditions are right
        if (currentMoney >= maxMoney * 0.5 && currentSecurity <= minSecurity + 1) {
            const stolen = await ns.hack(target, { threads: threads });
            ns.tprint(`Stole ${ns.formatNumber(stolen)} from ${target}`);
        }
        
        await ns.sleep(1000);
    } while (shouldLoop);
} 