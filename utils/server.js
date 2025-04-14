/** @param {NS} ns */
export function getAllServers(ns) {
    const servers = new Set();
    const toScan = ["home"];
    
    while (toScan.length > 0) {
        const server = toScan.pop();
        if (servers.has(server)) continue;
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
export function getDeployableServers(ns, targetServer, useAllServers = false, usePurchasedOnly = false) {
    const allServers = getAllServers(ns);
    
    return allServers.filter(server => {
        // Skip servers with no RAM
        if (ns.getServerMaxRam(server) === 0) return false;

        // Skip servers that do not have root access
        if (!ns.hasRootAccess(server)) return false;

        // Skip target server
        if (server === targetServer) return false;
        
        // Skip home server
        if (server === "home") return true;
        
        // If using purchased servers only, only include servers that start with "pserv-"
        if (usePurchasedOnly && !server.startsWith("pserv-")) return false;
        
        // If using all servers, include everything that passes above checks
        if (useAllServers) return true;
        
        // Default to purchased servers only (servers that start with "pserv-")
        return server.startsWith("pserv-");
    });
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
export async function hackServer(ns, server) {
    if (server === "home") return false;
    if (ns.hasRootAccess(server)) return true;

    const requiredPorts = ns.getServerNumPortsRequired(server);
    const portsOpened = openPorts(ns, server);

    if (portsOpened >= requiredPorts) {
        ns.nuke(server);
        ns.tprint(`Gained root access on ${server}`);
        return true;
    } else {
        //ns.tprint(`Failed to gain root access on ${server}`);
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

/**
 * Calculate a score for servers based on various metrics to determine its hack value
 * @param {NS} ns - Netscript API
 * @returns {object} Score values for the servers
 */
export function getServerScores(ns, targetServers) {
    // Analyze each server and calculate a score
    return targetServers
        .filter(server => {
            // Skip servers with no RAM
            if (ns.getServerMaxRam(server) === 0) return false;

            // Skip servers that do not have root access
            if (!ns.hasRootAccess(server)) return false;

            // Skip purchased and home servers
            if (server.startsWith('pserv-') || server === "home") return false;

            return true;
        })
        .map(server => {
            const maxMoney = ns.getServerMaxMoney(server);
            const minSecurity = ns.getServerMinSecurityLevel(server);
            const timeToAttack = Math.max(ns.getGrowTime(server), ns.getWeakenTime(server)) + ns.getHackTime(server);

            // Calculate required threads
            const threads = calculateAttackThreads(ns, server, 0.25);
            const totalThreads = threads.weaken + threads.grow + threads.growWeaken + threads.hack;

            // Calculate a score based on:
            // 1. Money available (higher is better)
            // 2. Security level (lower is better)
            // 3. Time to hack (lower is better)
            const moneyScore = maxMoney / 1000000; // Normalize to millions
            const securityScore = 1 / minSecurity;
            const timeMultiplier = Math.pow(0.95, timeToAttack / 1000); // Exponential decay based on time
            
            // Final score calculation
            const score = moneyScore * securityScore * timeMultiplier;
            
            return {
                server,
                score,
                maxMoney,
                minSecurity,
                timeToAttack,
                threads,
            };
        });
}

/**
 * NOT USED, DO WE WANT ANY OF THE LOGIC FROM HERE?
 * Calculate a score for a server based on various metrics to determine its hack value
 * @param {NS} ns - Netscript API
 * @param {string} server - Server to score
 * @param {Object} scriptRams - Object containing RAM costs for different scripts
 * @returns {number} Score value for the server
 */
export function getServerScore(ns, server, scriptRams) {
    const maxMoney = ns.getServerMaxMoney(server);
    const minSecurity = ns.getServerMinSecurityLevel(server);
    const currentSecurity = ns.getServerSecurityLevel(server);
    const totalTime = Math.max(ns.getGrowTime(server), ns.getWeakenTime(server)) + ns.getHackTime(server);
    
    // Heavily penalize longer hack times
    const timeMultiplier = Math.pow(0.95, totalTime / 1000); // Exponential decay based on time
    
    // More weight on security level difference
    const securityPenalty = Math.pow(currentSecurity / minSecurity, 2);
    
    const moneyPerSecond = (maxMoney * ns.hackAnalyze(server)) / (totalTime / 1000);
    const baseScore = (moneyPerSecond / securityPenalty) * timeMultiplier;

    // Calculate required threads
    const requiredThreads = {
        weaken: calculateRequiredThreads(ns, server, 'weaken'),
        grow: calculateRequiredThreads(ns, server, 'grow'),
        hack: calculateRequiredThreads(ns, server, 'hack')
    };
    const totalRequiredThreads = requiredThreads.weaken + requiredThreads.grow + requiredThreads.hack;

    // Get deployable servers and calculate total available RAM
    const deployableServers = getDeployableServers(ns, server, true, false);
    const totalAvailableRam = deployableServers.reduce((sum, s) => sum + getAvailableRam(ns, s), 0);
    
    // Calculate average RAM needed per thread (considering all script types)
    const avgRamPerThread = (scriptRams.weaken + scriptRams.grow + scriptRams.hack) / 3;
    const maxPossibleThreads = Math.floor(totalAvailableRam / avgRamPerThread);

    // Apply a scaling factor based on thread availability
    const threadAvailabilityRatio = maxPossibleThreads / Math.max(1, totalRequiredThreads);
    const threadScalingFactor = Math.min(1, threadAvailabilityRatio);

    return baseScore * threadScalingFactor;
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
export function calculateAttackThreads(ns, target, hackFraction) {
    const percentStolenPerThread = ns.hackAnalyze(target); // percent of money stolen with a single thread
    const h = Math.floor(hackFraction / percentStolenPerThread); // threads to hack the amount we want, floor so that we don't over-hack
    const hackedFraction = h * percentStolenPerThread; // < ~0.8 - the percent we actually hacked
    const remainingPercent = Math.max(0.0001, 1 - hackedFraction); // Ensure remainingPercent is never <= 0
    const growthRequired = 1 / remainingPercent; // Calculate growth required safely
    const growThreadsRequired = ns.growthAnalyze(target, growthRequired); // how many threads to grow the money by ~5x
    const correctionThreads = Math.ceil(Math.max(1, hackedFraction * 0.75)); // some threads in case there is a misfire, the more hackedFraction the more threads
    const changePerWeakenThread = 0.002;
    const changePerGrowThread = 0.004;
    const changePerHackThread = 0.002;

    const g = Math.ceil(growThreadsRequired * correctionThreads); // threads to grow the amount we want, ceil so that we don't under-grow
    const w = Math.ceil(h * (changePerHackThread / changePerWeakenThread)); // weaken threads for hack, ceil so that we don't under-weaken
    const gw = Math.ceil(g * (changePerGrowThread / changePerWeakenThread)); // weaken threads for grow, ceil so that we don't under-weaken

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
    const currentMoney = ns.getServerMoneyAvailable(target);
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

        case 'growWeaken':
            return 0;
            // if (currentSecurity <= minSecurity + 1) return 0;
            // const securityDiff = currentSecurity - minSecurity;
            // const weakenThreads = securityDiff / 0.05; // Each weaken reduces security by 0.05
            // return Math.ceil(weakenThreads);
        
    
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
            if (process.filename === "attack.js" || process.filename === "grow.js" || process.filename === "weaken.js" || process.filename === "hack.js") {
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