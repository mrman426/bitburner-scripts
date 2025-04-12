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
    // Get all servers we can access
    const servers = ns.scan();
    const purchasedServers = ns.getPurchasedServers();
    const allServers = [...new Set([...servers, ...purchasedServers])];
    
    // Find the most profitable server
    let bestServer = null;
    let bestScore = 0;
    
    for (const server of allServers) {
        // Skip home and purchased servers
        if (server === "home" || purchasedServers.includes(server)) continue;
        
        // Get server info
        const maxMoney = ns.getServerMaxMoney(server);
        const minSecurity = ns.getServerMinSecurityLevel(server);
        const hackLevel = ns.getServerRequiredHackingLevel(server);
        const playerHackLevel = ns.getHackingLevel();
        
        // Skip if we can't hack it
        if (hackLevel > playerHackLevel) continue;
        
        // Calculate score based on money and security
        const score = maxMoney / minSecurity;
        
        if (score > bestScore) {
            bestScore = score;
            bestServer = server;
        }
    }
    
    if (!bestServer) {
        ns.print("No suitable server found to attack");
        return;
    }
    
    ns.print(`Found best target: ${bestServer}`);
    ns.print(`Max Money: ${ns.formatNumber(ns.getServerMaxMoney(bestServer))}`);
    ns.print(`Min Security: ${ns.getServerMinSecurityLevel(bestServer)}`);
    
    // Calculate optimal number of attack scripts
    const maxMoney = ns.getServerMaxMoney(bestServer);
    const hackAmount = maxMoney * 0.5; // We want to hack 50% each time
    const hackChance = ns.hackAnalyzeChance(bestServer);
    const hackThreads = Math.ceil(hackAmount / (ns.hackAnalyze(bestServer) * maxMoney));
    
    ns.print(`Hack Amount: ${ns.formatNumber(hackAmount)}`);
    ns.print(`Hack Chance: ${(hackChance * 100).toFixed(2)}%`);
    ns.print(`Required Threads: ${hackThreads}`);
    
    // Deploy attack scripts to all available servers
    const scriptRam = ns.getScriptRam("attack.js");
    let totalThreads = 0;
    
    // Function to deploy to a server
    async function deployToServer(server) {
        const maxRam = ns.getServerMaxRam(server);
        const usedRam = ns.getServerUsedRam(server);
        const availableRam = maxRam - usedRam;
        const threads = Math.floor(availableRam / scriptRam);
        
        if (threads > 0) {
            // Copy script if needed
            if (!ns.fileExists("attack.js", server)) {
                await ns.scp("attack.js", server);
            }
            
            // Kill any existing scripts
            ns.killall(server);
            
            // Run the attack script
            ns.exec("attack.js", server, threads, bestServer);
            totalThreads += threads;
            
            ns.print(`Deployed ${threads} threads to ${server}`);
        }
    }
    
    // Deploy to home server
    await deployToServer("home");
    
    // Deploy to purchased servers
    for (const server of purchasedServers) {
        await deployToServer(server);
    }
    
    ns.print(`Total deployed threads: ${totalThreads}`);
    
    if (totalThreads < hackThreads) {
        ns.print(`WARNING: Not enough threads (${totalThreads}/${hackThreads}) to efficiently hack ${bestServer}`);
    }
} 