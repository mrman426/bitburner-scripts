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

    // Function to get available RAM on a server
    function getAvailableRam(server) {
        const maxRam = ns.getServerMaxRam(server);
        const usedRam = ns.ps(server).reduce((sum, process) => sum + process.threads * ns.getScriptRam(process.filename), 0);
        return maxRam - usedRam;
    }

    // Function to deploy to a server
    async function deployToServer(server, target) {
        // Skip if we don't have root access
        if (!ns.hasRootAccess(server)) {
            return 0;
        }

        const availableRam = getAvailableRam(server);
        const scriptRam = ns.getScriptRam("attack.js");
        const threads = Math.floor(availableRam / scriptRam);
        
        if (threads > 0) {
            // Copy script if needed
            if (!ns.fileExists("attack.js", server)) {
                await ns.scp("attack.js", server);
            }
            
            // Only kill existing attack scripts
            const processes = ns.ps(server);
            for (const process of processes) {
                if (process.filename === "attack.js") {
                    ns.kill(process.pid);
                }
            }
            
            // Run the attack script
            ns.exec("attack.js", server, threads, target);
            return threads;
        }
        return 0;
    }

    // Main attack loop
    while (true) {
        let targetServer = ns.args[0];
        
        // If no target specified, find the best one
        if (!targetServer) {
            // Get all servers and filter out those we can't hack
            const allServers = getAllServers();
            const hackableServers = allServers.filter(server => {
                if (server === "home") return false;
                if (!ns.hasRootAccess(server)) return false;
                const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
                return requiredHackingLevel <= ns.getHackingLevel();
            });

            // Find the most profitable server
            let bestScore = 0;
            
            for (const server of hackableServers) {
                const maxMoney = ns.getServerMaxMoney(server);
                const minSecurity = ns.getServerMinSecurityLevel(server);
                const score = maxMoney / minSecurity;
                
                if (score > bestScore) {
                    bestScore = score;
                    targetServer = server;
                }
            }
        }

        // Validate the target server
        if (!targetServer) {
            ns.print("No target server specified and no suitable servers found");
            break;
        }

        if (!ns.hasRootAccess(targetServer)) {
            ns.print(`ERROR: No root access on target server ${targetServer}`);
            break;
        }

        if (ns.getServerRequiredHackingLevel(targetServer) > ns.getHackingLevel()) {
            ns.print(`ERROR: Hacking level too low for target server ${targetServer}`);
            break;
        }
        
        ns.print(`\nTargeting server: ${targetServer}`);
        ns.print(`Max Money: ${ns.formatNumber(ns.getServerMaxMoney(targetServer))}`);
        ns.print(`Min Security: ${ns.getServerMinSecurityLevel(targetServer)}`);
        
        // Calculate required threads
        const maxMoney = ns.getServerMaxMoney(targetServer);
        const hackAmount = maxMoney * 0.5;
        const hackThreads = Math.ceil(hackAmount / (ns.hackAnalyze(targetServer) * maxMoney));
        
        ns.print(`Required Threads: ${hackThreads}`);
        
        // Deploy to all available servers
        let totalThreads = 0;
        
        // Get all servers we can use
        const allServers = getAllServers();
        const deployableServers = allServers.filter(server => {
            // Skip the target server
            if (server === targetServer) return false;
            // Skip servers with no RAM
            if (ns.getServerMaxRam(server) === 0) return false;
            return true;
        });

        ns.print(`\nDeploying to ${deployableServers.length} servers:`);
        
        // Deploy to each server
        for (const server of deployableServers) {
            const threads = await deployToServer(server, targetServer);
            if (threads > 0) {
                ns.print(`- ${server}: ${threads} threads`);
                totalThreads += threads;
            }
        }
        
        ns.print(`\nTotal deployed threads: ${totalThreads}`);
        
        if (totalThreads < hackThreads) {
            ns.print(`WARNING: Not enough threads (${totalThreads}/${hackThreads}) to efficiently hack ${targetServer}`);
        }
        
        // Wait for the attack to complete (roughly)
        await ns.sleep(10000);
        
        // Check if we have any RAM left to attack more servers
        const totalAvailableRam = deployableServers.reduce((sum, server) => sum + getAvailableRam(server), 0);
        
        if (totalAvailableRam < ns.getScriptRam("attack.js")) {
            ns.print("No more RAM available for attacks");
            break;
        }

        // If target was specified as argument, only attack that one server
        if (ns.args[0]) {
            break;
        }
    }
} 