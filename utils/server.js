/**
 * Gets all servers in the network
 * @param {NS} ns
 * @returns {string[]} Array of server names
 */
export function getAllServers(ns) {
    const servers = new Set();
    const toScan = ["home"];
    
    while (toScan.length > 0) {
        const server = toScan.pop();

        if (servers.has(server)) {
            continue;
        }

        servers.add(server);
        
        const connected = ns.scan(server);

        for (const s of connected) {
            if (!servers.has(s)) {
                toScan.push(s);
            }
        }
    }
    
    return Array.from(servers);
}

/**
 * Get a list of all servers that can be deployed to
 * @param {NS} ns
 * @param {string[]} allServers
 * @param {boolean} useHome
 * @param {boolean} usePurchasedServersOnly
 * @param {boolean} useHackedServersOnly
 * @returns {string[]} Array of server names
 */
export function getDeployServers(ns, allServers, useHome = true, usePurchasedServersOnly = false, useHackedServersOnly = false) {
    return allServers
        .filter(server => {
            if (server === "home") return useHome;
            if (usePurchasedServersOnly && !server.startsWith("pserv-")) return false;
            if (useHackedServersOnly && server.startsWith("pserv-")) return false;

            return ns.hasRootAccess(server);
        })
        .sort((a, b) => {
            const ramA = getServerAvailableRam(ns, a);
            const ramB = getServerAvailableRam(ns, b);
            return ramB - ramA;
        });
}

/**
 * Get a list of all servers that can be attacked
 * @param {NS} ns
 * @param {string[]} allServers
 * @param {boolean} useHome
 * @param {boolean} usePurchasedServersOnly
 * @param {boolean} useHackedServersOnly
 * @returns {string[]} Array of server names
 */
export function getTargetServers(ns, allServers) {
    return allServers
        .filter(server => {
            if (ns.getServerMaxRam(server) === 0) return false;
            if (!ns.hasRootAccess(server)) return false;
            if (server.startsWith('pserv-') || server === "home") return false;
            if (ns.getServerMaxMoney(server) <= 0) return false;
            return true;
        });
}

/**
 * Finds the path from home to the target server
 * @param {NS} ns
 * @param {string} targetServer
 * @returns {string[]} Array of server names in the path
 */
export function findPathToServer(ns, targetServer) {
    const path = [];
    let current = targetServer;
    
    while (current !== "home") {
        path.unshift(current);
        current = ns.scan(current)[0]; // Get the first connected server (parent)
    }
    path.unshift("home");
    
    return path;
}

/** @param {NS} ns */
export function getAvailableRam(ns, server) {
    const maxRam = ns.getServerMaxRam(server);
    const usedRam = ns.ps(server).reduce((sum, process) => sum + process.threads * ns.getScriptRam(process.filename), 0);
    const availableRam = maxRam - usedRam;
    
    // Reserve 32GB on home server
    if (server === "home") {
        return Math.max(0, availableRam - 32);
    }
    
    return availableRam;
}

/** @param {NS} ns */
export function openPorts(ns, server) {
    const programs = [
        { name: "BruteSSH.exe", func: ns.brutessh },
        { name: "FTPCrack.exe", func: ns.ftpcrack },
        { name: "relaySMTP.exe", func: ns.relaysmtp },
        { name: "HTTPWorm.exe", func: ns.httpworm },
        { name: "SQLInject.exe", func: ns.sqlinject }
    ];

    let portsOpened = 0;
    for (const program of programs) {
        if (ns.fileExists(program.name, "home")) {
            program.func(server);
            portsOpened++;
        }
    }
    return portsOpened;
}

/** @param {NS} ns */
export function hackServer(ns, server) {
    if (ns.hasRootAccess(server)) return false;
    if (ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()) return false;

    const requiredPorts = ns.getServerNumPortsRequired(server);
    const portsOpened = openPorts(ns, server);

    if (portsOpened >= requiredPorts) {
        ns.nuke(server);
        return true;
    } else {
        return false;
    }
}

/**
 * Checks if a server is currently hackable based on various conditions
 * @param {NS} ns - Netscript API
 * @param {string} server - Server to check
 * @param {string[]} allServers - List of all servers to check for running attacks
 * @returns {boolean} Whether the server is hackable
 */
