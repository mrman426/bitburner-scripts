/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, flags) {
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
        const usedRam = ns.getServerUsedRam(server);
        return maxRam - usedRam;
    }

    // Function to deploy to a server
    async function deployToServer(server, target) {
        const availableRam = getAvailableRam(server);
        const scriptRam = ns.getScriptRam("attack.js");
        const threads = Math.floor(availableRam / scriptRam);
        
        if (threads > 0) {
            // Copy script if needed
            if (!ns.fileExists("attack.js", server)) {
                await ns.scp("attack.js", server);
            }
            
            // Kill any existing scripts
            ns.killall(server);
            
            // Run the attack script
            ns.exec("attack.js", server, threads, target);
            return threads;
        }
        return 0;
    }

    // Main attack loop
    while (true) {
        // Get all servers and filter out those we can't hack
        const allServers = getAllServers();
        const hackableServers = allServers.filter(server => {
            if (server === "home") return false;
            if (!ns.hasRootAccess(server)) return false;
            const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
            return requiredHackingLevel <= ns.getHackingLevel();
        });

        // Find the most profitable server
        let bestServer = null;
        let bestScore = 0;
        
        for (const server of hackableServers) {
            const maxMoney = ns.getServerMaxMoney(server);
            const minSecurity = ns.getServerMinSecurityLevel(server);
            const score = maxMoney / minSecurity;
            
            if (score > bestScore) {
                bestScore = score;
                bestServer = server;
            }
        }
        
        if (!bestServer) {
            ns.print("No more servers to attack");
            break;
        }
        
        ns.print(`\nFound best target: ${bestServer}`);
        ns.print(`Max Money: ${ns.formatNumber(ns.getServerMaxMoney(bestServer))}`);
        ns.print(`Min Security: ${ns.getServerMinSecurityLevel(bestServer)}`);
        
        // Calculate required threads
        const maxMoney = ns.getServerMaxMoney(bestServer);
        const hackAmount = maxMoney * 0.5;
        const hackThreads = Math.ceil(hackAmount / (ns.hackAnalyze(bestServer) * maxMoney));
        
        ns.print(`Required Threads: ${hackThreads}`);
        
        // Deploy to all available servers
        let totalThreads = 0;
        
        // Deploy to home server
        totalThreads += await deployToServer("home", bestServer);
        
        // Deploy to purchased servers
        const purchasedServers = ns.getPurchasedServers();
        for (const server of purchasedServers) {
            totalThreads += await deployToServer(server, bestServer);
        }
        
        ns.print(`Total deployed threads: ${totalThreads}`);
        
        if (totalThreads < hackThreads) {
            ns.print(`WARNING: Not enough threads (${totalThreads}/${hackThreads}) to efficiently hack ${bestServer}`);
        }
        
        // Wait for the attack to complete (roughly)
        await ns.sleep(10000);
        
        // Check if we have any RAM left to attack more servers
        const homeRam = getAvailableRam("home");
        const purchasedRam = purchasedServers.reduce((sum, server) => sum + getAvailableRam(server), 0);
        const totalAvailableRam = homeRam + purchasedRam;
        
        if (totalAvailableRam < ns.getScriptRam("attack.js")) {
            ns.print("No more RAM available for attacks");
            break;
        }
    }
} 