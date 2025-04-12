/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
	return data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
    // Function to get all servers recursively
    function getAllServers() {
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

    // Get all servers at the start
    const allServers = getAllServers();

    // Track attacked servers and their cooldown times
    const attackedServers = new Map(); // server -> last attack time

    // Function to check if a server is ready to be attacked again
    function isServerReady(server) {
        if (!attackedServers.has(server)) return true;
        
        const lastAttackTime = attackedServers.get(server);
        const hackTime = ns.getHackTime(server);
        const cooldownTime = hackTime * 2; // Wait at least 2 hack cycles
        
        return Date.now() - lastAttackTime > cooldownTime;
    }

    // Function to mark a server as attacked
    function markServerAttacked(server) {
        attackedServers.set(server, Date.now());
    }

    // Function to get available RAM on a server
    function getAvailableRam(server) {
        const maxRam = ns.getServerMaxRam(server);
        const usedRam = ns.ps(server).reduce((sum, process) => sum + process.threads * ns.getScriptRam(process.filename), 0);
        const availableRam = maxRam - usedRam;
        
        // Reserve 16GB on home server
        if (server === "home") {
            return Math.max(0, availableRam - 16);
        }
        
        return availableRam;
    }

    // Function to open ports on a server
    async function openPorts(server) {
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

    // Function to hack and nuke a server
    async function hackServer(server) {
        if (server === "home") return false;
        if (ns.hasRootAccess(server)) return true;

        const requiredPorts = ns.getServerNumPortsRequired(server);
        const portsOpened = await openPorts(server);

        if (portsOpened >= requiredPorts) {
            ns.nuke(server);
            ns.tprint(`Gained root access on ${server}`);
            return true;
        } else {
            ns.tprint(`Could not gain root access on ${server} (need ${requiredPorts} ports, opened ${portsOpened})`);
            return false;
        }
    }

    // Function to get running attacks
    function getRunningAttacks() {
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

    // Function to wait for attacks to complete
    async function waitForAttacks() {
        let lastStatus = "";
        while (true) {
            const attacks = getRunningAttacks();
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

    // Function to deploy to a server
    async function deployToServer(server, target, threads) {
        // Skip if we don't have root access
        if (!ns.hasRootAccess(server)) {
            return 0;
        }

        const availableRam = getAvailableRam(server);
        const scriptRam = ns.getScriptRam("attack.js");
        const maxThreads = Math.floor(availableRam / scriptRam);
        const actualThreads = Math.min(threads, maxThreads);
        
        if (actualThreads > 0) {
            // Copy script if needed
            if (!ns.fileExists("attack.js", server)) {
                await ns.scp("attack.js", server);
            }
            
            // Run the attack script without looping
            const pid = ns.exec("attack.js", server, actualThreads, target, false);
            if (pid === 0) {
                ns.tprint(`WARNING: Failed to start attack on ${server}`);
                return 0;
            }
            return actualThreads;
        }
        return 0;
    }

    // Main attack loop
    while (true) {
        // Only try to hack servers every 5 minutes
        if (!attackedServers.size || Date.now() - Math.min(...attackedServers.values()) > 300000) {
            ns.tprint("\nScanning and attempting to hack new servers...");
            
            // Batch server hacking to reduce lag
            const batchSize = 5;
            for (let i = 0; i < allServers.length; i += batchSize) {
                const batch = allServers.slice(i, i + batchSize);
                await Promise.all(batch.map(server => hackServer(server)));
                await ns.sleep(1000); // Small delay between batches
            }
        }

        // Get all servers we can use for deployment
        const deployableServers = allServers.filter(server => {
            // Skip servers with no RAM
            if (ns.getServerMaxRam(server) === 0) return false;
            return true;
        });

        // Check if we have any RAM left to attack more servers
        const totalAvailableRam = deployableServers.reduce((sum, server) => sum + getAvailableRam(server), 0);
        const scriptRam = ns.getScriptRam("attack.js");
        
        if (totalAvailableRam < scriptRam) {
            ns.tprint("No more RAM available for attacks");
            break;
        }

        let targetServer = ns.args[0];
        
        // If no target specified, find the best one
        if (!targetServer) {
            // Get all servers and filter out those we can't hack
            const hackableServers = allServers.filter(server => {
                if (server === "home") return false;
                if (!ns.hasRootAccess(server)) return false;
                if (!isServerReady(server)) return false;
                const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
                return requiredHackingLevel <= ns.getHackingLevel();
            });

            // Find the most profitable server
            let bestScore = 0;
            
            for (const server of hackableServers) {
                const maxMoney = ns.getServerMaxMoney(server);
                const minSecurity = ns.getServerMinSecurityLevel(server);
                const currentSecurity = ns.getServerSecurityLevel(server);
                const hackTime = ns.getHackTime(server);
                const hackPercent = ns.hackAnalyze(server);
                const hackAmount = maxMoney * hackPercent;
                
                // Calculate money per second
                const moneyPerSecond = hackAmount / (hackTime / 1000); // Convert ms to seconds
                
                // Calculate score based on money per second and security
                // Higher security means longer hack times, so we penalize it
                const securityPenalty = Math.max(1, currentSecurity / minSecurity);
                const score = moneyPerSecond / securityPenalty;
                
                if (score > bestScore) {
                    bestScore = score;
                    targetServer = server;
                }
            }
            
            if (targetServer) {
                const maxMoney = ns.getServerMaxMoney(targetServer);
                const hackPercent = ns.hackAnalyze(targetServer);
                const hackAmount = maxMoney * hackPercent;
                const hackTime = ns.getHackTime(targetServer) / 1000; // Convert to seconds
                
                ns.tprint(`\nBest target: ${targetServer}`);
                ns.tprint(`Max Money: ${ns.formatNumber(ns.getServerMaxMoney(targetServer))}`);
                ns.tprint(`Hack Amount: ${ns.formatNumber(hackAmount)} (${(hackPercent * 100).toFixed(2)}%)`);
                ns.tprint(`Hack Time: ${hackTime.toFixed(1)}s`);
                ns.tprint(`Money/Second: ${ns.formatNumber(hackAmount / hackTime)}`);
            }
        }

        // Validate the target server
        if (!targetServer) {
            ns.tprint("No target server specified and no suitable servers found");
            await ns.sleep(5000); // Longer delay when no targets available
            continue;
        }

        if (!ns.hasRootAccess(targetServer)) {
            ns.tprint(`ERROR: No root access on target server ${targetServer}`);
            await ns.sleep(5000);
            continue;
        }

        if (ns.getServerRequiredHackingLevel(targetServer) > ns.getHackingLevel()) {
            ns.tprint(`ERROR: Hacking level too low for target server ${targetServer}`);
            await ns.sleep(5000);
            continue;
        }

        if (!isServerReady(targetServer)) {
            ns.tprint(`Server ${targetServer} is on cooldown, trying another target`);
            await ns.sleep(5000);
            continue;
        }
        
        ns.tprint(`\nTargeting server: ${targetServer}`);
        ns.tprint(`Max Money: ${ns.formatNumber(ns.getServerMaxMoney(targetServer))}`);
        ns.tprint(`Min Security: ${ns.getServerMinSecurityLevel(targetServer)}`);
        
        // Calculate required threads for 50% money hack
        const maxMoney = ns.getServerMaxMoney(targetServer);
        const hackAmount = maxMoney * 0.5;
        const hackPercent = ns.hackAnalyze(targetServer);
        const hackThreads = Math.ceil(hackAmount / (hackPercent * maxMoney));
        
        ns.tprint(`Required Threads: ${hackThreads} (${(hackPercent * 100).toFixed(2)}% per thread)`);
        
        // Deploy to all available servers
        let totalThreads = 0;
        let remainingThreads = hackThreads;
        
        // Get servers we can use for this attack (excluding target)
        const attackServers = deployableServers.filter(server => server !== targetServer);

        ns.tprint(`\nDeploying to ${attackServers.length} servers:`);
        
        // Deploy to each server
        for (const server of attackServers) {
            if (remainingThreads <= 0) break;

            const threads = Math.min(remainingThreads, Math.floor(getAvailableRam(server) / scriptRam));
            if (threads > 0) {
                const deployedThreads = await deployToServer(server, targetServer, threads);
                if (deployedThreads > 0) {
                    ns.tprint(`- ${server}: ${deployedThreads} threads (${ns.formatRam(deployedThreads * scriptRam)} used)`);
                    totalThreads += deployedThreads;
                    remainingThreads -= deployedThreads;
                }
            }
        }
        
        ns.tprint(`\nTotal deployed threads: ${totalThreads}/${hackThreads}`);
        
        if (totalThreads < hackThreads) {
            ns.tprint(`WARNING: Not enough threads (${totalThreads}/${hackThreads}) to efficiently hack ${targetServer}`);
        }

        // Mark the server as attacked
        markServerAttacked(targetServer);

        // If target was specified as argument, only attack that one server
        if (ns.args[0]) {
            break;
        }

        // Longer delay between targets to reduce lag
        await ns.sleep(10000); // 10 second delay
    }
} 