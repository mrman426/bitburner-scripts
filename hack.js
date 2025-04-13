/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const sleepTime = ns.args[1] || 0;
    
    if (!target) {
        ns.tprint("ERROR: Missing required arguments (target)");
        return;
    }
    
    await ns.sleep(sleepTime);
    const hacked = await ns.hack(target);
    ns.tprint(`${ns.getHostname()} stole ${ns.formatNumber(hacked)} from ${target} [new money: ${ns.formatNumber(ns.getServerMoneyAvailable(target))}] [new security: ${ns.getServerSecurityLevel(target).toFixed(2)}]`);
}