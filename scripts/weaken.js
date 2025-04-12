/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const shouldLoop = ns.args[1] !== false;
    const threads = ns.args[2] || 1;
    
    if (!target) {
        ns.tprint("ERROR: No target specified");
        return;
    }

    const minSecurity = ns.getServerMinSecurityLevel(target);
    
    do {
        const currentSecurity = ns.getServerSecurityLevel(target);
        if (currentSecurity > minSecurity + 1) {
            await ns.weaken(target, { threads: threads });
        }
        await ns.sleep(1000);
    } while (shouldLoop);
} 