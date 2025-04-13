/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const sleepTime = ns.args[1] || 0;
    
    if (!target) {
        ns.tprint("ERROR: Missing required arguments (target)");
        return;
    }
    
    await ns.sleep(sleepTime);
    const grew = await ns.grow(target);
    ns.tprint(`${ns.getHostname()} grew ${target} by ${grew.toFixed(2)}x [new money: ${ns.formatNumber(ns.getServerMoneyAvailable(target))}]`);
}