export function isServerHackable(ns, server, allServers) {
    const hasRoot = ns.hasRootAccess(server);
    const reqHackLevel = ns.getServerRequiredHackingLevel(server);
    const myHackLevel = ns.getHackingLevel();
    const meetsHackLevel = reqHackLevel <= myHackLevel;
    const isPurchasedServer = server.startsWith("pserv-");
    const runningAttacks = getRunningAttacks(ns, allServers);
    const isBeingAttacked = runningAttacks.has(server);

    if (isBeingAttacked) {
        ns.tprint(`${server} is currently being attacked, skipping...`);
    }

    return server !== "home" 
        && !isPurchasedServer
        && hasRoot 
        && meetsHackLevel
        && !isBeingAttacked;
}

export function getServerMaxRam(ns, server) {
    if (server === "home") return ns.getServerMaxRam(server) - 16; // Reserve 16GB on home server

    return ns.getServerMaxRam(server);
}

export function getServerAvailableRam(ns, server) {
    return getServerMaxRam(ns, server) - ns.getServerUsedRam(server);
}

/**
 * Threads required for a full Hack Weaken Grow Weaken (HWGW) attack.
 *
 * @param {Server} targetServer
 * @param {number} hackFraction between 0 and 1
 * @return {Object}
 */
export function calculateAttackThreads(ns, target, hackFraction = 0.25) {
    const percentStolenPerThread = ns.hackAnalyze(target); // percent of money stolen with a single thread
    if (percentStolenPerThread <= 0) {
        return {hack: 0, weaken: 0, grow: 0, growWeaken: 0};
    }

    const h = Math.floor(hackFraction / percentStolenPerThread) || 0.0001; // threads to hack the amount we want, floor so that we don't over-hack
    const hackedFraction = h * percentStolenPerThread; // < ~0.8 - the percent we actually hacked
    const remainingPercent = Math.max(0.01, 1 - hackedFraction); // Ensure remainingPercent is never <= 0
    const growthRequired = 1 / remainingPercent; // Calculate growth required safely
    const growThreadsRequired = ns.growthAnalyze(target, growthRequired); // how many threads to grow the money by ~5x
    const correctionThreads = Math.ceil(Math.max(1, h * 0.5)); // some threads in case there is a misfire, the more hacked threads the more correction threads
    const changePerWeakenThread = 0.002;
    const changePerGrowThread = 0.004;
    const changePerHackThread = 0.002;

    const w = Math.ceil(h * (changePerHackThread / changePerWeakenThread)); // weaken threads for hack, ceil so that we don't under-weaken
    const g = Math.ceil(growThreadsRequired + correctionThreads); // threads to grow the amount we want, ceil so that we don't under-grow
    const gw = Math.ceil(g * (changePerGrowThread / changePerWeakenThread) + correctionThreads); // weaken threads for grow, ceil so that we don't under-weaken

    return {
        hack: h,
        weaken: w,
        grow: g,
        growWeaken: gw,
    };
}

/** @param {NS} ns */
export function calculateRequiredThreads(ns, target, operation) {
    const maxMoney = ns.getServerMaxMoney(target);
    const currentMoney = Math.max(1, ns.getServerMoneyAvailable(target));
    const currentSecurity = ns.getServerSecurityLevel(target);
    const minSecurity = ns.getServerMinSecurityLevel(target);

    switch (operation) {
        case 'hack':
            // Calculate optimal hack amount based on server's growth rate
            const growthRate = ns.getServerGrowth(target);
            const hackPercent = ns.hackAnalyze(target);
            
            // We want to hack enough that the server can grow back within a reasonable time
            // Aim to hack 25% of max money, but adjust based on growth rate
            const optimalHackPercent = Math.min(0.25, 0.1 + (growthRate / 100));
            const hackAmount = maxMoney * optimalHackPercent;
            
            // Calculate threads needed for this hack amount
            return Math.ceil(hackAmount / (hackPercent * maxMoney));
        
        case 'grow':
            if (currentMoney >= maxMoney * 0.9) return 0;
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
export function getRunningPrograms(ns, allServers, types = ["attack.js", "grow.js", "weaken.js", "hack.js"]) {
    const attacks = new Map(); // target -> {threads, servers}
    
    for (const server of allServers) {
        const processes = ns.ps(server);
        for (const process of processes) {
            if (types.includes(process.filename)) {
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
