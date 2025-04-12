/** @param {NS} ns */
export function calculateRequiredThreads(ns, target, operation) {
    const maxMoney = ns.getServerMaxMoney(target);
    const currentMoney = ns.getServerMoneyAvailable(target);
    const currentSecurity = ns.getServerSecurityLevel(target);
    const minSecurity = ns.getServerMinSecurityLevel(target);
    
    switch (operation) {
        case 'hack':
            const hackAmount = maxMoney * 0.5; // We want to hack 50% of max money
            const hackPercent = ns.hackAnalyze(target);
            return Math.ceil(hackAmount / (hackPercent * maxMoney));
        
        case 'grow':
            if (currentMoney >= maxMoney * 0.5) return 0;
            const growthNeeded = maxMoney / currentMoney;
            const growThreads = ns.growthAnalyze(target, growthNeeded);
            return Math.ceil(growThreads);
        
        case 'weaken':
            if (currentSecurity <= minSecurity + 1) return 0;
            const securityDiff = currentSecurity - minSecurity;
            const weakenThreads = securityDiff / 0.05; // Each weaken reduces security by 0.05
            return Math.ceil(weakenThreads);
        
        default:
            return 0;
    }
}

/** @param {NS} ns */
export function getRunningAttacks(ns, allServers) {
    const attacks = new Map(); // target -> {threads, servers}
    
    for (const server of allServers) {
        const processes = ns.ps(server);
        for (const process of processes) {
            if (process.filename === "attack.js") {
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