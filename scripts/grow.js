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
    
    do {
        const currentMoney = ns.getServerMoneyAvailable(target);
        if (currentMoney < maxMoney * 0.5) {
            await ns.grow(target, { threads: threads });
        }
        await ns.sleep(1000);
    } while (shouldLoop);
} 