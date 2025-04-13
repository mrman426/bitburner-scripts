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
    const targetServers = allServers.filter(server => {
        if (server === "home") return false;
        return ns.hasRootAccess(server);
    });
    
    // Analyze each server and calculate a score
    const serverScores = targetServers.map(server => {
        const maxMoney = ns.getServerMaxMoney(server);
        const minSecurity = ns.getServerMinSecurityLevel(server);

        // Calculate a score based on:
        // 1. Money available (higher is better)
        // 2. Security level (lower is better)
        const moneyScore = maxMoney / 1000000; // Normalize to millions
        const securityScore = 1 / minSecurity;
        
        // Final score calculation
        const score = moneyScore * securityScore;
        
        return {
            server,
            score,
            maxMoney,
            minSecurity,
        };
    }).filter(server => server !== null); // Remove null entries (like home server)
    
    // Sort servers by score in descending order
    serverScores.sort((a, b) => b.score - a.score);
    
    // Display top 5 servers
    ns.tprint("\nTop 25 Best Servers to Attack:");
    ns.tprint("========================================================");
    ns.tprint("Server\t\tScore\t\tMoney\t\tSecurity");
    ns.tprint("========================================================");
    
    // Find the longest server name
    const maxServerNameLength = Math.max(...serverScores.map(s => s.server.length));
    const maxScoreLength = Math.max(...serverScores.map(s => s.score.toFixed(2).length));
    const maxMoneyLength = Math.max(...serverScores.map(s => ns.formatNumber(s.maxMoney).length));
    const securityLength = Math.max(...serverScores.map(s => s.minSecurity.toFixed(2).length));
    
    for (let i = 0; i < Math.min(25, serverScores.length); i++) {
        const s = serverScores[i];
        const paddedServerName = s.server.padEnd(maxServerNameLength);
        const paddedScore = s.score.toFixed(2).padStart(maxScoreLength);
        const paddedMoney = ns.formatNumber(s.maxMoney).padStart(maxMoneyLength);
        const paddedSecurity = s.minSecurity.toFixed(2).padStart(securityLength);
        ns.tprint(`${paddedServerName}\t${paddedScore}\t\t$${paddedMoney}\t${paddedSecurity}`);
    }
    
    // If we have a best target, return it
    if (serverScores.length > 0) {
        return serverScores[0].server;
    }
    
    return null;
} 