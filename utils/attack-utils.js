/** @param {NS} ns */
export function getRunningAttacks(ns, allServers) {
    const attacks = new Map(); // target -> {threads, servers}
    
    for (const server of allServers) {
        const processes = ns.ps(server);
        for (const process of processes) {
            if (process.filename === "grow.js" || process.filename === "weaken.js" || process.filename === "hack.js") {
                const target = process.args[0];
                if (!attacks.has(target)) {
                    attacks.set(target, { threads: 0, servers: new Set() });
                }
                const attack = attacks.get(target);
                attack.threads += process.threads;
                attack.servers.add(server);
            }
        }
    }
    
    return attacks;
}

/** @param {NS} ns */
export async function waitForAttacks(ns, allServers) {
    let lastStatus = "";
    while (true) {
        const attacks = getRunningAttacks(ns, allServers);
        if (attacks.size === 0) break;
        
        // Only print if status changed
        const currentStatus = Array.from(attacks.entries())
            .map(([target, info]) => `- ${target}: ${info.threads} threads on ${info.servers.size} servers`)
            .join('\n');
        
        if (currentStatus !== lastStatus) {
            ns.tprint("\nWaiting for attacks to complete:");
            ns.tprint(currentStatus);
            lastStatus = currentStatus;
        }
        
        await ns.sleep(1000);
    }
} 