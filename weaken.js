/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const sleepTime = ns.args[1] || 0;
    
    if (!target) {
        ns.tprint("ERROR: Missing required arguments (target)");
        return;
    }
    
    await ns.sleep(sleepTime);
    const weakened = await ns.weaken(target);
    ns.tprint(`${ns.getHostname()} weakened ${target} ${ns.formatNumber(weakened)} [new security: ${ns.getServerSecurityLevel(target).toFixed(2)}]`);
}