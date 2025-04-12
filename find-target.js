/** @param {NS} ns */
export async function main(ns) {
    // Function to get all servers
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

    // Get all servers
    const allServers = getAllServers();
    const playerHackingLevel = ns.getHackingLevel();
    
    // Analyze each server and calculate a score
    const serverScores = allServers.map(server => {
        // Skip home server
        if (server === "home") return null;
        
        const maxMoney = ns.getServerMaxMoney(server);
        const minSecurity = ns.getServerMinSecurityLevel(server);
        const requiredHackingLevel = ns.getServerRequiredHackingLevel(server);
        const hasRootAccess = ns.hasRootAccess(server);
        
        // Calculate a score based on:
        // 1. Money available (higher is better)
        // 2. Security level (lower is better)
        // 3. Hacking level requirement (lower is better)
        // 4. Root access (bonus if we have it)
        const moneyScore = maxMoney / 1000000; // Normalize to millions
        const securityScore = 1 / minSecurity;
        const hackingScore = playerHackingLevel / requiredHackingLevel;
        const rootBonus = hasRootAccess ? 1.5 : 1;
        
        // Final score calculation
        const score = moneyScore * securityScore * hackingScore * rootBonus;
        
        return {
            server,
            score,
            maxMoney,
            minSecurity,
            requiredHackingLevel,
            hasRootAccess
        };
    }).filter(server => server !== null); // Remove null entries (like home server)
    
    // Sort servers by score in descending order
    serverScores.sort((a, b) => b.score - a.score);
    
    // Display top 5 servers
    ns.tprint("\nTop 5 Best Servers to Attack:");
    ns.tprint("==========================================");
    ns.tprint("Server\t\tScore\t\tMoney\t\tSecurity\tHacking Level\tRoot Access");
    ns.tprint("==========================================");
    
    for (let i = 0; i < Math.min(5, serverScores.length); i++) {
        const s = serverScores[i];
        ns.tprint(`${s.server}\t\t${s.score.toFixed(2)}\t\t$${ns.formatNumber(s.maxMoney)}\t${s.minSecurity.toFixed(2)}\t\t${s.requiredHackingLevel}\t\t${s.hasRootAccess ? "Yes" : "No"}`);
    }
    
    // If we have a best target, return it
    if (serverScores.length > 0) {
        return serverScores[0].server;
    }
    
    return null;
} 